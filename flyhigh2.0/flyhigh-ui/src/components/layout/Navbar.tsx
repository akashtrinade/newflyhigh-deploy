import { Menu, Plane, Search } from "lucide-react"
import { useState, useMemo, useCallback } from "react"
import { Link, useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { navLinks } from "@/components/home/data"

function isHashLink(href: string) {
  return href.startsWith("#")
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  // Memoized: recomputed only when pathname changes
  const isActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/"
      return pathname.startsWith(href)
    },
    [pathname],
  )

  // Precompute classes to avoid calling cn() for every link on every render
  const desktopClasses = useMemo(
    () =>
      navLinks.reduce<
        Record<string, string>
      >((acc, link) => {
        acc[link.href] = cn(
          "relative inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive(link.href)
            ? "text-[var(--flyhigh-primary)] after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-[var(--flyhigh-primary)] after:content-['']"
            : "text-slate-600 hover:bg-slate-100 hover:text-[var(--flyhigh-text)]",
        )
        return acc
      }, {}),
    [isActive],
  )

  const mobileClasses = useMemo(
    () =>
      navLinks.reduce<
        Record<string, string>
      >((acc, link) => {
        acc[link.href] = cn(
          "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100",
          isActive(link.href)
            ? "text-[var(--flyhigh-primary)] bg-slate-100"
            : "text-slate-700",
        )
        return acc
      }, {}),
    [isActive],
  )

  return (
    <header className="fixed top-0 right-0 left-0 z-50 px-4 pt-4 md:px-6">
      <nav
        aria-label="Main navigation"
        className="glass-nav mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border px-4 shadow-sm md:h-16 md:px-6"
      >
        <Link
          to="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--flyhigh-primary)] to-[var(--flyhigh-primary-hover)] shadow-sm">
            <Plane className="size-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--flyhigh-text)]">
            FlyHigh
          </span>
        </Link>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              {isHashLink(link.href) ? (
                <a href={link.href} className={desktopClasses[link.href]}>
                  {link.label}
                </a>
              ) : (
                <Link to={link.href} className={desktopClasses[link.href]}>
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="hidden text-slate-600 sm:inline-flex"
            aria-label="Search"
          >
            <Search className="size-4" />
          </Button>
          <Link to="/login" className="hidden md:inline-flex">
            <Button variant="ghost" size="sm" className="font-medium text-slate-700">
              Log in
            </Button>
          </Link>
          <Link to="/signup" className="hidden sm:inline-flex">
            <Button
              size="sm"
              className="bg-[var(--flyhigh-primary)] font-medium shadow-md shadow-indigo-500/20 hover:bg-[var(--flyhigh-primary-hover)]"
            >
              Get Started Free
            </Button>
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--flyhigh-primary)] to-[var(--flyhigh-primary-hover)]">
                    <Plane className="size-3.5 text-white" />
                  </div>
                  FlyHigh
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {navLinks.map((link) => {
                  const handleClick = () => setOpen(false)
                  return isHashLink(link.href) ? (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={handleClick}
                      className={mobileClasses[link.href]}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={handleClick}
                      className={mobileClasses[link.href]}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
              <div className="mt-6 flex flex-col gap-2">
                <Link to="/login">
                  <Button variant="outline" className="w-full border-slate-300">
                    Log in
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="w-full bg-[var(--flyhigh-primary)] hover:bg-[var(--flyhigh-primary-hover)]">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
