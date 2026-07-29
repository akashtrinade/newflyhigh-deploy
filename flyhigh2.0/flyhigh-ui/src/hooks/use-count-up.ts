import { useEffect, useState } from "react"

type UseCountUpOptions = {
  end: number
  duration?: number
  decimals?: number
  enabled?: boolean
}

export function useCountUp({
  end,
  duration = 2000,
  decimals = 0,
  enabled = true,
}: UseCountUpOptions) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setValue(0)
      return
    }

    let frame = 0
    const startTime = performance.now()

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = eased * end
      setValue(decimals > 0 ? Number(next.toFixed(decimals)) : Math.floor(next))

      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [end, duration, decimals, enabled])

  return value
}
