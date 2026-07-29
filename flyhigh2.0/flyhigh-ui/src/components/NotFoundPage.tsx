import { ArrowRight, Home } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"

export default function NotFoundPage() {
  useEffect(() => {
    document.title = "404 — Page Not Found | FlyHigh"
  }, [])

  return (
    <div className="flex min-h-svh items-center justify-center bg-white px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-[120px] font-black leading-none tracking-tighter text-slate-100 select-none md:text-[160px]">
          404
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
            Page Not Found
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Let&apos;s get you back on track.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            asChild
            className="h-11 gap-2 bg-slate-950 px-6 hover:bg-slate-800"
          >
            <Link to="/">
              <Home className="size-4" />
              Go Home
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 gap-2 border-slate-300 px-6 text-slate-700 hover:bg-white"
          >
            <Link to="/search-experts">
              Find an Expert
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
