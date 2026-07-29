import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSubmit?: (value: string) => void
  /** Show a submit button */
  showButton?: boolean
  buttonLabel?: string
  className?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  onSubmit,
  showButton = false,
  buttonLabel = "Search",
  className,
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(value)
  }

  const input = (
    <div className="flex flex-1 items-center gap-2 px-3">
      <Search className="size-4 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
    </div>
  )

  if (showButton || onSubmit) {
    return (
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1 focus-within:border-slate-400",
          className,
        )}
      >
        {input}
        <Button type="submit" className="h-11 rounded-md bg-slate-950 px-5 hover:bg-slate-800">
          {buttonLabel}
        </Button>
      </form>
    )
  }

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1 focus-within:border-slate-400",
        className,
      )}
    >
      {input}
    </div>
  )
}
