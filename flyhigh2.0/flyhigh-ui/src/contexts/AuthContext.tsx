import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
import { axiosInstance } from "@/api/client"
import type { AuthUser } from "@/types/auth"

export type { AuthUser } from "@/types/auth"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      await axiosInstance.post("/auth/refresh")

      const { data } = await axiosInstance.get<AuthUser>("/auth/me")
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/auth/logout")
    } catch {
      // Ignore errors
    }
    setUser(null)
  }, [])

  // Memoized: only changes when user or loading actually change,
  // preventing cascading re-renders of all useAuth() consumers.
  const value = useMemo(
    () => ({ user, loading, setUser, logout, refreshUser }),
    [user, loading, setUser, logout, refreshUser],
  )

  // React 19: simplified Context — no .Provider needed
  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
