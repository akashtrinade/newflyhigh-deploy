import { useCallback, useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { Menu } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useHeartbeat } from "@/hooks/useHeartbeat"
import IncomingCallPopup from "@/components/video-call/IncomingCallPopup"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { clientNavItems, expertNavItems, adminNavItems } from "@/router/routes"

const STORAGE_KEY = "flyhigh_sidebar_collapsed"

function readCollapsedPref(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === "true"
  } catch {
    // localStorage unavailable
  }
  return false
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsedPref)

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // localStorage unavailable
      }
      return next
    })
  }, [])

  const isAdmin = user?.role?.toUpperCase() === "ADMIN"
  const isExpert = user?.role?.toUpperCase() === "EXPERT"

  // Role-based nav items
  const navItems = isAdmin ? adminNavItems : isExpert ? expertNavItems : clientNavItems

  // Dynamic page title from current route
  const pageTitle =
    navItems.find((item) => item.href === location.pathname)?.label ||
    (isAdmin ? "Admin" : isExpert ? "Expert" : "Client")

  const areaLabel = isAdmin ? "Admin Area" : isExpert ? "Expert Area" : "Client Area"

  // Expert heartbeat (no-op for clients via internal guard)
  useHeartbeat()

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  // Content padding: matches sidebar width
  const expandedPadding = isExpert ? "lg:pl-64" : "lg:pl-72"
  const contentPadding = collapsed ? "lg:pl-[68px]" : expandedPadding

  return (
    <div
      className={
        isExpert
          ? "min-h-svh bg-[var(--flyhigh-section)]"
          : "min-h-svh bg-[#f7f8fb] text-slate-950"
      }
    >
      <Sidebar
        navItems={navItems}
        isExpert={isExpert}
        user={user}
        onLogout={handleLogout}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className={cn("transition-all duration-300", contentPadding)}>
        {isExpert || !isAdmin ? (
          <>
            {/* Mobile menu button only — no top navbar (Expert + Client) */}
            <div className="sticky top-0 z-30 flex h-12 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="size-4" />
              </Button>
            </div>
            <main className="p-4 md:p-6 lg:p-8">
              <Outlet />
            </main>
            {isExpert && <IncomingCallPopup />}
          </>
        ) : (
          <>
            <Header
              isExpert={isExpert}
              user={user}
              pageTitle={pageTitle}
              areaLabel={areaLabel}
              onMenuClick={() => setSidebarOpen(true)}
            />
            <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
              <Outlet />
            </main>
          </>
        )}
      </div>
    </div>
  )
}
