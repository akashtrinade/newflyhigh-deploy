import { lazy, type ComponentType } from "react"
import { Navigate } from "react-router-dom"

// ── Lazy-load all page-level components for code splitting ──

const HomePage = lazy(() => import("@/components/home/HomePage"))
const AboutUsPage = lazy(() => import("@/components/about/AboutUsPage"))
const PricingPage = lazy(() => import("@/components/pricing/PricingPage"))
const HowItWorksPage = lazy(() => import("@/components/how-it-works/HowItWorksPage"))
const ContactPage = lazy(() => import("@/components/contact/ContactPage"))
const NotFoundPage = lazy(() => import("@/components/NotFoundPage"))
const LoginPage = lazy(() => import("@/components/auth/LoginPage"))
const SignupPage = lazy(() => import("@/components/auth/SignupPage"))
const ForgotPasswordPage = lazy(() => import("@/components/auth/ForgotPasswordPage"))
const ClientDashboard = lazy(() => import("@/components/client/ClientDashboard"))
const SearchExpertsPage = lazy(() => import("@/components/client/SearchExpertsPage"))
const MySessionsPage = lazy(() => import("@/components/client/MySessionsPage"))
const ClientProfilePage = lazy(() => import("@/components/client/ClientProfilePage"))
const ClientSettingsPage = lazy(() => import("@/components/client/ClientSettingsPage"))
const NotificationsPage = lazy(() => import("@/components/client/NotificationsPage"))
const ExpertProfileViewPage = lazy(() => import("@/components/client/ExpertProfileViewPage"))
const ExpertProfileCompletion = lazy(() => import("@/components/expert/ExpertProfileCompletion"))
const ExpertSessionsPage = lazy(() => import("@/components/expert/ExpertSessionsPage"))
const ExpertDashboard = lazy(() => import("@/components/expert/ExpertEarningsPage"))
const ExpertSettingsPage = lazy(() => import("@/components/expert/ExpertSettingsPage"))
const VideoCallPage = lazy(() => import("@/components/video-call/VideoCallPage"))
const CallCompletedPage = lazy(() => import("@/components/video-call/CallCompletedPage"))
const AdminDashboard = lazy(() => import("@/components/admin/AdminDashboard"))
const AdminExperts = lazy(() => import("@/components/admin/AdminExperts"))
const AdminClients = lazy(() => import("@/components/admin/AdminClients"))
const AdminConsultations = lazy(() => import("@/components/admin/AdminConsultations"))
const AdminPayments = lazy(() => import("@/components/admin/AdminPayments"))
const AdminReports = lazy(() => import("@/components/admin/AdminReports"))
const AdminSettings = lazy(() => import("@/components/admin/AdminSettings"))

// ── Route configuration ──

export interface AppRoute {
  path: string
  element: ComponentType<Record<string, never>>
  /** If present, wraps the element in ProtectedRoute with these options */
  auth?: {
    allowedRoles?: string[]
    requireProfileCompleted?: boolean
  }
}

export const publicRoutes: AppRoute[] = [
  { path: "/", element: HomePage },
  { path: "/about", element: AboutUsPage },
  { path: "/pricing", element: PricingPage },
  { path: "/how-it-works", element: HowItWorksPage },
  { path: "/contact", element: ContactPage },
  { path: "/login", element: LoginPage },
  { path: "/signup", element: SignupPage },
  { path: "/forgot-password", element: ForgotPasswordPage },
  { path: "*", element: NotFoundPage },
]

export const clientRoutes: AppRoute[] = [
  { path: "/client-dashboard", element: ClientDashboard, auth: { allowedRoles: ["CLIENT"] } },
  { path: "/search-experts", element: SearchExpertsPage, auth: { allowedRoles: ["CLIENT"] } },
  { path: "/my-sessions", element: MySessionsPage, auth: { allowedRoles: ["CLIENT"] } },
  { path: "/notifications", element: NotificationsPage, auth: { allowedRoles: ["CLIENT", "EXPERT"] } },
  { path: "/client-profile", element: ClientProfilePage, auth: { allowedRoles: ["CLIENT"] } },
  { path: "/settings", element: ClientSettingsPage, auth: { allowedRoles: ["CLIENT"] } },
  { path: "/expert-profile/:expertId", element: ExpertProfileViewPage, auth: { allowedRoles: ["CLIENT"] } },
]

export const expertRoutes: AppRoute[] = [
  // Profile completion: any authenticated user, no profile required
  { path: "/expert/profile", element: ExpertProfileCompletion, auth: {} },
  // Dashboard: earnings overview and session stats
  { path: "/expert/dashboard", element: ExpertDashboard, auth: { requireProfileCompleted: true } },
  // Sessions: full sessions management page
  { path: "/expert/sessions", element: ExpertSessionsPage, auth: { requireProfileCompleted: true } },
  // Settings: security, notifications, account
  { path: "/expert/settings", element: ExpertSettingsPage, auth: { requireProfileCompleted: true } },
]

export const videoCallRoutes: AppRoute[] = [
  { path: "/video-call", element: VideoCallPage, auth: {} },
  { path: "/call-completed", element: CallCompletedPage, auth: {} },
]

// Legacy redirect
export const legacyRedirects: AppRoute[] = [
  { path: "/expert-profile-completion", element: ExpertProfileCompletion },
]

export const adminRoutes: AppRoute[] = [
  { path: "/admin/dashboard", element: AdminDashboard, auth: { allowedRoles: ["ADMIN"] } },
  { path: "/admin/experts", element: AdminExperts, auth: { allowedRoles: ["ADMIN"] } },
  { path: "/admin/clients", element: AdminClients, auth: { allowedRoles: ["ADMIN"] } },
  { path: "/admin/consultations", element: AdminConsultations, auth: { allowedRoles: ["ADMIN"] } },
  { path: "/admin/payments", element: AdminPayments, auth: { allowedRoles: ["ADMIN"] } },
  { path: "/admin/reports", element: AdminReports, auth: { allowedRoles: ["ADMIN"] } },
  { path: "/admin/settings", element: AdminSettings, auth: { allowedRoles: ["ADMIN"] } },
]

// ── Sidebar navigation items (consumed by DashboardLayout + Sidebar) ──

import {
  Bell,
  CalendarCheck,
  DollarSign,
  LayoutDashboard,
  Search,
  Settings,
  UserCircle,
  Users,
  BarChart3,
} from "lucide-react"
import type { SidebarNavItem } from "@/components/layout/Sidebar"

export const clientNavItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/client-dashboard", icon: LayoutDashboard },
  { label: "Search Experts", href: "/search-experts", icon: Search },
  { label: "My Sessions", href: "/my-sessions", icon: CalendarCheck },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Profile", href: "/client-profile", icon: UserCircle },
  { label: "Settings", href: "/settings", icon: Settings },
]

export const expertNavItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/expert/dashboard", icon: LayoutDashboard },
  { label: "My Profile", href: "/expert/profile", icon: UserCircle },
  { label: "Sessions", href: "/expert/sessions", icon: CalendarCheck },
  { label: "Settings", href: "/expert/settings", icon: Settings },
]

export const adminNavItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Experts", href: "/admin/experts", icon: Users },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Consultations", href: "/admin/consultations", icon: CalendarCheck },
  { label: "Payments", href: "/admin/payments", icon: DollarSign },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
]
