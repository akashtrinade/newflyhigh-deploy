import { motion } from "framer-motion"
import { Plane, Users, MessageSquare, Video, Star, ArrowRight } from "lucide-react"
import type { ReactNode } from "react"
import { Navbar } from "@/components/layout/Navbar"

interface AuthLayoutProps {
  children: ReactNode
}

const floatingStats = [
  { value: "5,000+", label: "Experts", icon: Users },
  { value: "50,000+", label: "Consultations", icon: MessageSquare },
  { value: "98%", label: "Satisfaction", icon: Star },
]

function FloatingElement({
  className,
  children,
  duration = 20,
}: {
  className: string
  children: ReactNode
  duration?: number
}) {
  return (
    <motion.div
      className={`pointer-events-none absolute ${className}`}
      animate={{
        y: [0, -15, 0],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  )
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col">
      {/* ── Navbar ── */}
      <Navbar />

      {/* ── Main Content ── */}
      <div className="flex flex-1 pt-20">
        {/* ── Left Brand Section ── */}
      <div className="relative hidden w-full max-w-[45%] overflow-hidden bg-gradient-to-br from-[#2563EB] via-[#4f46e5] to-[#7C3AED] lg:flex lg:flex-col">
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 70%, rgba(255,255,255,0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 40% 60%, rgba(255,255,255,0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating background elements */}
        <FloatingElement className="top-[15%] left-[10%]" duration={15}>
          <div className="size-24 rounded-full bg-white/10 blur-xl" />
        </FloatingElement>
        <FloatingElement className="top-[40%] right-[15%]" duration={18}>
          <div className="size-32 rounded-full bg-white/10 blur-2xl" />
        </FloatingElement>
        <FloatingElement className="bottom-[25%] left-[20%]" duration={12}>
          <div className="size-20 rounded-full bg-white/10 blur-lg" />
        </FloatingElement>

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-12">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
              <Plane className="size-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              FlyHigh
            </span>
          </motion.div>

          {/* Main content */}
          <div className="space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl"
            >
              Connect with
              <br />
              <span className="bg-gradient-to-r from-amber-200 to-yellow-300 bg-clip-text text-transparent">
                Verified Experts
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="max-w-md text-base leading-relaxed text-white/80"
            >
              Get professional guidance through one-on-one consultations with
              industry experts.
            </motion.p>

            {/* Illustration area */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="relative mt-8 space-y-4"
            >
              {/* Marketplace ecosystem visual */}
              <div className="relative flex items-center gap-4">
                {/* Experts card */}
                <div className="flex-1 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-amber-400/20">
                      <Users className="size-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Experts</p>
                      <p className="text-xs text-white/60">Verified professionals</p>
                    </div>
                  </div>
                </div>

                <ArrowRight className="size-5 text-white/40" />

                {/* Clients card */}
                <div className="flex-1 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-emerald-400/20">
                      <Users className="size-5 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Clients</p>
                      <p className="text-xs text-white/60">Seeking guidance</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat & Video row */}
              <div className="flex gap-4">
                <div className="flex-1 rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-white/70" />
                    <span className="text-xs font-medium text-white/70">Chat</span>
                  </div>
                </div>
                <div className="flex-1 rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <Video className="size-4 text-white/70" />
                    <span className="text-xs font-medium text-white/70">Video Call</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Floating stats */}
          <div className="relative z-10 flex gap-6">
            {floatingStats.map((stat, i) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 + i * 0.15 }}
                  className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm"
                >
                  <Icon className="size-4 text-amber-300" />
                  <div>
                    <p className="text-sm font-bold text-white">{stat.value}</p>
                    <p className="text-[10px] text-white/60">{stat.label}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Right Auth Section ── */}
        <div className="flex flex-1 items-center justify-center bg-[var(--flyhigh-section)] px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md"
          >
            {/* Mobile logo */}
            <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7C3AED] shadow-sm">
                <Plane className="size-4 text-white" />
              </div>
              <span className="text-lg font-bold text-[var(--flyhigh-text)]">
                FlyHigh
              </span>
            </div>

            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
