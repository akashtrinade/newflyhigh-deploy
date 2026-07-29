import { Link } from "react-router-dom"
import { Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AuthUser } from "@/types/auth"
import { NotificationBell } from "./NotificationBell"

interface HeaderProps {
  isExpert: boolean
  user: AuthUser | null
  pageTitle: string
  areaLabel: string
  onMenuClick: () => void
}

export function Header({
  isExpert,
  user,
  pageTitle,
  areaLabel,
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </Button>

        {isExpert ? (
          <div className="hidden lg:block" />
        ) : (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {areaLabel}
            </p>
            <h1 className="text-base font-semibold text-slate-950">
              {pageTitle}
            </h1>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {isExpert ? (
          <>
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-xs font-bold text-white">
              {user?.firstName?.[0]?.toUpperCase() || "E"}
            </div>
            <span className="hidden text-sm font-medium text-[var(--flyhigh-text)] sm:block">
              {user?.fullName || "Expert"}
            </span>
          </>
        ) : (
          <>
            <Button
              asChild
              variant="outline"
              className="hidden h-9 gap-2 sm:inline-flex"
            >
              <Link to="/search-experts">
                <Search className="size-4" />
                Find Expert
              </Link>
            </Button>
            <NotificationBell />
          </>
        )}
      </div>
    </header>
  )
}
