// Студия Писателя v.1.0 - Единый файл приложения
// Все зависимости удалены, приложение работает автономно

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Book, Users, Globe, Clock, PenTool, Settings, Sparkles, X, Trash2, Edit2, Search } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import ReactDOM from "react-dom/client";

// === Утилиты ===
const cn = (...inputs) => twMerge(clsx(inputs));
const generateId = () => Math.random().toString(36).substr(2, 9);
const getTodayKey = () => new Date().toISOString().split('T')[0];
const getWordCount = (text) => text.trim() ? text.trim().split(/\s+/).length : 0;

const calculateNorm = (project) => {
  if (!project.deadline) return 0;
  const totalWritten = project.wordLogs.reduce((acc, l) => acc + l.count, 0);
  const remaining = Math.max(0, project.totalGoal - totalWritten);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(project.deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays <= 0 ? remaining : Math.ceil(remaining / diffDays);
};

// === Константы ===
const STORAGE_KEYS = {
  APP_STATE: "writers_studio_app_state",
  ACTIVE_PROJECT: "writers_studio_app_state_active_project",
  ACTIVE_TAB: "writers_studio_app_state_active_tab"
};

const CATEGORIES = {
  characters: {
    roles: ["Протагонист", "Антагонист", "Второстепенный", "Эпизодический"],
    statuses: ["Жив", "Мёртв", "В разработке"]
  },
  worldbuilding: {
    categories: ["magic", "technology", "location", "culture", "races", "other"],
    labels: { magic: "Магия", technology: "Технологии", location: "Локация", culture: "Культура", races: "Расы", other: "Другое" }
  }
};

const INITIAL_PROJECT = {
  id: "",
  title: "",
  description: "",
  totalGoal: 80000,
  deadline: "",
  wordLogs: [],
  characters: [],
  worldbuilding: [],
  timelines: [{ id: generateId(), name: "Основная линия", events: [] }],
  activeTimelineId: "",
  createdAt: "",
  updatedAt: ""
};

const INITIAL_APP_STATE = {
  projects: [],
  activeProjectId: null,
  activeTab: "dashboard"
};

// === IndexedDB ===
const DB_NAME = "WritersStudioDB";
const DB_STORE = "appState";
const DB_VERSION = 1;

const openDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onerror = () => reject(request.error);
  request.onsuccess = () => resolve(request.result);
  request.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(DB_STORE)) {
      db.createObjectStore(DB_STORE, { keyPath: "id" });
    }
  };
});

const saveState = async (state) => {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    store.put({ id: "state", data: state });
  } catch (e) {
    console.warn("IndexedDB unavailable, using localStorage");
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(state));
  }
};

const loadState = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const store = tx.objectStore(DB_STORE);
      const request = store.get("state");
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn("IndexedDB unavailable, using localStorage");
    const saved = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    return saved ? JSON.parse(saved) : null;
  }
};

// === UI Компоненты ===

