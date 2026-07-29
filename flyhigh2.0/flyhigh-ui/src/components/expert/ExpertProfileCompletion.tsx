import { useEffect, useRef, useState, type ElementType, type InputHTMLAttributes, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  User,
  Briefcase,
  FileText,
  Globe,
  ChevronDown,
  X,
  Sparkles,
  ShieldCheck,
  Phone,
  MapPin,
  GraduationCap,
  Tag,
  Clock,
  Languages,
  PenLine,
  Link2,
  Info,
  Lock,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/hooks/use-toast"
import {
  buildDropdownFieldMap,
  fetchExpertProfile,
  fetchExpertProfileDropdowns,
  saveExpertProfile,
  type DropdownField,
  type ExpertProfileResponse,
} from "@/lib/expert-profile"

const CUSTOM_SUBCATEGORY_VALUE = "__custom_subcategory__"

interface FormData {
  firstName: string
  lastName: string
  phoneNumber: string
  city: string
  country: string
  professionalTitle: string
  category: string
  subCategories: string[]
  customSubCategory: string
  yearsOfExperience: string
  languages: string[]
  bio: string
  hourlyRate: string
  linkedIn: string
  portfolio: string
  github: string
}

interface SelectOption {
  value: string
  label: string
}

const INITIAL_FORM: FormData = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  city: "",
  country: "",
  professionalTitle: "",
  category: "",
  subCategories: [],
  customSubCategory: "",
  yearsOfExperience: "",
  languages: [],
  bio: "",
  hourlyRate: "",
  linkedIn: "",
  portfolio: "",
  github: "",
}

const BIO_GUIDELINES = [
  "Start with a brief introduction about yourself",
  "Highlight your professional expertise & certifications",
  "Describe your approach to consultations",
  "Mention years of experience & notable achievements",
  "Specify industries or problems you specialize in",
  "End with how clients benefit from working with you",
]

