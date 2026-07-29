import { Loader2, ArrowRight } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"

interface GradientButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  loadingText?: string
  children: ReactNode
  showArrow?: boolean
}

/**
 * Shared gradient CTA button used across Login, Signup, and OTP pages.
 * Includes the shine-overlay hover effect, loading state, and arrow icon.
 */
export function GradientButton({
  isLoading = false,
  loadingText = "Loading...",
  children,
  showArrow = true,
  disabled,
  className = "",
  ...props
}: GradientButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-70 ${className}`}
      {...props}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      {isLoading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {loadingText}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {children}
          {showArrow && <ArrowRight className="size-4" />}
        </span>
      )}
    </button>
  )
}