const Modal = ({ isOpen, onClose, title, children, size = "lg", showCloseButton = true }) => {
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cn("bg-[#f5f1e8] w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", sizes[size])}
          >
            {(title || showCloseButton) && (
              <div className="p-6 border-b border-[#704214]/10 flex justify-between items-center shrink-0">
                {title && <h3 className="text-2xl font-serif text-[#704214]">{title}</h3>}
                {showCloseButton && (
                  <button onClick={onClose} className="p-2 hover:bg-[#704214]/5 rounded-full transition-colors ml-auto">
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
            <div className="overflow-y-auto custom-scrollbar flex-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const ProgressBar = ({ current, target, label, showPercentage = true, className }) => {
  const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className={cn("space-y-1", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
          {label && <span className="opacity-30 text-[#704214]">{label}</span>}
          {showPercentage && <span className="text-[#c4a574] opacity-100">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="h-1.5 bg-[#704214]/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className="h-full bg-[#c4a574]" />
      </div>
    </div>
  );
};

const Tabs = ({ tabs, activeTab, onChange, className }) => (
  <div className={cn("flex border-b border-[#704214]/5 overflow-x-auto custom-scrollbar shrink-0", className)}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={cn(
          "px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap",
          activeTab === tab.id ? "border-[#c4a574] text-[#c4a574]" : "border-transparent text-[#704214]/40 hover:text-[#704214]"
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

const ActionButton = ({ icon, onClick, variant = "default" }) => (
  <button
    onClick={onClick}
    className={cn(
      "p-2 rounded-lg transition-colors",
      variant === "danger" ? "text-red-500 hover:bg-red-50" : "text-[#704214] hover:bg-[#704214]/5"
    )}
  >
    {icon}
  </button>
);

const MarkdownEditor = ({ label, value, onChange, minHeight = "200px" }) => (
  <div className="space-y-2">
    {label && <label className="text-sm font-medium text-[#704214]">{label}</label>}
    <textarea
      className="w-full px-4 py-3 bg-[#faf7f0] rounded-xl outline-none focus:ring-2 focus:ring-[#c4a574]/20 resize-none text-sm leading-relaxed"
      style={{ minHeight }}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Введите текст..."
    />
  </div>
);

// === Хуки ===

const useProjectStorage = () => {
  const [appState, setAppState] = useState(INITIAL_APP_STATE);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const init = async () => {
      try {
        const saved = await loadState();
        if (saved && saved.projects) {
          setAppState(prev => ({
            ...prev,
            projects: saved.projects,
            activeProjectId: saved.activeProjectId || saved.projects[0]?.id || null
          }));
        }
      } catch (e) {
        console.error("Failed to load state", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);
  
  useEffect(() => {
    if (!isLoading) saveState(appState);
  }, [appState, isLoading]);
  
  const updateActiveProject = useCallback((updater) => {
    setAppState(prev => {
      if (!prev.activeProjectId) return prev;
      return {
        ...prev,
        projects: prev.projects.map(p => p.id === prev.activeProjectId ? updater(p) : p)
      };
    });
  }, []);
  
  return { appState, setAppState, isLoading, updateActiveProject };
};

// === Компоненты ===

const WordCounter = ({ project, onAddWords, className }) => {
  const [count, setCount] = useState("");
  const dailyNorm = calculateNorm(project);
  const todayWords = project.wordLogs.find((l) => l.date === getTodayKey())?.count || 0;
  
  const handleSubmit = () => {
    const value = parseInt(count);
    if (isNaN(value)) return;
    onAddWords(value);
    setCount("");
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Слов..."
          className="flex-1 px-3 py-1.5 bg-[#faf7f0] rounded-lg outline-none text-sm text-[#704214]"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          className="px-4 py-1.5 bg-[#c4a574] text-white rounded-lg text-sm font-medium hover:bg-[#c4a574]/90"
        >
          Лог
        </button>
      </div>
      <ProgressBar current={todayWords} target={dailyNorm} label={`Сегодня: ${todayWords}/${dailyNorm}`} />
    </div>
  );
};

const CharacterCard = ({ character, onEdit, onDelete, onPreview }) => (
  <motion.div layout className="bg-[#f5f1e8] rounded-lg border border-[#704214]/5 overflow-hidden group">
    <div className="h-48 bg-[#c4a574]/5 relative overflow-hidden">
      {character.imageUrl ? (
        <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Users size={48} className="text-[#c4a574]/20" />
        </div>
      )}
    </div>
    <div className="p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-serif cursor-pointer hover:text-[#c4a574] text-[#704214]" onClick={() => onPreview(character.id)}>
            {character.name}
          </h3>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
          <ActionButton icon={<Search size={14} />} onClick={() => onPreview(character.id)} />
          <ActionButton icon={<Edit2 size={14} />} onClick={() => onEdit(character)} />
          <ActionButton icon={<Trash2 size={14} />} onClick={() => onDelete(character.id)} variant="danger" />
        </div>
      </div>
      <p className="text-sm text-[#704214]/70 line-clamp-3">{character.bio || "Описания пока нет."}</p>
    </div>
  </motion.div>
);

const ProjectForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState(initialData || {
    title: "",
    description: "",
    totalGoal: 80000,
    deadline: ""
  });
  
  const handleSubmit = () => {
    if (!formData.title) return;
    onSubmit(formData);
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#704214]">Название проекта</label>
        <input
          className="w-full px-4 py-2 bg-[#faf7f0] rounded-lg outline-none focus:ring-2 focus:ring-[#c4a574]/20 text-[#704214]"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Моя великая книга"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#704214]">Описание</label>
        <textarea
          className="w-full px-4 py-2 bg-[#faf7f0] rounded-lg outline-none focus:ring-2 focus:ring-[#c4a574]/20 text-[#704214] min-h-[100px]"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="О чём ваша книга?"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#704214]">Цель (слов)</label>
          <input
            type="number"
            className="w-full px-4 py-2 bg-[#faf7f0] rounded-lg outline-none focus:ring-2 focus:ring-[#c4a574]/20 text-[#704214]"
            value={formData.totalGoal}
            onChange={(e) => setFormData(prev => ({ ...prev, totalGoal: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#704214]">Дедлайн</label>
          <input
            type="date"
            className="w-full px-4 py-2 bg-[#faf7f0] rounded-lg outline-none focus:ring-2 focus:ring-[#c4a574]/20 text-[#704214]"
            value={formData.deadline}
            onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
          />
        </div>
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <button onClick={onCancel} className="px-6 py-2 text-sm font-medium opacity-50 hover:opacity-100 text-[#704214]">Отмена</button>
        <button onClick={handleSubmit} className="px-6 py-2 bg-[#c4a574] text-white rounded-lg font-medium">
          {initialData?.id ? "Сохранить" : "Создать"}
        </button>
      </div>
    </div>
  );
};

// === Главное приложение ===

const TABS = [
  { id: "dashboard", label: "Обзор", icon: Book },
  { id: "manuscript", label: "Рукопись", icon: PenTool },
  { id: "characters", label: "Персонажи", icon: Users },
  { id: "worldbuilding", label: "Мир", icon: Globe },
  { id: "timeline", label: "Таймлайн", icon: Clock },
  { id: "settings", label: "Настройки", icon: Settings }
];

const App = () => {
  const { appState, setAppState, isLoading, updateActiveProject } = useProjectStorage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
        <div className="text-[#c4a574] text-xl font-serif">Загрузка...</div>
      </div>
    );
  }

  const activeProject = appState.projects.find(p => p.id === appState.activeProjectId);

  const handleCreateProject = (data) => {
    const newProject = {
      ...INITIAL_PROJECT,
      ...data,
      id: generateId(),
      activeTimelineId: generateId(),
      timelines: [{ id: generateId(), name: "Основная линия", events: [] }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setAppState(prev => ({
      ...prev,
      projects: [...prev.projects, newProject],
      activeProjectId: newProject.id
    }));
    setShowProjectModal(false);
  };

  const handleDeleteProject = (projectId) => {
    setAppState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== projectId),
      activeProjectId: prev.activeProjectId === projectId ? null : prev.activeProjectId
    }));
  };

  const handleAddWords = (count) => {
    updateActiveProject(project => ({
      ...project,
      wordLogs: [
        ...project.wordLogs,
        { date: getTodayKey(), count, timestamp: new Date().toISOString() }
      ],
      updatedAt: new Date().toISOString()
    }));
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-serif text-[#704214]">Добро пожаловать в Студию Писателя</h2>
              <button
                onClick={() => { setEditingProject(null); setShowProjectModal(true); }}
                className="px-4 py-2 bg-[#c4a574] text-white rounded-lg text-sm font-medium hover:bg-[#c4a574]/90"
              >
                + Новый проект
              </button>
            </div>
            
            {activeProject ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#f5f1e8] p-6 rounded-lg border border-[#704214]/5 md:col-span-2">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-serif text-[#704214]">{activeProject.title}</h3>
                      <p className="text-sm text-[#704214]/70 mt-1">{activeProject.description || "Нет описания"}</p>
                    </div>
                    <div className="flex gap-2">
                      <ActionButton icon={<Edit2 size={16} />} onClick={() => { setEditingProject(activeProject); setShowProjectModal(true); }} />
                      <ActionButton icon={<Trash2 size={16} />} onClick={() => handleDeleteProject(activeProject.id)} variant="danger" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <ProgressBar 
                      current={activeProject.wordLogs.reduce((acc, l) => acc + l.count, 0)} 
                      target={activeProject.totalGoal} 
                      label="Общий прогресс"
                    />
                    <WordCounter project={activeProject} onAddWords={handleAddWords} />
                  </div>
                </div>
                
                <div className="bg-[#f5f1e8] p-6 rounded-lg border border-[#704214]/5">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-[#704214]/70 mb-4">Статистика</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-serif text-[#c4a574]">
                        {activeProject.wordLogs.reduce((acc, l) => acc + l.count, 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-[#704214]/50">Всего слов</div>
                    </div>
                    <div>
                      <div className="text-2xl font-serif text-[#c4a574]">
                        {activeProject.characters?.length || 0}
                      </div>
                      <div className="text-xs text-[#704214]/50">Персонажей</div>
                    </div>
                    <div>
                      <div className="text-2xl font-serif text-[#c4a574]">
                        {calculateNorm(activeProject)}
                      </div>
                      <div className="text-xs text-[#704214]/50">Норма на сегодня</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Book size={64} className="mx-auto text-[#c4a574]/30 mb-4" />
                <p className="text-[#704214]/70">Создайте новый проект, чтобы начать писать.</p>
              </div>
            )}
          </div>
        );
      
      case "characters":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-serif text-[#704214] mb-6">Персонажи</h2>
            {!activeProject ? (
              <p className="text-[#704214]/70">Сначала создайте проект.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeProject.characters?.map(char => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    onEdit={() => {}}
                    onDelete={() => {
                      updateActiveProject(p => ({
                        ...p,
                        characters: p.characters.filter(c => c.id !== char.id)
                      }));
                    }}
                    onPreview={() => {}}
                  />
                ))}
                <button
                  onClick={() => {
                    const newChar = {
                      id: generateId(),
                      name: "Новый персонаж",
                      bio: "",
                      role: "Второстепенный",
                      status: "В разработке"
                    };
                    updateActiveProject(p => ({
                      ...p,
                      characters: [...(p.characters || []), newChar]
                    }));
                  }}
                  className="border-2 border-dashed border-[#704214]/20 rounded-lg p-6 flex flex-col items-center justify-center text-[#704214]/50 hover:border-[#c4a574] hover:text-[#c4a574] transition-colors min-h-[300px]"
                >
                  <Users size={48} className="mb-2" />
                  <span className="text-sm font-medium">Добавить персонажа</span>
                </button>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-serif text-[#704214] mb-4">{TABS.find(t => t.id === activeTab)?.label}</h2>
            <div className="bg-[#f5f1e8] p-8 rounded-lg border border-[#704214]/5 text-center">
              <Sparkles size={48} className="mx-auto text-[#c4a574]/30 mb-4" />
              <p className="text-[#704214]/70">Этот раздел в разработке...</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f0] text-[#704214] flex">
      {/* Боковая панель */}
      <aside className="w-64 bg-[#f5f1e8] border-r border-[#704214]/5 flex flex-col">
        <div className="p-6 border-b border-[#704214]/5">
          <h1 className="text-xl font-serif text-[#c4a574]">Студия Писателя</h1>
          <p className="text-xs opacity-50 mt-1">v.1.0</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-[#c4a574]/10 text-[#c4a574] font-medium"
                    : "opacity-70 hover:opacity-100 hover:bg-[#704214]/5"
                )}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>

      {/* Модальное окно проекта */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => { setShowProjectModal(false); setEditingProject(null); }}
        title={editingProject ? "Редактировать проект" : "Новый проект"}
      >
        <ProjectForm
          initialData={editingProject}
          onSubmit={editingProject ? (data) => {
            setAppState(prev => ({
              ...prev,
              projects: prev.projects.map(p => p.id === editingProject.id ? { ...p, ...data } : p)
            }));
            setShowProjectModal(false);
          } : handleCreateProject}
          onCancel={() => { setShowProjectModal(false); setEditingProject(null); }}
        />
      </Modal>
    </div>
  );
};

// Точка входа
const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(<App />);
}