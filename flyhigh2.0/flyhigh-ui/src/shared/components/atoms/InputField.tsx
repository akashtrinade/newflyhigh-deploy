import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface InputFieldProps {
  label: string
  id: string
  type?: "text" | "email" | "password"
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  error?: string
  touched?: boolean
  autoComplete?: string
  className?: string
}

export function InputField({
  label,
  id,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  touched,
  autoComplete,
  className,
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === "password"
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type
  const hasError = Boolean(error && touched)

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold tracking-[0.1em] text-[var(--flyhigh-text)] uppercase"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={resolvedType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[var(--flyhigh-text)] outline-none transition-all placeholder:text-[var(--flyhigh-text-muted)]",
            isPassword && "pr-11",
            hasError
              ? "border-red-400 ring-2 ring-red-100"
              : "border-[var(--flyhigh-border)] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10",
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--flyhigh-text-muted)] transition-colors hover:text-[var(--flyhigh-text-body)]"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        )}
      </div>
      <AnimatePresence>
        {hasError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-1 text-xs font-medium text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
