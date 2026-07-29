import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  /** Brief text shown below the spinner */
  message?: string
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Extra classes for the container */
  className?: string
}

const sizeClasses = {
  sm: "size-4",
  md: "size-8",
  lg: "size-12",
} as const

export function LoadingSpinner({
  message,
  size = "md",
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] items-center justify-center",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            "animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]",
            sizeClasses[size],
          )}
        />
        {message && (
          <p className="text-sm text-slate-500">{message}</p>
        )}
      </div>
    </div>
  )
}

/** Inline spinner for use inside buttons or small containers */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("size-4 animate-spin", className)}
      aria-hidden="true"
    />
  )
}
