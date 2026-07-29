import {
  Briefcase,
  GraduationCap,
  Heart,
  Landmark,
  Laptop,
  Scale,
  Stethoscope,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "Find Experts", href: "#experts" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const

export const trustStats = [
  { value: "10,000+", label: "Active Users", numeric: 10000, suffix: "+" },
  { value: "500+", label: "Verified Experts", numeric: 500, suffix: "+" },
  { value: "50,000+", label: "Consultations", numeric: 50000, suffix: "+" },
  {
    value: "4.9/5",
    label: "Average Rating",
    numeric: 4.9,
    suffix: "/5",
    decimals: 1,
  },
] as const

export const trustedCompanies = [
  "Google",
  "Microsoft",
  "Amazon",
  "Adobe",
  "Deloitte",
  "Paytm",
] as const

export const howItWorksSteps = [
  {
    step: 1,
    title: "Find Expert",
    description:
      "Browse verified experts by category, rating, and availability.",
  },
  {
    step: 2,
    title: "Book Consultation",
    description:
      "Choose a time slot and pay securely — no subscription required.",
  },
  {
    step: 3,
    title: "Video Call & Resolution",
    description:
      "Connect via HD video, get expert advice, and resolve your issue.",
  },
] as const

export type Category = {
  name: string
  icon: LucideIcon
  expertCount: number
  color: string
}

export const categories: Category[] = [
  { name: "Legal Advice", icon: Scale, expertCount: 120, color: "bg-indigo-50 text-indigo-600" },
  { name: "Finance", icon: TrendingUp, expertCount: 95, color: "bg-emerald-50 text-emerald-600" },
  { name: "Medical", icon: Stethoscope, expertCount: 80, color: "bg-rose-50 text-rose-600" },
  { name: "Education", icon: GraduationCap, expertCount: 110, color: "bg-sky-50 text-sky-600" },
  { name: "Business", icon: Briefcase, expertCount: 140, color: "bg-violet-50 text-violet-600" },
  { name: "Technology", icon: Laptop, expertCount: 160, color: "bg-blue-50 text-blue-600" },
  { name: "Career Guidance", icon: Landmark, expertCount: 75, color: "bg-amber-50 text-amber-600" },
  { name: "Mental Wellness", icon: Heart, expertCount: 60, color: "bg-pink-50 text-pink-600" },
]

export type Expert = {
  id: string
  name: string
  category: string
  rating: number
  sessions: number
  price: number
  avatar: string
  online?: boolean
}

export const featuredExperts: Expert[] = [
  {
    id: "1",
    name: "Dr. Priya Sharma",
    category: "Legal Expert",
    rating: 4.9,
    sessions: 500,
    price: 800,
    avatar: "PS",
    online: true,
  },
  {
    id: "2",
    name: "Arjun Mehta",
    category: "Finance Advisor",
    rating: 4.8,
    sessions: 420,
    price: 650,
    avatar: "AM",
  },
  {
    id: "3",
    name: "Dr. Neha Kapoor",
    category: "Medical Consultant",
    rating: 4.9,
    sessions: 380,
    price: 900,
    avatar: "NK",
  },
  {
    id: "4",
    name: "Rahul Verma",
    category: "Tech Mentor",
    rating: 4.7,
    sessions: 310,
    price: 550,
    avatar: "RV",
  },
]

export const whyFlyHighFeatures = [
  "Verified Experts",
  "Secure Video Calls",
  "Flexible Scheduling",
  "Protected Payments",
  "Admin Dispute Resolution",
] as const

export const testimonials = [
  {
    id: "1",
    name: "Ananya Reddy",
    role: "Startup Founder",
    quote:
      "FlyHigh connected me with a legal expert in minutes. The consultation saved weeks of back-and-forth and gave me clarity on my contract.",
    rating: 5,
    avatar: "AR",
  },
  {
    id: "2",
    name: "Vikram Singh",
    role: "Product Manager",
    quote:
      "The pay-per-call model is perfect. I only pay when I need help, and every expert I've spoken with has been genuinely knowledgeable.",
    rating: 5,
    avatar: "VS",
  },
  {
    id: "3",
    name: "Meera Joshi",
    role: "Career Switcher",
    quote:
      "My career guidance session was transformative. The expert helped me map out a clear path and I landed my dream role within two months.",
    rating: 5,
    avatar: "MJ",
  },
] as const

export const footerLinks = {
  Platform: ["Find Experts", "Become an Expert", "Pricing", "Categories"],
  Support: ["Help Center", "Contact Us", "FAQs", "Dispute Resolution"],
  Resources: ["Blog", "Expert Guides", "Success Stories", "API Docs"],
  Company: ["About Us", "Careers", "Press", "Privacy Policy"],
} as const
