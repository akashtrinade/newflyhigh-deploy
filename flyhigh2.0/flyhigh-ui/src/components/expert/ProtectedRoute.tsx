import { useEffect, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/shared/components"

interface ProtectedRouteProps {
  children: ReactNode
  /** If true, only allows experts with completed profiles */
  requireProfileCompleted?: boolean
  /** Optional role gate for client/expert-only pages */
  allowedRoles?: string[]
}

export function ProtectedRoute({
  children,
  requireProfileCompleted = false,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    // 1. Not logged in → redirect to login
    if (!user) {
      navigate("/login", { replace: true })
      return
    }

    // 2. Role gate
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = user.role?.toUpperCase()
      const allowed = allowedRoles.map((r) => r.toUpperCase())
      if (!allowed.includes(userRole)) {
        const fallback = user.role === "EXPERT" ? "/expert/dashboard" : "/"
        navigate(fallback, { replace: true })
        return
      }
    }

    // 3. Expert profile completion gate
    if (
      user.role === "EXPERT" &&
      !user.profileCompleted &&
      requireProfileCompleted
    ) {
      toast({
        title: "Profile Required",
        description:
          "Please complete your expert profile before accessing the dashboard.",
        variant: "destructive",
      })
      navigate("/expert/profile", { replace: true })
    }
  }, [user, loading, navigate, allowedRoles, requireProfileCompleted])

  // Loading state
  if (loading) {
    return <LoadingSpinner message="Loading..." />
  }

  // Not logged in — render nothing while redirecting
  if (!user) return null

  return <>{children}</>
}
