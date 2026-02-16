import { useState, useEffect } from "react"
import { CalculationHistoryProvider } from "./hooks/useCalculationHistory"
import { CoordinateTable } from "./components/CoordinateTable"
import { Calculations } from "./components/Calculations"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { SurveyMap } from "./components/SurveyMap"
import { Manual } from "./components/Manual"
import { Contact } from "./components/Contact"
import { Map, Calculator, List, Monitor, Smartphone, BookOpen, Mail } from "lucide-react"
import { Button } from "./components/ui/button"
import { Card } from "./components/ui/card"
import { cn } from "./lib/utils"


function App() {
  // Initialize from localStorage if available
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("antigravity_active_tab") || "list"
    }
    return "list"
  })

  const [viewMode, setViewMode] = useState<"mobile" | "pc">("mobile")
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Persist activeTab
  useEffect(() => {
    localStorage.setItem("antigravity_active_tab", activeTab)
  }, [activeTab])

  return (
    <CalculationHistoryProvider>
      <div className="min-h-screen font-sans text-foreground pb-20 md:pb-0">
        {/* Header */}
        <header className="bg-secondary/90 supports-[backdrop-filter]:bg-secondary/60 backdrop-blur-md border-b sticky top-0 z-10">
          <div className={cn(
            "mx-auto px-4 py-3 flex items-center justify-between",
            viewMode === "mobile" ? "max-w-md" : "max-w-7xl"
          )}>
            <div className="flex items-center gap-2 min-w-0 mr-4">
              <h1 className="text-sm font-bold tracking-wider uppercase truncate" style={{ color: "var(--terracotta)" }}>
                測量座標管理アプリ（Survey Coordinate Manager）
              </h1>

              {/* PC Navigation (Visible only in PC mode) */}
              {viewMode === "pc" && (
                <div className="hidden md:flex items-center gap-1 ml-4">
                  <Button
                    variant={activeTab === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("list")}
                    className={cn(
                      "h-8 text-xs",
                      activeTab === "list" && "bg-[var(--sage)] text-[var(--sage-foreground)] hover:bg-[var(--sage)]/90"
                    )}
                  >
                    <List className="h-3 w-3 mr-2" />
                    一覧
                  </Button>
                  <Button
                    variant={activeTab === "map" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("map")}
                    className={cn(
                      "h-8 text-xs",
                      activeTab === "map" && "bg-[var(--sage)] text-[var(--sage-foreground)] hover:bg-[var(--sage)]/90"
                    )}
                  >
                    <Map className="h-3 w-3 mr-2" />
                    地図
                  </Button>
                  <Button
                    variant={activeTab === "calc" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("calc")}
                    className={cn(
                      "h-8 text-xs",
                      activeTab === "calc" && "bg-[var(--sage)] text-[var(--sage-foreground)] hover:bg-[var(--sage)]/90"
                    )}
                  >
                    <Calculator className="h-3 w-3 mr-2" />
                    計算
                  </Button>
                  <Button
                    variant={activeTab === "manual" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("manual")}
                    className={cn(
                      "h-8 text-xs",
                      activeTab === "manual" && "bg-[var(--sage)] text-[var(--sage-foreground)] hover:bg-[var(--sage)]/90"
                    )}
                  >
                    <BookOpen className="h-3 w-3 mr-2" />
                    取説
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setViewMode(prev => prev === "mobile" ? "pc" : "mobile")}
                title={viewMode === "mobile" ? "PCモードに切り替え" : "モバイルモードに切り替え"}
              >
                {viewMode === "mobile" ? (
                  <Monitor className="h-4 w-4" />
                ) : (
                  <Smartphone className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant={activeTab === "contact" ? "secondary" : "ghost"}
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full flex-shrink-0",
                  activeTab === "contact" && "bg-[var(--sage)] text-[var(--sage-foreground)] hover:bg-[var(--sage)]/90"
                )}
                onClick={() => setActiveTab("contact")}
                title="お問い合わせ・会社案内"
              >
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className={cn(
          "mx-auto p-4 transition-all duration-300 ease-in-out",
          viewMode === "mobile" ? "max-w-md" : "max-w-7xl grid grid-cols-1 gap-6"
        )}>
          {viewMode === "pc" ? (
            // PC Mode: Keep all components mounted, toggle visibility
            <>
              <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== "list" && "hidden")}>
                <CoordinateTable />
              </div>

              <div className={cn(activeTab !== "map" && "hidden")}>
                <Card className="h-[600px] p-4">
                  <ErrorBoundary name="SurveyMap">
                    <SurveyMap isFullScreen={isFullScreen} setIsFullScreen={setIsFullScreen} />
                  </ErrorBoundary>
                </Card>
              </div>

              <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== "calc" && "hidden")}>
                <ErrorBoundary name="Calculations">
                  <Calculations />
                </ErrorBoundary>
              </div>

              <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== "manual" && "hidden")}>
                <Manual />
              </div>

              <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== "contact" && "hidden")}>
                <Contact />
              </div>
            </>
          ) : (
            // Mobile Mode: Keep all components mounted, toggle visibility
            <>
              <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300", activeTab !== "list" && "hidden")}>
                <CoordinateTable />
              </div>

              <div className={cn("pb-20", activeTab !== "map" && "hidden")}>
                <ErrorBoundary name="SurveyMap">
                  <SurveyMap isFullScreen={isFullScreen} setIsFullScreen={setIsFullScreen} />
                </ErrorBoundary>
              </div>

              <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20", activeTab !== "calc" && "hidden")}>
                <ErrorBoundary name="Calculations">
                  <Calculations />
                </ErrorBoundary>
              </div>

              <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20", activeTab !== "manual" && "hidden")}>
                <Manual />
              </div>

              <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20", activeTab !== "contact" && "hidden")}>
                <Contact />
              </div>
            </>
          )}
        </main>

        {/* Bottom Navigation (Mobile Only) */}
        {viewMode === "mobile" && !isFullScreen && (
          <nav className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 z-50 pb-safe">
            <div className="mx-auto max-w-md flex justify-around items-center h-16">
              <button
                onClick={() => setActiveTab("list")}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95",
                  activeTab === "list"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className={cn("h-6 w-6", activeTab === "list" && "fill-current/20")} />
                <span className="text-[10px] font-medium">一覧</span>
              </button>

              <button
                onClick={() => setActiveTab("map")}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95",
                  activeTab === "map"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Map className={cn("h-6 w-6", activeTab === "map" && "fill-current/20")} />
                <span className="text-[10px] font-medium">地図</span>
              </button>

              <button
                onClick={() => setActiveTab("calc")}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95",
                  activeTab === "calc"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Calculator className={cn("h-6 w-6", activeTab === "calc" && "fill-current/20")} />
                <span className="text-[10px] font-medium">計算</span>
              </button>

              <button
                onClick={() => setActiveTab("manual")}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95",
                  activeTab === "manual"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BookOpen className={cn("h-6 w-6", activeTab === "manual" && "fill-current/20")} />
                <span className="text-[10px] font-medium">取説</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </CalculationHistoryProvider>
  )
}

export default App
