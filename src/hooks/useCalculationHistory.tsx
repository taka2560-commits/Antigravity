import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export type HistoryType = 'st' | 'coord' | 'north' | 'helmert' | 'point';

export interface HistoryItem {
    id: string; // UUID
    timestamp: number;
    type: HistoryType;
    title: string;
    summary: string;
    details: any; // スナップショットとして保存（参照ではなく値コピー）
}

const STORAGE_KEY = 'survey-app-calc-history';
const MAX_HISTORY_ITEMS = 50;

interface CalculationHistoryContextType {
    history: HistoryItem[];
    addHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
    removeHistory: (id: string) => void;
    clearHistory: () => void;
}

const CalculationHistoryContext = createContext<CalculationHistoryContextType | undefined>(undefined);

export function CalculationHistoryProvider({ children }: { children: ReactNode }) {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // 初期ロード
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }, []);

    const addHistory = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
        const newItem: HistoryItem = {
            ...item,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };

        setHistory(prev => {
            const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error("Failed to save history", e);
            }
            return updated;
        });
    }, []);

    const removeHistory = useCallback((id: string) => {
        setHistory(prev => {
            const updated = prev.filter(item => item.id !== id);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error("Failed to save history", e);
            }
            return updated;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const value = {
        history,
        addHistory,
        removeHistory,
        clearHistory
    };

    return (
        <CalculationHistoryContext.Provider value={value}>
            {children}
        </CalculationHistoryContext.Provider>
    );
}

export function useCalculationHistory() {
    const context = useContext(CalculationHistoryContext);
    if (context === undefined) {
        throw new Error('useCalculationHistory must be used within a CalculationHistoryProvider');
    }
    return context;
}
