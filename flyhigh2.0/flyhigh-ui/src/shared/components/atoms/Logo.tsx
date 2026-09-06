import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

interface LogoProps {
  /** Additional classes for the image element */
  className?: string
  /** Classes for the wrapper Link element */
  wrapperClassName?: string
  /** Where the logo links to (default: "/") */
  href?: string
  /** Alt text for accessibility */
  alt?: string
}

export function Logo({
  className,
  wrapperClassName,
  href = "/",
  alt = "FlyHigh",
}: LogoProps) {
  return (
    <Link
      to={href}
      className={cn("flex items-center", wrapperClassName)}
    >
      <img
        src="/images/logo.png"
        alt={alt}
        className={cn("h-8 w-auto", className)}
      />
    </Link>
  )
}
