import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Catches unhandled React render errors and displays a user-friendly
 * fallback UI instead of a blank white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="size-12 text-amber-500" />
          <h2 className="text-xl font-semibold text-slate-800">Something went wrong</h2>
          <p className="max-w-md text-sm text-slate-500">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-2 max-w-lg overflow-auto rounded bg-slate-100 p-3 text-left text-xs text-red-600">
              {this.state.error.message}
            </pre>
          )}
          <Button onClick={this.handleReset} variant="outline">
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()} variant="default">
            Refresh Page
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