function normalizeText(value?: string | null) {
  return value?.trim() ?? ""
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function toNullable(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function resolveSubCategoryValue(data: FormData): string {
  if (data.subCategories.includes(CUSTOM_SUBCATEGORY_VALUE) && data.customSubCategory.trim()) {
    return data.customSubCategory.trim()
  }
  return data.subCategories.filter(v => v !== CUSTOM_SUBCATEGORY_VALUE).join(", ")
}

function resolveCategoryValue(data: FormData): string {
  return data.category.trim()
}


function calculateProgress(data: FormData) {
  let filled = 0
  const total = 11

  if (data.firstName.trim()) filled += 1
  if (data.lastName.trim()) filled += 1
  if (data.phoneNumber.trim()) filled += 1
  if (data.country.trim()) filled += 1
  if (data.professionalTitle.trim()) filled += 1
  if (data.category.trim()) filled += 1
  if (resolveSubCategoryValue(data)) filled += 1
  if (data.yearsOfExperience && Number(data.yearsOfExperience) >= 0) filled += 1
  if (data.languages.length > 0) filled += 1
  if (data.bio.trim().length >= 20) filled += 1
  if (data.hourlyRate && Number(data.hourlyRate) > 0) filled += 1

  return Math.round((filled / total) * 100)
}

function mapFieldOptions(field?: DropdownField) {
  return (field?.options ?? []).map((option) => ({
    value: option.value,
    label: option.label,
  }))
}

function appendMissingOptions(options: SelectOption[], values: string[]) {
  const merged = [...options]

  values.filter(Boolean).forEach((value) => {
    if (!merged.some((option) => option.value === value)) {
      merged.push({ value, label: value })
    }
  })

  return merged
}

function getSubCategoryOptions(field: DropdownField | undefined, categoryCsv: string, savedValue: string) {
  const selectedCategories = categoryCsv
    ? categoryCsv.split(",").map(s => s.trim()).filter(Boolean)
    : []

  const filtered = (field?.options ?? [])
    .filter((option) => selectedCategories.length === 0 || selectedCategories.includes(option.parentValue ?? ""))
    .map((option) => ({ value: option.value, label: option.label }))

  return appendMissingOptions(filtered, savedValue ? [savedValue] : [])
}

function buildFormData(
  userFirstName: string,
  userLastName: string,
  profile: ExpertProfileResponse,
  fields: Record<string, DropdownField>,
): FormData {
  const rawCategory = normalizeText(profile.category)
  const rawSubCategory = normalizeText(profile.subCategory)

  // Parse comma-separated values from backend
    const category = rawCategory
  const subCategories = rawSubCategory
    ? rawSubCategory.split(",").map(s => s.trim()).filter(Boolean)
    : []

  // Check if any sub-category is a custom value (not in the dropdown)
  const subCategoryOptions = getSubCategoryOptions(fields.subCategory, rawCategory || "", rawSubCategory)
  const hasKnownSubCategories = subCategories.some(v =>
    subCategoryOptions.some(opt => opt.value === v)
  )
  const hasCustomSubCategories = subCategories.some(v =>
    !subCategoryOptions.some(opt => opt.value === v)
  )

  // If there are custom sub-categories, include the CUSTOM flag
  const finalSubCategories: string[] = []
  for (const sc of subCategories) {
    if (subCategoryOptions.some(opt => opt.value === sc)) {
      finalSubCategories.push(sc)
    }
  }
  if (hasCustomSubCategories) {
    finalSubCategories.push(CUSTOM_SUBCATEGORY_VALUE)
  }

  const customSubCategoryValue = rawSubCategory && !hasKnownSubCategories
    ? rawSubCategory
    : (hasCustomSubCategories
      ? subCategories.filter(v => !subCategoryOptions.some(opt => opt.value === v)).join(", ")
      : "")

  return {
    firstName: normalizeText(profile.firstName) || userFirstName,
    lastName: normalizeText(profile.lastName) || userLastName,
        phoneNumber: normalizeText(profile.phoneNumber),
    city: normalizeText(profile.city),
    country: normalizeText(profile.country),
    professionalTitle: normalizeText(profile.professionalTitle),
    category,
    subCategories: finalSubCategories,
    customSubCategory: customSubCategoryValue,
    yearsOfExperience:
      profile.yearsOfExperience === null || profile.yearsOfExperience === undefined
        ? ""
        : String(profile.yearsOfExperience),
    languages: uniqueValues(profile.languages ?? []),
    bio: normalizeText(profile.bio),
    hourlyRate:
      profile.hourlyRate === null || profile.hourlyRate === undefined
        ? ""
        : String(profile.hourlyRate),
    linkedIn: normalizeText(profile.linkedIn),
    portfolio: normalizeText(profile.portfolio),
    github: normalizeText(profile.github),
  }
}

function SectionBadge({
  icon: Icon,
  label,
  gradient,
}: {
  icon: ElementType
  label: string
  gradient: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
        <Icon className="size-5 text-white" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{label}</h3>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  required = false,
  icon: Icon,
  hint,
  inputProps,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  type?: string
  required?: boolean
  icon?: ElementType
  hint?: string
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "placeholder" | "type">
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-700 uppercase">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 backdrop-blur-sm ${
          error
            ? "border-red-300 ring-2 ring-red-100"
            : "border-slate-200 shadow-sm hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        }`}
        {...inputProps}
      />
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-xs font-medium text-red-500"
          >
            <AlertCircle className="size-3" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  required = false,
  disabled = false,
  icon: Icon,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  icon?: ElementType
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-700 uppercase">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl border bg-white/80 px-4 py-3 pr-10 text-sm text-slate-800 outline-none transition-all duration-200 backdrop-blur-sm ${
            error
              ? "border-red-300 ring-2 ring-red-100"
              : "border-slate-200 shadow-sm hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          } ${!value ? "text-slate-400" : ""} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <option value="" disabled>
            {placeholder || "Select..."}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-slate-800">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-xs font-medium text-red-500"
          >
            <AlertCircle className="size-3" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function MultiSelectField({
  label,
  selectedValues,
  onChange,
  options,
  placeholder,
  error,
  required = false,
  disabled = false,
  icon: Icon,
}: {
  label: string
  selectedValues: string[]
  onChange: (values: string[]) => void
  options: SelectOption[]
  placeholder?: string
  error?: string
  required?: boolean
  disabled?: boolean
  icon?: ElementType
}) {
  const [isOpen, setIsOpen] = useState(false)
  const availableOptions = appendMissingOptions(options, selectedValues)

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value))
      return
    }
    onChange([...selectedValues, value])
  }

  const removeOption = (value: string) => {
    onChange(selectedValues.filter((item) => item !== value))
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-700 uppercase">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen((previous) => !previous)}
          disabled={disabled}
          className={`flex w-full items-center justify-between rounded-xl border bg-white/80 px-4 py-3 text-left text-sm transition-all duration-200 backdrop-blur-sm ${
            disabled
              ? "cursor-not-allowed opacity-60 border-slate-200"
              : selectedValues.length === 0
                ? "border-slate-200 text-slate-400 hover:border-slate-300"
                : "border-blue-200 bg-blue-50/50 text-slate-800"
          } shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
        >
          <span className="flex items-center gap-2">
            {selectedValues.length === 0 ? (
              placeholder || "Select..."
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="size-4 text-blue-500" />
                {selectedValues.length} item{selectedValues.length > 1 ? "s" : ""} selected
              </span>
            )}
          </span>
          <ChevronDown className={`size-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop to close dropdown when clicking outside */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                {availableOptions.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-slate-400">
                    No options available
                  </p>
                )}
                {availableOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value)

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                        isSelected
                          ? "bg-blue-50 font-medium text-blue-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <div className={`flex size-5 items-center justify-center rounded-md border-2 transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-slate-300 bg-white"
                      }`}>
                        {isSelected && <CheckCircle className="size-3.5" />}
                      </div>
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-xs font-medium text-red-500"
          >
            <AlertCircle className="size-3" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
      {selectedValues.length > 0 && (
        <motion.div layout className="mt-2 flex flex-wrap gap-1.5">
          {selectedValues.map((value) => (
            <motion.span
              key={value}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm"
            >
              {value}
              <button
                type="button"
                onClick={() => removeOption(value)}
                className="ml-0.5 rounded-full p-0.5 text-blue-400 transition-colors hover:bg-blue-200 hover:text-blue-700"
              >
                <X className="size-3" />
              </button>
            </motion.span>
          ))}
        </motion.div>
      )}
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  error,
  rows = 4,
  required = false,
  icon: Icon,
  showInfoTooltip = false,
  tooltipContent,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  rows?: number
  required?: boolean
  icon?: ElementType
  showInfoTooltip?: boolean
  tooltipContent?: ReactNode
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-700 uppercase">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="relative">
        <textarea
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border bg-white/80 px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 resize-none backdrop-blur-sm ${
            error
              ? "border-red-300 ring-2 ring-red-100"
              : "border-slate-200 shadow-sm hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          }`}
        />
        {showInfoTooltip && (
          <div
            className="absolute right-2 top-2"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div className="flex size-6 cursor-help items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-blue-100 hover:text-blue-500">
              <Info className="size-3.5" />
            </div>
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-8 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
                >
                  {tooltipContent}
                  {/* Arrow */}
                  <div className="absolute -top-1.5 right-3 size-3 rotate-45 border-l border-t border-slate-200 bg-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-xs font-medium text-red-500"
          >
            <AlertCircle className="size-3" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function LanguageSelector({
  options,
  selected,
  onChange,
}: {
  options: SelectOption[]
  selected: string[]
  onChange: (languages: string[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const availableOptions = appendMissingOptions(options, selected)

  const toggleLanguage = (language: string) => {
    if (selected.includes(language)) {
      onChange(selected.filter((item) => item !== language))
      return
    }

    onChange([...selected, language])
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-700 uppercase">
        <Languages className="size-3.5 text-slate-400" />
        Languages Spoken
        <span className="ml-0.5 text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((previous) => !previous)}
          className={`flex w-full items-center justify-between rounded-xl border bg-white/80 px-4 py-3 text-left text-sm transition-all duration-200 backdrop-blur-sm ${
            selected.length === 0
              ? "border-slate-200 text-slate-400 hover:border-slate-300"
              : "border-blue-200 bg-blue-50/50 text-slate-800"
          } shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
        >
          <span className="flex items-center gap-2">
            {selected.length === 0 ? (
              "Select languages..."
            ) : (
              <span className="flex items-center gap-2">
                <Globe className="size-4 text-blue-500" />
                {selected.length} language{selected.length > 1 ? "s" : ""} selected
              </span>
            )}
          </span>
          <ChevronDown className={`size-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop to close dropdown when clicking outside */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                {availableOptions.map((option) => {
                  const isSelected = selected.includes(option.value)

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleLanguage(option.value)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                        isSelected
                          ? "bg-blue-50 font-medium text-blue-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <div className={`flex size-5 items-center justify-center rounded-md border-2 transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-slate-300 bg-white"
                      }`}>
                        {isSelected && <CheckCircle className="size-3.5" />}
                      </div>
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      {selected.length > 0 && (
        <motion.div layout className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((language) => (
            <motion.span
              key={language}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm"
            >
              {language}
              <button
                type="button"
                onClick={() => toggleLanguage(language)}
                className="ml-0.5 rounded-full p-0.5 text-blue-400 transition-colors hover:bg-blue-200 hover:text-blue-700"
              >
                <X className="size-3" />
              </button>
            </motion.span>
          ))}
        </motion.div>
      )}
    </div>
  )
}

function FormSection({
  icon,
  title,
  gradient,
  children,
  delay = 0,
}: {
  icon: ElementType
  title: string
  gradient: string
  children: ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <Card className="overflow-visible border-slate-200 shadow-sm transition-shadow duration-300 hover:shadow-md">
        <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
        <CardHeader className="pb-4 pt-5">
          <CardTitle>
            <SectionBadge icon={icon} label={title} gradient={gradient} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">{children}</CardContent>
      </Card>
    </motion.div>
  )
}

export default function ExpertProfileCompletion() {
  const navigate = useNavigate()
  const { user, refreshUser, loading: authLoading } = useAuth()

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [dropdownFields, setDropdownFields] = useState<Record<string, DropdownField>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [profileExists, setProfileExists] = useState(false)
  const [lastRateUpdatedAt, setLastRateUpdatedAt] = useState<string | null>(null)
  const [originalHourlyRate, setOriginalHourlyRate] = useState<number | null>(null)

  // ── Rate-change cooldown (verified by backend; frontend mirrors it for UX) ──
  const RATE_COOLDOWN_DAYS = 14
  const now = new Date()
  const lastRateUpdate = lastRateUpdatedAt ? new Date(lastRateUpdatedAt) : null
  const nextAllowedDate = lastRateUpdate
    ? new Date(lastRateUpdate.getTime() + RATE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
    : null
  const canUpdateRate = !nextAllowedDate || now >= nextAllowedDate
  const daysUntilNextUpdate = nextAllowedDate && !canUpdateRate
    ? Math.max(1, Math.ceil((nextAllowedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      setIsBootstrapping(false)
      return
    }

    let cancelled = false

    const loadProfileForm = async () => {
      setIsBootstrapping(true)
      setPageError(null)

      try {
        const [catalog, profile] = await Promise.all([
          fetchExpertProfileDropdowns(),
          fetchExpertProfile(),
        ])

        if (cancelled) {
          return
        }

        const fieldMap = buildDropdownFieldMap(catalog.fields)
        // Convert Map to plain object — dot-notation access (e.g. dropdownFields.country)
        // does not work on Map instances at runtime.
        const fieldsObject: Record<string, DropdownField> = Object.fromEntries(fieldMap)
        setDropdownFields(fieldsObject)
        setFormData(buildFormData(user.firstName || "", user.lastName || "", profile, fieldsObject))
        setProfileExists(Boolean(profile.profileExists))
        setLastRateUpdatedAt(profile.lastRateUpdatedAt ?? null)
        setOriginalHourlyRate(profile.hourlyRate ?? null)
      } catch (error) {
        if (!cancelled) {
          setPageError(
            error instanceof Error ? error.message : "Failed to load profile form.",
          )
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false)
        }
      }
    }

    void loadProfileForm()

    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  const updateField = <Field extends keyof FormData>(field: Field, value: FormData[Field]) => {
    setFormData((previous) => {
      const next = { ...previous, [field]: value }

            if (field === "category") {
        next.subCategories = []
        next.customSubCategory = ""
      }

      if (field === "subCategories" && !(Array.isArray(value) && (value as string[]).includes(CUSTOM_SUBCATEGORY_VALUE))) {
        next.customSubCategory = ""
      }

      return next
    })

    if (errors[field]) {
      setErrors((previous) => {
        const next = { ...previous }
        delete next[field]
        return next
      })
    }

    if (field === "subCategories" && errors.customSubCategory) {
      setErrors((previous) => {
        const next = { ...previous }
        delete next.customSubCategory
        return next
      })
    }
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    const resolvedSubCategory = resolveSubCategoryValue(formData)

    if (!formData.firstName.trim()) nextErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) nextErrors.lastName = "Last name is required"
    if (!formData.phoneNumber.trim() || formData.phoneNumber.trim().length < 7) {
      nextErrors.phoneNumber = "Enter a valid phone number"
    }
    if (!formData.country.trim()) nextErrors.country = "Country is required"
    if (!formData.professionalTitle.trim()) {
      nextErrors.professionalTitle = "Professional title is required"
    }
    if (!formData.category.trim()) nextErrors.category = "Select a category"
    if (!resolvedSubCategory) {
      nextErrors.subCategories = "Select or enter a sub category"
    }
    if (!formData.yearsOfExperience || Number(formData.yearsOfExperience) < 0) {
      nextErrors.yearsOfExperience = "Enter valid years of experience"
    }
    if (formData.languages.length === 0) {
      nextErrors.languages = "Select at least one language"
    }
    if (!formData.bio.trim() || formData.bio.trim().length < 20) {
      nextErrors.bio = "Bio must be at least 20 characters"
    }
    if (!formData.hourlyRate || Number(formData.hourlyRate) <= 0) {
      nextErrors.hourlyRate = "Enter a valid hourly rate"
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const progress = calculateProgress(formData)
  const isComplete = progress === 100
  const isEditMode = profileExists || Boolean(user?.profileCompleted)

  const countryOptions = appendMissingOptions(
    mapFieldOptions(dropdownFields.country),
    formData.country ? [formData.country] : [],
  )



    const categoryOptions = appendMissingOptions(
    mapFieldOptions(dropdownFields.category),
    formData.category ? [formData.category] : [],
  )
    const rawSubCategoryOptions = getSubCategoryOptions(
    dropdownFields.subCategory,
    formData.category,
    formData.subCategories.filter(v => v !== CUSTOM_SUBCATEGORY_VALUE).join(", "),
  )
  const subCategoryOptions = dropdownFields.subCategory?.allowCustom
    ? [
        ...rawSubCategoryOptions,
        { value: CUSTOM_SUBCATEGORY_VALUE, label: "Other (enter custom value)" },
      ]
    : rawSubCategoryOptions
  const languageOptions = appendMissingOptions(
    mapFieldOptions(dropdownFields.languages),
    formData.languages,
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setApiError(null)

    if (!validate()) {
      return
    }

    // ── Frontend rate-lock guard ──
    // Prevent API submission if the hourly rate has changed while the cooldown is active.
    // The backend is the ultimate enforcer; this is a UX guard to catch edits via DevTools.
    const currentRate = Number(formData.hourlyRate)
    if (!canUpdateRate && isEditMode && originalHourlyRate !== null && currentRate !== originalHourlyRate) {
      setApiError(
        "You can update your hourly consultation rate again after " + RATE_COOLDOWN_DAYS + " days.",
      )
      return
    }

    const resolvedSubCategory = resolveSubCategoryValue(formData)
    const submittingAsEdit = isEditMode
    const wasRateChanged = isEditMode && originalHourlyRate !== null && currentRate !== originalHourlyRate

    setIsSaving(true)

    try {
      await saveExpertProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        country: formData.country.trim(),
        professionalTitle: formData.professionalTitle.trim(),
        category: resolveCategoryValue(formData),
        subCategory: resolvedSubCategory,
        yearsOfExperience: Number(formData.yearsOfExperience),
        bio: formData.bio.trim(),
        hourlyRate: Number(formData.hourlyRate),
        phoneNumber: formData.phoneNumber.trim(),
        city: toNullable(formData.city),
        languages: uniqueValues(formData.languages),
        linkedIn: toNullable(formData.linkedIn),
        portfolio: toNullable(formData.portfolio),
        github: toNullable(formData.github),
      })

      await refreshUser()
      setProfileExists(true)

      // Immediately lock the rate field if the rate was changed — no page refresh needed.
      if (wasRateChanged) {
        const now = new Date().toISOString()
        setLastRateUpdatedAt(now)
        setOriginalHourlyRate(Number(formData.hourlyRate))
        toast({
          title: "Hourly Rate Updated!",
          description:
            "Your hourly consultation rate has been updated successfully. You can change it again after " +
            RATE_COOLDOWN_DAYS +
            " days.",
          variant: "success",
        })
      } else {
        toast({
          title: submittingAsEdit ? "Profile Updated!" : "Profile Completed!",
          description: submittingAsEdit
            ? "Your expert profile has been updated successfully."
            : "Your expert profile has been saved successfully.",
          variant: "success",
        })
      }

      if (!submittingAsEdit) {
        setSuccess(true)
        setTimeout(() => navigate("/expert/dashboard"), 1500)
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  if (success) {
    return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 shadow-xl shadow-emerald-200/50 ring-4 ring-emerald-50"
          >
            <CheckCircle className="size-12 text-white" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 space-y-2"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-800">
              Profile Completed!
            </h2>
            <p className="text-sm text-slate-500">
              Redirecting to your dashboard...
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Loader2 className="size-6 animate-spin text-blue-500" />
          </motion.div>
        </div>
    )
  }

  if (authLoading || isBootstrapping) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="size-8 animate-spin text-blue-500" />
            <p className="text-sm text-slate-500">Loading your profile form...</p>
          </div>
        </div>
    )
  }

  if (pageError) {
    return (
        <div className="mx-auto max-w-2xl">
          <Card className="border-red-200 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                <AlertCircle className="size-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-800">Profile form unavailable</h2>
                <p className="text-sm text-slate-500">{pageError}</p>
              </div>
            </CardContent>
          </Card>
        </div>
    )
  }

  return (
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 shadow-xl"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 size-48 rounded-full bg-gradient-to-tr from-emerald-400/20 to-teal-400/20 blur-3xl" />
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/20 shadow-lg backdrop-blur-sm">
                <Sparkles className="size-4 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                {isEditMode ? "Profile Settings" : "Getting Started"}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {isEditMode ? "Edit Your Profile" : "Complete Your Expert Profile"}
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-blue-100">
              {isEditMode
                ? "Update your professional details and keep your profile information current."
                : "Set up your professional presence to start offering consultations."}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pb-5 pt-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-blue-500" />
                  <span className="text-sm font-semibold text-slate-700">Profile Completion</span>
                </div>
                <motion.span
                  key={progress}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className={`text-lg font-bold tabular-nums ${
                    isComplete ? "text-emerald-600" : progress > 50 ? "text-blue-600" : "text-amber-600"
                  }`}
                >
                  {progress}%
                </motion.span>
              </div>
              <Progress value={progress} className="h-3 rounded-full bg-slate-100" />
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>{11 - Math.round((progress / 100) * 11)} required fields remaining</span>
                {isComplete && (
                  <span className="flex items-center gap-1 font-medium text-emerald-600">
                    <CheckCircle className="size-3.5" /> All set!
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 px-5 py-4 text-sm text-red-700 shadow-sm"
            >
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">Failed to save profile</p>
                <p className="mt-0.5 text-red-600/80">{apiError}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSection icon={User} title="Personal Information" gradient="from-blue-500 to-indigo-500" delay={0.1}>
            <p className="-mt-1 text-sm text-slate-500">Basic details for clients to know you better</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="First Name"
                value={formData.firstName}
                onChange={(value) => updateField("firstName", value)}
                placeholder="John"
                error={errors.firstName}
                required
                icon={User}
              />
              <InputField
                label="Last Name"
                value={formData.lastName}
                onChange={(value) => updateField("lastName", value)}
                placeholder="Doe"
                error={errors.lastName}
                required
                icon={User}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Phone Number"
                value={formData.phoneNumber}
                onChange={(value) => updateField("phoneNumber", value)}
                placeholder="+1-555-555-5555"
                error={errors.phoneNumber}
                type="tel"
                required
                icon={Phone}
              />
              <InputField
                label="City"
                value={formData.city}
                onChange={(value) => updateField("city", value)}
                placeholder="e.g., Mumbai"
                icon={MapPin}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Country"
                value={formData.country}
                onChange={(value) => updateField("country", value)}
                options={countryOptions}
                placeholder={dropdownFields.country?.placeholder || "Select your country"}
                error={errors.country}
                required
                icon={MapPin}
              />
            </div>
          </FormSection>

          <FormSection icon={Briefcase} title="Professional Information" gradient="from-violet-500 to-purple-500" delay={0.15}>
            <p className="-mt-1 text-sm text-slate-500">Your expertise and experience areas</p>
            <InputField
              label="Professional Title"
              value={formData.professionalTitle}
              onChange={(value) => updateField("professionalTitle", value)}
              placeholder="e.g., Senior Software Engineer"
                          error={errors.professionalTitle}
                          required
                          icon={Tag}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <SelectField
                            label="Expertise Category"
                            value={formData.category}
                            onChange={(value) => updateField("category", value)}
                            options={categoryOptions}
                            placeholder={dropdownFields.category?.placeholder || "Select a category"}
                            error={errors.category}
                            required
                            icon={GraduationCap}
                          />
                          <InputField
                label="Years of Experience"
                value={formData.yearsOfExperience}
                onChange={(value) => updateField("yearsOfExperience", value)}
                placeholder="5"
                type="number"
                error={errors.yearsOfExperience}
                required
                icon={Clock}
                inputProps={{ min: "0" }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <MultiSelectField
                label="Sub Category"
                selectedValues={formData.subCategories}
                onChange={(values) => updateField("subCategories", values)}
                options={subCategoryOptions}
                placeholder={


                                    formData.category
                    ? dropdownFields.subCategory?.placeholder || "Select sub categories"
                    : "Select a category first"
                }
                required
                disabled={!formData.category}
                icon={Tag}
              />
              {formData.subCategories.includes(CUSTOM_SUBCATEGORY_VALUE) ? (
                <InputField
                  label="Custom Sub Category"
                  value={formData.customSubCategory}
                  onChange={(value) => updateField("customSubCategory", value)}
                  placeholder="Enter your expertise"
                  error={errors.customSubCategory || errors.subCategories}
                  required
                  icon={Tag}
                  hint="Your custom value will be saved for this category."
                />
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>
            <LanguageSelector
              options={languageOptions}
              selected={formData.languages}
              onChange={(languages) => updateField("languages", uniqueValues(languages))}
            />
            <AnimatePresence>
              {errors.languages && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-xs font-medium text-red-500"
                >
                  <AlertCircle className="size-3" /> {errors.languages}
                </motion.p>
              )}
            </AnimatePresence>
          </FormSection>

          <FormSection icon={PenLine} title="Professional Bio" gradient="from-emerald-500 to-teal-500" delay={0.2}>
            <p className="-mt-1 text-sm text-slate-500">Tell clients about your expertise and what you can help them with</p>
            <TextAreaField
              label="Bio"
              value={formData.bio}
              onChange={(value) => updateField("bio", value)}
              placeholder="I specialize in helping startups scale their technology infrastructure..."
              error={errors.bio}
              rows={5}
              required
              icon={FileText}
              showInfoTooltip
              tooltipContent={
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-800">Tips for a Great Bio:</p>
                  <ol className="list-inside list-decimal space-y-1.5 text-xs text-slate-600">
                    {BIO_GUIDELINES.map((guideline, index) => (
                      <li key={index}>{guideline}</li>
                    ))}
                  </ol>
                </div>
              }
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Minimum 20 characters</span>
              <span
                className={`text-xs font-medium tabular-nums ${
                  formData.bio.length >= 20 ? "text-emerald-600" : "text-amber-500"
                }`}
              >
                {formData.bio.length} / 20
              </span>
            </div>
          </FormSection>

          <FormSection icon={PenLine} title="Consultation Pricing" gradient="from-amber-500 to-orange-500" delay={0.25}>
            <p className="-mt-1 text-sm text-slate-500">Set your hourly consultation rate</p>
            <div className="max-w-xs">
              <InputField
                label="Hourly Rate (₹/hour)"
                value={formData.hourlyRate}
                onChange={(value) => updateField("hourlyRate", value)}
                placeholder="500"
                type="number"
                error={errors.hourlyRate}
                required
                icon={Tag}
                hint={canUpdateRate ? "You can update your hourly consultation rate once every 14 days." : undefined}
                inputProps={{
                  min: "0.01",
                  step: "0.01",
                  disabled: !canUpdateRate && isEditMode,
                }}
              />
              {/* Rate-change cooldown info */}
              {!canUpdateRate && isEditMode ? (
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                      <Lock className="size-4 shrink-0" />
                      Hourly rate is locked
                    </p>
                    <p className="mt-1.5 pl-6 text-xs text-amber-700">
                      You can update your hourly rate again in{" "}
                      <span className="font-bold">{daysUntilNextUpdate} day{daysUntilNextUpdate !== 1 ? "s" : ""}</span>.
                    </p>
                    {nextAllowedDate && (
                      <p className="mt-0.5 pl-6 text-xs text-amber-600">
                        Next update available on{" "}
                        {nextAllowedDate.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ) : isEditMode && lastRateUpdatedAt ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                  <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                  You can update your hourly rate today.
                </p>
              ) : !isEditMode && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs text-blue-700">
                    <Info className="size-4 shrink-0" />
                    Your consultation price can only be updated once every {RATE_COOLDOWN_DAYS} days to maintain pricing consistency for clients.
                  </p>
                </div>
              )}
            </div>
          </FormSection>

          <FormSection icon={Link2} title="Profile Links" gradient="from-sky-500 to-cyan-500" delay={0.3}>
            <p className="-mt-1 text-sm text-slate-500">Add optional links to help clients learn more about you</p>
            <div className="grid gap-4">
              <InputField
                label="LinkedIn"
                value={formData.linkedIn}
                onChange={(value) => updateField("linkedIn", value)}
                placeholder="https://www.linkedin.com/in/your-profile"
                type="url"
                icon={Link2}
              />
              <InputField
                label="Portfolio"
                value={formData.portfolio}
                onChange={(value) => updateField("portfolio", value)}
                placeholder="https://yourportfolio.com"
                type="url"
                icon={Link2}
              />
              <InputField
                label="GitHub"
                value={formData.github}
                onChange={(value) => updateField("github", value)}
                placeholder="https://github.com/your-handle"
                type="url"
                icon={Link2}
              />
            </div>
          </FormSection>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500" />
              <CardContent className="px-6 py-5">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex size-12 items-center justify-center rounded-full ${
                        isComplete
                          ? "bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-600 ring-4 ring-emerald-50"
                          : "bg-gradient-to-br from-amber-100 to-orange-50 text-amber-600 ring-4 ring-amber-50"
                      }`}
                    >
                      {isComplete ? <CheckCircle className="size-6" /> : <AlertCircle className="size-6" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {isComplete ? "Ready to launch!" : `${100 - progress}% remaining`}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {isComplete
                          ? "All required fields are filled. Save to publish your latest profile details."
                          : "Fill in all required fields highlighted with * to enable submission."}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSaving || !isComplete}
                    size="lg"
                    className={`shrink-0 rounded-xl px-8 py-6 text-sm font-bold shadow-lg transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${
                      isComplete
                        ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2.5">
                        <Loader2 className="size-4 animate-spin" />
                        Saving Profile...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2.5">
                        {isEditMode ? "Update Profile" : "Save Profile"}
                        <ArrowRight className="size-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </form>
      </div>
  )
}