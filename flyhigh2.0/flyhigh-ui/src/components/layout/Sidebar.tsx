import { useState, type ComponentType } from "react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, LogOut, Plane, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import type { AuthUser } from "@/types/auth"
import { cn } from "@/lib/utils"

// ── Constants ──

const STORAGE_KEY = "flyhigh_sidebar_collapsed"

// ── Types ──

export interface SidebarNavItem {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}

interface SidebarProps {
  navItems: SidebarNavItem[]
  isExpert: boolean
  user: AuthUser | null
  onLogout: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

// ── Tooltip ──

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <span className="whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
              {label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Navigation links ──

function NavLinks({
  navItems,
  isExpert,
  collapsed,
  onClose,
}: {
  navItems: SidebarNavItem[]
  isExpert: boolean
  collapsed: boolean
  onClose: () => void
}) {
  const location = useLocation()
  const layoutId = isExpert ? "expert-nav-active" : "client-nav-active"

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.href

        const link = (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              collapsed && "justify-center px-2",
              isExpert
                ? isActive
                  ? "bg-gradient-to-r from-[#2563EB]/10 to-[#7C3AED]/10 text-[#2563EB] shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-[var(--flyhigh-text)]"
                : isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            )}
            {isActive && !collapsed && (
              <motion.span
                layoutId={layoutId}
                className={cn(
                  "absolute right-3 size-1.5 rounded-full",
                  isExpert ? "bg-[#2563EB]" : "bg-emerald-300",
                )}
              />
            )}
          </Link>
        )

        if (collapsed) {
          return <Tooltip key={item.href} label={item.label}>{link}</Tooltip>
        }

        return link
      })}
    </nav>
  )
}

// ── Component ──

export function Sidebar({
  navItems,
  isExpert,
  user,
  onLogout,
  open,
  onOpenChange,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const logoGradient = isExpert
    ? "bg-gradient-to-br from-[#2563EB] to-[#7C3AED] shadow-sm"
    : "bg-slate-950"

  const sidebarWidth = collapsed ? "w-[68px]" : isExpert ? "w-64" : "w-72"
  const homeHref = isExpert ? "/expert/dashboard" : "/client-dashboard"

  const close = () => onOpenChange(false)

  return (
    <>
      {/* ── Mobile overlay (expert only — client uses Sheet) ── */}
      {isExpert && open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={close}
        />
      )}

      {/* ── Sidebar (shared by both roles, positioning differs) ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300",
          isExpert
            ? cn("lg:translate-x-0 lg:flex", open ? "translate-x-0" : "-translate-x-full")
            : "hidden lg:flex",
          sidebarWidth,
        )}
      >
        <SidebarContent
          logoGradient={logoGradient}
          homeHref={homeHref}
          user={user}
          navItems={navItems}
          isExpert={isExpert}
          onLogout={onLogout}
          showClose={isExpert}
          onClose={close}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      {/* ── Mobile Sheet (client only — expert uses overlay + translate above) ── */}
      {!isExpert && (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetTrigger asChild>
            <span className="hidden" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-white p-0" showCloseButton={false}>
            <SidebarContent
              logoGradient={logoGradient}
              homeHref={homeHref}
              user={user}
              navItems={navItems}
              isExpert={isExpert}
              onLogout={onLogout}
              showClose
              onClose={close}
              collapsed={false}
              onToggleCollapse={() => {}}
            />
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}

// ── Shared sidebar internals ──

function SidebarContent({
  logoGradient,
  homeHref,
  user,
  navItems,
  isExpert,
  onLogout,
  showClose,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  logoGradient: string
  homeHref: string
  user: AuthUser | null
  navItems: SidebarNavItem[]
  isExpert: boolean
  onLogout: () => void
  showClose: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-slate-200 transition-all duration-300",
          collapsed ? "justify-center px-2" : "justify-between px-5",
        )}
      >
        <Link
          to={homeHref}
          className={cn(
            "flex items-center gap-2 overflow-hidden",
            collapsed && "justify-center",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg transition-all duration-300",
              isExpert ? "size-8" : "size-9",
              logoGradient,
            )}
          >
            <Plane className="size-4 text-white" />
          </span>
          {!collapsed && (
            <span className="whitespace-nowrap text-lg font-bold tracking-tight text-[var(--flyhigh-text)]">
              FlyHigh
            </span>
          )}
        </Link>

        {/* Mobile close (always visible on mobile) + Desktop collapse toggle */}
        {showClose && !collapsed && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        )}

        {/* Desktop collapse / expand toggle */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "hidden lg:flex rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all",
            collapsed && "absolute -right-3 top-5 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>

      {/* User info */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-slate-200"
          >
            <div className="px-5 py-4">
              <p className="text-sm font-semibold text-[var(--flyhigh-text)]">
                {user?.fullName || user?.firstName || (isExpert ? "Expert" : "Client")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className={cn("flex-1 overflow-y-auto p-3", collapsed && "px-2")}>
        <NavLinks
          navItems={navItems}
          isExpert={isExpert}
          collapsed={collapsed}
          onClose={onClose}
        />
      </div>

      {/* Logout */}
      <div className={cn("border-t border-slate-200 p-3", collapsed && "px-2")}>
        {collapsed ? (
          <Tooltip label="Logout">
            <button
              onClick={onLogout}
              className="flex w-full items-center justify-center rounded-lg p-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-600"
              aria-label="Logout"
            >
              <LogOut className="size-4" />
            </button>
          </Tooltip>
        ) : isExpert ? (
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="size-4" />
            <span>Logout</span>
          </button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full justify-start gap-3 text-slate-600 hover:bg-red-50 hover:text-red-600"
            onClick={onLogout}
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        )}
      </div>
    </>
  )
}
