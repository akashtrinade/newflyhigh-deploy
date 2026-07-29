import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Users, GraduationCap } from "lucide-react"
import type { AccountType } from "./types"

interface AccountTypeSelectorProps {
  selected: AccountType | null
  onChange: (type: AccountType) => void
}

export default function AccountTypeSelector({
  selected,
  onChange,
}: AccountTypeSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Client Card */}
      <motion.button
        type="button"
        onClick={() => onChange("client")}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group relative flex flex-col items-center gap-4 rounded-2xl border-2 p-8 text-center transition-all",
          selected === "client"
            ? "border-[#2563EB] bg-gradient-to-b from-[#2563EB]/5 to-[#7C3AED]/5 shadow-xl shadow-[#2563EB]/15"
                        : "border-[var(--flyhigh-border)] bg-white hover:border-[#2563EB]/30 hover:shadow-lg")}
      >
        {selected === "client" && (
          <motion.div
            layoutId="accountGlow"
            className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#2563EB]/10 to-[#7C3AED]/10 blur-sm"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}

        <div
          className={cn(
            "relative flex size-16 items-center justify-center rounded-2xl transition-all",
            selected === "client"
              ? "bg-gradient-to-br from-[#2563EB] to-[#7C3AED] shadow-lg shadow-[#2563EB]/25"
                            : "bg-slate-100")}
        >
          <Users
            className={cn(
              "size-7",
              selected === "client" ? "text-white" : "text-slate-500"
            )}
          />
        </div>

        <div className="relative space-y-1">
          <h3
            className={cn(
              "text-lg font-bold",
              selected === "client"
                ? "bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent"
                                : "text-[var(--flyhigh-text)]")}
          >
            Client
          </h3>
          <p className="text-sm text-[var(--flyhigh-text-muted)]">
            Join as Client
          </p>
          <p className="text-xs text-slate-400">
            Book consultations with experts.
          </p>
        </div>
      </motion.button>

      {/* Expert Card */}
      <motion.button
        type="button"
        onClick={() => onChange("expert")}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group relative flex flex-col items-center gap-4 rounded-2xl border-2 p-8 text-center transition-all",
          selected === "expert"
            ? "border-[#2563EB] bg-gradient-to-b from-[#2563EB]/5 to-[#7C3AED]/5 shadow-xl shadow-[#2563EB]/15"
                        : "border-[var(--flyhigh-border)] bg-white hover:border-[#2563EB]/30 hover:shadow-lg")}
      >
        {selected === "expert" && (
          <motion.div
            layoutId="accountGlow"
            className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#2563EB]/10 to-[#7C3AED]/10 blur-sm"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}

        <div
          className={cn(
            "relative flex size-16 items-center justify-center rounded-2xl transition-all",
            selected === "expert"
              ? "bg-gradient-to-br from-[#2563EB] to-[#7C3AED] shadow-lg shadow-[#2563EB]/25"
                            : "bg-slate-100")}
        >
          <GraduationCap
            className={cn(
              "size-7",
              selected === "expert" ? "text-white" : "text-slate-500 dark:text-slate-400"
            )}
          />
        </div>

        <div className="relative space-y-1">
          <h3
            className={cn(
              "text-lg font-bold",
              selected === "expert"
                ? "bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent"
                                : "text-[var(--flyhigh-text)]")}
          >
            Expert
          </h3>
          <p className="text-sm text-[var(--flyhigh-text-muted)]">
            Become an Expert
          </p>
          <p className="text-xs text-slate-400">
            Offer professional consultations and earn.
          </p>
        </div>
      </motion.button>
    </div>
  )
}
