// src/lib/constants.ts
export const STORAGE_KEYS = {
  APP_STATE: "writers_studio_app_state",
  ACTIVE_PROJECT: "writers_studio_app_state_active_project",
  ACTIVE_TAB: "writers_studio_app_state_active_tab"
} as const;

export const DB_CONFIG = {
  NAME: "WritersStudioDB",
  STORE: "appState",
  VERSION: 1
} as const;

export const CATEGORIES = {
  characters: {
    roles: ["Протагонист", "Антагонист", "Второстепенный", "Эпизодический"],
    statuses: ["Жив", "Мёртв", "В разработке"]
  },
  worldbuilding: {
    categories: ["magic", "technology", "location", "culture", "races", "other"],
    labels: { magic: "Магия", technology: "Технологии", location: "Локация", culture: "Культура", races: "Расы", other: "Другое" }
  },
  timeline: {
    importance: ["low", "medium", "high"],
    importanceLabels: { low: "Низкая", medium: "Средняя", high: "Высокая" }
  }
} as const;

// src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const calculateNorm = (project: Project) => {
  if (!project.deadline) return 0;
  const totalWritten = project.wordLogs.reduce((acc, l) => acc + l.count, 0);
  const remaining = Math.max(0, project.totalGoal - totalWritten);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = parseISO(project.deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays <= 0 ? remaining : Math.ceil(remaining / diffDays);
};

export const getTodayKey = () => format(new Date(), "yyyy-MM-dd");

export const getWordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

// src/components/ui/Modal.tsx
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl"
};

