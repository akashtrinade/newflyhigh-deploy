import { Button } from "@/components/ui/button"

interface AdminPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** "centered" for compact tables, "justify-between" for the bordered page footer */
  layout?: "centered" | "justify-between"
}

export function AdminPagination({
  page,
  totalPages,
  onPageChange,
  layout = "centered",
}: AdminPaginationProps) {
  if (totalPages <= 1) return null

  if (layout === "justify-between") {
    return (
      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-500">
          Page {page + 1} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-slate-500">
        Page {page + 1} of {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </div>
  )
}
