import { motion } from "framer-motion"
import { Settings2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export default function AdminSettings() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">
          Settings
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Configure platform-wide settings, commission rates, and system
          preferences.
        </p>
      </motion.section>

      {/* Content */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex size-16 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Settings2 className="size-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-950">
              Coming Soon
            </h3>
            <p className="mt-2 max-w-sm text-center text-sm text-slate-500">
              Admin settings will be available here. You will be able to manage
              commission rates, notification preferences, and platform
              configuration.
            </p>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  )
}
