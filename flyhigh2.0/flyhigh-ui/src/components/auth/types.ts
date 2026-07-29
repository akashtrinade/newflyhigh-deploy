// Re-exports from centralized types — backward-compatible
export type {
  Role,
  AccountType,
  LoginFormData,
  SignupFormData,
  FormErrors,
  AuthResponse,
  MessageResponse,
} from "@/types/auth"

// Legacy-only type — specific to auth components
export interface ExpertProfileData {
  professionalTitle: string
  category: string
  yearsOfExperience: string
  bio: string
  hourlyRate: string
  phoneNumber: string
  languages: string
  linkedIn: string
  portfolio: string
  github: string
}
