import { Plane } from "lucide-react"
import type { ReactNode } from "react"

import { Separator } from "@/components/ui/separator"

import { footerLinks } from "@/components/home/data"

function SocialIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const socialLinks = [
  {
    label: "LinkedIn",
    href: "#",
    icon: (
      <SocialIcon>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </SocialIcon>
    ),
  },
  {
    label: "Twitter",
    href: "#",
    icon: (
      <SocialIcon>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </SocialIcon>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    icon: (
      <SocialIcon>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </SocialIcon>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    icon: (
      <SocialIcon>
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </SocialIcon>
    ),
  },
] as const

export function Footer() {
  return (
    <footer
      id="contact"
      className="bg-[var(--flyhigh-dark)] pt-16 pb-8 text-white"
      aria-label="Site footer"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-1">
            <a href="#home" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--flyhigh-primary)] to-[var(--flyhigh-primary-hover)]">
                <Plane className="size-4 text-white" aria-hidden="true" />
              </div>
              <span className="text-lg font-semibold">FlyHigh</span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              The trusted marketplace for expert consultations. Connect with
              verified professionals anytime, anywhere.
            </p>
            <div className="mt-6 flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.label}
                  aria-label={social.label}
                  className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-white/50 transition-colors hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8 bg-white/10" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-white/40 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} FlyHigh. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-white/70">
              Terms of Service
            </a>
            <a href="#" className="transition-colors hover:text-white/70">
              Privacy Policy
            </a>
            <a href="#" className="transition-colors hover:text-white/70">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
