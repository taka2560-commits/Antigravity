import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
    children: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 border border-red-500/50 rounded-lg bg-red-500/10 text-red-600 my-2">
                    <div className="flex items-center gap-2 font-bold mb-1">
                        <AlertCircle className="h-4 w-4" />
                        Error in {this.props.name || "Component"}
                    </div>
                    <div className="text-sm opacity-90">
                        {this.state.error?.message || "Something went wrong."}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
