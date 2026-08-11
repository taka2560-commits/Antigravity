import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface ActiveProjectContextType {
    activeProjectId: number | "all"
    setActiveProjectId: (id: number | "all") => void
}

const ActiveProjectContext = createContext<ActiveProjectContextType | undefined>(undefined)

const STORAGE_KEY = "antigravity_active_project_id"

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
    const [activeProjectId, setActiveProjectIdState] = useState<number | "all">(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved === "all") return "all"
            if (saved) {
                const parsed = parseInt(saved, 10)
                if (!isNaN(parsed)) return parsed
            }
        }
        return "all"
    })

    const setActiveProjectId = (id: number | "all") => {
        setActiveProjectIdState(id)
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, String(id))
        }
    }

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, String(activeProjectId))
        }
    }, [activeProjectId])

    return (
        <ActiveProjectContext.Provider value={{ activeProjectId, setActiveProjectId }}>
            {children}
        </ActiveProjectContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveProject() {
    const context = useContext(ActiveProjectContext)
    if (!context) {
        throw new Error("useActiveProject must be used within an ActiveProjectProvider")
    }
    return context
}
