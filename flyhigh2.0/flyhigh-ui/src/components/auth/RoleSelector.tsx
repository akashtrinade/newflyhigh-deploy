import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Role } from "./types"

interface RoleSelectorProps {
  selected: Role
  onChange: (role: Role) => void
}

const roles: {
  id: Role
  icon: string
  title: string
  description: string
}[] = [
  {
    id: "client",
    icon: "👤",
    title: "Client",
    description: "Find and book experts",
  },
  {
    id: "expert",
    icon: "🎓",
    title: "Expert",
    description: "Provide consultations and earn",
  },
  {
    id: "admin",
    icon: "🛡",
    title: "Admin",
    description: "Platform management",
  },
]

export default function RoleSelector({ selected, onChange }: RoleSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {roles.map((role) => {
        const isSelected = selected === role.id
        return (
          <motion.button
            key={role.id}
            type="button"
            onClick={() => onChange(role.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all",
              isSelected
                ? "border-[#2563EB] bg-gradient-to-b from-[#2563EB]/5 to-[#7C3AED]/5 shadow-lg shadow-[#2563EB]/10"
                                : "border-[var(--flyhigh-border)] bg-white hover:border-[#2563EB]/30 hover:shadow-md")}
          >
            {/* Glow effect for selected */}
            {isSelected && (
              <motion.div
                layoutId="roleGlow"
                className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#2563EB]/10 to-[#7C3AED]/10 blur-sm"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}

            {/* Icon */}
            <span className="relative text-xl">{role.icon}</span>

            {/* Title */}
            <span
              className={cn(
                "relative text-xs font-bold transition-colors",
                isSelected
                  ? "bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent"
                                    : "text-[var(--flyhigh-text)]")}
            >
              {role.title}
            </span>

            {/* Description */}
            <span className="relative text-[10px] leading-tight text-[var(--flyhigh-text-muted)]">
              {role.description}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
