import type { ReactNode } from "react"

import { useInView } from "@/hooks/use-in-view"
import { cn } from "@/lib/utils"

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  direction?: "up" | "down" | "left" | "right" | "none"
  blur?: boolean
}

const directionMap = {
  up: "translate-y-10",
  down: "-translate-y-10",
  left: "translate-x-10",
  right: "-translate-x-10",
  none: "",
}

export function Reveal({
  children,
  className,
  delay = 0,
  duration = 700,
  direction = "up",
  blur = false,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all ease-out will-change-[transform,opacity,filter]",
        inView
          ? "translate-x-0 translate-y-0 opacity-100 blur-0"
          : cn("opacity-0", directionMap[direction], blur && "blur-sm"),
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

type StaggerProps = {
  children: ReactNode
  className?: string
  stagger?: number
  baseDelay?: number
}

export function Stagger({
  children,
  className,
  stagger = 100,
  baseDelay = 0,
}: StaggerProps) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={index}
              className={cn(
                "transition-all duration-700 ease-out will-change-[transform,opacity]",
                inView
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              )}
              style={{
                transitionDelay: `${baseDelay + index * stagger}ms`,
              }}
            >
              {child}
            </div>
          ))
        : children}
    </div>
  )
}