export const Modal = ({ isOpen, onClose, title, children, size = "lg", showCloseButton = true }: ModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={cn("bg-card w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", sizes[size])}
        >
          {(title || showCloseButton) && (
            <div className="p-6 border-b border-ink/5 flex justify-between items-center shrink-0">
              {title && <h3 className="text-2xl font-serif">{title}</h3>}
              {showCloseButton && (
                <button onClick={onClose} className="p-2 hover:bg-ink/5 rounded-full transition-colors ml-auto">
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

// src/components/ui/ProgressBar.tsx
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar = ({ current, target, label, showPercentage = true, className }: ProgressBarProps) => {
  const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  
  return (
    <div className={cn("space-y-1", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
          {label && <span className="opacity-30">{label}</span>}
          {showPercentage && <span className="text-sepia opacity-100">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="h-1.5 bg-ink/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full bg-sepia"
        />
      </div>
    </div>
  );
};

// src/components/ui/Tabs.tsx
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs = ({ tabs, activeTab, onChange, className }: TabsProps) => (
  <div className={cn("flex border-b border-ink/5 overflow-x-auto custom-scrollbar shrink-0", className)}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={cn(
          "px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap",
          activeTab === tab.id ? "border-sepia text-sepia" : "border-transparent text-ink/40 hover:text-ink"
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// src/components/WordCounter.tsx
import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { calculateNorm, getTodayKey } from "@/lib/utils";

interface WordCounterProps {
  project: Project;
  onAddWords: (count: number) => void;
  className?: string;
}

export const WordCounter = ({ project, onAddWords, className }: WordCounterProps) => {
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
          className="flex-1 px-3 py-1.5 bg-paper rounded-lg outline-none text-sm"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          className="px-4 py-1.5 bg-sepia text-white rounded-lg text-sm font-medium hover:bg-sepia/90"
        >
          Лог
        </button>
      </div>
      <ProgressBar current={todayWords} target={dailyNorm} label={`Сегодня: ${todayWords}/${dailyNorm}`} />
    </div>
  );
};

// src/components/CharacterForm.tsx
import { useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";

interface CharacterFormProps {
  initialData?: Character;
  characters?: Character[];
  onSubmit: (data: Partial<Character>) => void;
  onCancel: () => void;
}

export const CharacterForm = ({ initialData, characters = [], onSubmit, onCancel }: CharacterFormProps) => {
  const [formData, setFormData] = useState<Partial<Character>>(initialData || { relationships: [] });
  const [activeTab, setActiveTab] = useState("general");
  const [relTarget, setRelTarget] = useState("");
  const [relType, setRelType] = useState("");
  
  const tabs = [
    { id: "general", label: "Общая информация" },
    { id: "appearance", label: "Внешность" },
    { id: "personality", label: "Личность" },
    { id: "bio", label: "Биография" },
    { id: "notes", label: "Заметки" },
    { id: "relationships", label: "Связи" }
  ];
  
  const addRelationship = () => {
    if (!relTarget || !relType) return;
    setFormData(prev => ({
      ...prev,
      relationships: [...(prev.relationships || []), { targetId: relTarget, type: relType }]
    }));
    setRelTarget("");
    setRelType("");
  };
  
  const removeRelationship = (index: number) => {
    setFormData(prev => ({
      ...prev,
      relationships: (prev.relationships || []).filter((_, i) => i !== index)
    }));
  };
  
  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Основные поля */}
              </div>
              <div className="space-y-4">
                {/* Дополнительные поля */}
              </div>
            </div>
            <MarkdownEditor
              label="Общее описание"
              value={formData.bio || ""}
              onChange={(val) => setFormData(prev => ({ ...prev, bio: val }))}
              minHeight="120px"
            />
          </div>
        );
      case "relationships":
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                className="flex-1 px-3 py-2 bg-paper rounded-xl text-sm outline-none"
                value={relTarget}
                onChange={(e) => setRelTarget(e.target.value)}
              >
                <option value="">Выберите персонажа...</option>
                {characters.filter(c => c.id !== initialData?.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                className="flex-1 px-3 py-2 bg-paper rounded-xl text-sm outline-none"
                placeholder="Тип связи"
                value={relType}
                onChange={(e) => setRelType(e.target.value)}
              />
              <button onClick={addRelationship} className="p-2 bg-sepia text-white rounded-lg">+</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(formData.relationships || []).map((rel, idx) => {
                const target = characters.find(c => c.id === rel.targetId);
                return (
                  <div key={idx} className="flex justify-between items-center bg-paper p-2 rounded-lg">
                    <span>{target?.name || "Удалён"}</span>
                    <span className="opacity-60">— {rel.type}</span>
                    <button onClick={() => removeRelationship(idx)} className="text-red-500">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      default:
        return (
          <MarkdownEditor
            label={tabs.find(t => t.id === activeTab)?.label || ""}
            value={formData[activeTab as keyof Character] as string || ""}
            onChange={(val) => setFormData(prev => ({ ...prev, [activeTab]: val }))}
            minHeight="400px"
          />
        );
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">{renderTabContent()}</div>
      <div className="p-6 bg-paper flex justify-end gap-4 shrink-0">
        <button onClick={onCancel} className="px-6 py-2 text-sm font-medium opacity-50 hover:opacity-100">Отмена</button>
        <button onClick={() => onSubmit(formData)} className="px-6 py-2 bg-sepia text-white rounded-lg font-medium">
          {initialData?.id ? "Сохранить" : "Создать"}
        </button>
      </div>
    </div>
  );
};

// src/hooks/useProjectStorage.ts
import { useState, useEffect, useCallback } from "react";
import { loadState, saveState } from "@/lib/indexedDB";
import { INITIAL_APP_STATE } from "@/lib/constants";

export const useProjectStorage = () => {
  const [appState, setAppState] = useState(INITIAL_APP_STATE);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const init = async () => {
      try {
        const saved = await loadState();
        if (saved) {
          // Миграция данных
          const migrated = saved.projects?.map((p: any) => ({
            ...p,
            timelines: p.timelines || [{ id: generateId(), name: "Основная линия", events: p.timeline || [] }],
            activeTimelineId: p.activeTimelineId || p.timelines?.[0]?.id || generateId()
          })) || [saved];
          
          setAppState(prev => ({
            ...prev,
            projects: migrated,
            activeProjectId: saved.activeProjectId || migrated[0]?.id || null
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
  
  const updateActiveProject = useCallback((updater: (project: Project) => Project) => {
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

// src/hooks/useAutoSave.ts
import { useEffect, useRef, useState } from "react";

export const useAutoSave = (value: string, onSave: (value: string) => void, delay = 3000) => {
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    setStatus("unsaved");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      setStatus("saving");
      onSave(value);
      setTimeout(() => setStatus("saved"), 500);
    }, delay);
    
    return () => clearTimeout(timeoutRef.current);
  }, [value, onSave, delay]);
  
  return { status, isSaved: status === "saved", isUnsaved: status === "unsaved" };
};

// src/components/CharacterCard.tsx (упрощённая версия)
export const CharacterCard = ({ character, onEdit, onDelete, onPreview, onShowRelationships }) => (
  <motion.div layout className="bg-card rounded-lg border border-ink/5 overflow-hidden group">
    <div className="h-48 bg-sepia/5 relative overflow-hidden">
      {character.imageUrl ? (
        <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Users size={48} className="text-sepia/20" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button onClick={() => onShowRelationships(character.id)} className="bg-card text-sepia px-4 py-2 rounded-full text-xs font-bold">
          Связи ({character.relationships?.length || 0})
        </button>
      </div>
    </div>
    <div className="p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-serif cursor-pointer hover:text-sepia" onClick={() => onPreview(character.id)}>
            {character.name}
          </h3>
          {character.relationships?.length > 0 && (
            <button onClick={() => onShowRelationships(character.id)} className="flex items-center gap-1 text-[10px] text-sepia mt-0.5">
              <Users size={10} /> {character.relationships.length} связей
            </button>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
          <ActionButton icon={<Search size={14} />} onClick={() => onPreview(character.id)} />
          <ActionButton icon={<Edit2 size={14} />} onClick={() => onEdit(character)} />
          <ActionButton icon={<Trash2 size={14} />} onClick={() => onDelete(character.id)} variant="danger" />
        </div>
      </div>
      <p className="text-sm text-ink/70 line-clamp-3">{character.bio || "Описания пока нет."}</p>
    </div>
  </motion.div>
);