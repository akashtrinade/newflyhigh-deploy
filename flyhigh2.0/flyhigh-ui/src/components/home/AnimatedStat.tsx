import { useInView } from "@/hooks/use-in-view"
import { useCountUp } from "@/hooks/use-count-up"

type AnimatedStatProps = {
  numeric: number
  suffix?: string
  prefix?: string
  decimals?: number
  className?: string
}

function formatNumber(value: number, decimals: number) {
  if (decimals > 0) return value.toFixed(decimals)
  return value.toLocaleString("en-IN")
}

export function AnimatedStat({
  numeric,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: AnimatedStatProps) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.3 })
  const count = useCountUp({
    end: numeric,
    decimals,
    enabled: inView,
    duration: 2200,
  })

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatNumber(count, decimals)}
      {suffix}
    </span>
  )
}
