import { Suspense, lazy } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/contexts/AuthContext"
import { SocketProvider } from "@/contexts/SocketContext"
import { PaymentSocketProvider } from "@/contexts/PaymentSocketContext"
import { ProtectedRoute } from "@/components/expert/ProtectedRoute"
import { Toaster } from "@/components/ui/toaster"
import { LoadingSpinner } from "@/shared/components"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import DashboardLayout from "@/layouts/DashboardLayout"
import {
  publicRoutes,
  clientRoutes,
  expertRoutes,
  adminRoutes,
  videoCallRoutes,
  legacyRedirects,
  type AppRoute,
} from "@/router/routes"

const NotFoundPage = lazy(() => import("@/components/NotFoundPage"))

// ── Route factory ──

function createRoutes(routes: AppRoute[], wrapWithAuth: boolean) {
  return routes.map(({ path, element: Page, auth }) => {
    const page = (
      <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
        <Page />
      </Suspense>
    )

    if (wrapWithAuth && auth) {
      return (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute
              allowedRoles={auth.allowedRoles}
              requireProfileCompleted={auth.requireProfileCompleted}
            >
              {page}
            </ProtectedRoute>
          }
        />
      )
    }

    return <Route key={path} path={path} element={page} />
  })
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <PaymentSocketProvider>
            <ErrorBoundary>
            <Routes>
              {createRoutes(publicRoutes, false)}
              {createRoutes(legacyRedirects, false)}

              {/* Redirect old expert dashboard URL to new */}
              <Route
                path="/expert-dashboard"
                element={<Navigate to="/expert/dashboard" replace />}
              />

              {/* All protected routes share the DashboardLayout (sidebar + header) */}
              <Route element={<DashboardLayout />}>
                {createRoutes(clientRoutes, true)}
                {createRoutes(expertRoutes, true)}
                {createRoutes(adminRoutes, true)}
              </Route>

              {/* Video call is fullscreen — no sidebar / header */}
              {createRoutes(videoCallRoutes, true)}

              {/* Catch-all 404 — must be last */}
              <Route
                path="*"
                element={
                  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
                    <NotFoundPage />
                  </Suspense>
                }
              />
            </Routes>
            </ErrorBoundary>
          </PaymentSocketProvider>
        </SocketProvider>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
