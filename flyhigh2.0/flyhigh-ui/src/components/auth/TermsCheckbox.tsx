import { motion } from "framer-motion"

interface TermsCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string | null
}

export default function TermsCheckbox({ checked, onChange, error }: TermsCheckboxProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-[#2563EB]
                     focus:ring-2 focus:ring-[#2563EB]/20 focus:ring-offset-0
                     cursor-pointer accent-[#2563EB]"
        />
        <span className="text-xs text-[var(--flyhigh-text-muted)] leading-relaxed select-none">
          I agree to the{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#2563EB] hover:text-[#1d4ed8] underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            Terms &amp; Conditions
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#2563EB] hover:text-[#1d4ed8] underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            Privacy Policy
          </a>
        </span>
      </label>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-600 font-medium pl-7"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}
