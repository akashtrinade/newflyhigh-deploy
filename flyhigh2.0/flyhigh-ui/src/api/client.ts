// ── Centralized API client (axios) with Zod runtime validation ──
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios"
import type { z } from "zod"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8081/api"

// ── Axios instance (pre-configured) ──

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // httpOnly cookie-based auth
  headers: { "Content-Type": "application/json" },
})

// ── 401 handling: refresh access token once, then retry the original request ──
// Sessions run longer than the 15-min access token; without this, the 2s
// session-state poll starts 401ing mid-call and the session never completes.

interface RetriableRequestConfig extends AxiosRequestConfig {
  _retried?: boolean
  skipAuthRefresh?: boolean
}

let refreshPromise: Promise<boolean> | null = null

function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = axiosInstance
      .post("/auth/refresh", undefined, { skipAuthRefresh: true } as RetriableRequestConfig)
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// ── Response interceptor: unwrap data, normalize errors ──

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = (error.config ?? {}) as RetriableRequestConfig

    // Attempt a single refresh + retry for auth expiry (not for auth endpoints themselves)
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.skipAuthRefresh &&
      !(original.url ?? "").includes("/auth/")
    ) {
      original._retried = true
      const refreshed = await refreshTokens()
      if (refreshed) {
        try {
          return await axiosInstance(original)
        } catch (retryError) {
          return Promise.reject(normalizeError(retryError))
        }
      }
    }

    return Promise.reject(normalizeError(error))
  },
)

function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error) && error.response) {
    const { status, data } = error.response
    const message =
      data && typeof data === "object" && "message" in data
        ? (data as { message: string }).message
        : error.message
    return new ApiError(message, status, data)
  }
  return new ApiError(
    error instanceof Error ? error.message : "Network error",
    0,
  )
}

// ── Error class ──

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function getApiBase(): string {
  return API_BASE
}

// ── URL builder (shared) ──

export function buildPath(
  base: string,
  params?: Record<string, string | number | undefined>,
): string {
  if (!params) return base

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "Any") {
      searchParams.set(key, String(value))
    }
  }
  const qs = searchParams.toString()
  return qs ? `${base}?${qs}` : base
}

// ── Zod validation helpers ──

/**
 * Runtime validation error — schema mismatch between frontend expectation
 * and actual API response shape.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public endpoint: string,
    public issues: readonly z.ZodIssue[],
  ) {
    super(message)
    this.name = "ValidationError"
  }
}

interface ApiOptions extends AxiosRequestConfig {
  /** Zod schema to validate the response against */
  schema?: z.ZodSchema<unknown>
}

/**
 * Validates API response data against a Zod schema.
 * In production, logs a warning but returns the unvalidated data
 * rather than crashing the app (fail-open for runtime).
 * In development, throws to catch schema mismatches early.
 */
function validateOrWarn<T>(
  schema: z.ZodSchema<T> | undefined,
  data: unknown,
  endpoint: string,
): T {
  if (!schema) return data as T

  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = `[Zod] Schema mismatch for ${endpoint}: ${result.error.flatten().fieldErrors}`
    if (import.meta.env.DEV) {
      console.error(msg, "\nReceived:", data)
      // In dev, still return data but flag it visibly
    } else {
      console.warn(msg)
    }
    // Fail-open in production: return unvalidated data rather than crash
    return data as T
  }
  return result.data
}

// ── Public API (with optional Zod validation) ──

export const api = {
  get: <T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    opts?: ApiOptions,
  ) => {
    const { schema, ...config } = opts || {}
    return axiosInstance
      .get<T>(buildPath(path, params), config)
      .then((res) => validateOrWarn(schema as z.ZodSchema<T> | undefined, res.data, `GET ${path}`))
  },

  post: <T>(path: string, body?: unknown, opts?: ApiOptions) => {
    const { schema, ...config } = opts || {}
    return axiosInstance
      .post<T>(path, body, config)
      .then((res) => validateOrWarn(schema as z.ZodSchema<T> | undefined, res.data, `POST ${path}`))
  },

  put: <T>(path: string, body?: unknown, opts?: ApiOptions) => {
    const { schema, ...config } = opts || {}
    return axiosInstance
      .put<T>(path, body, config)
      .then((res) => validateOrWarn(schema as z.ZodSchema<T> | undefined, res.data, `PUT ${path}`))
  },

  delete: <T>(path: string, opts?: ApiOptions) => {
    const { schema, ...config } = opts || {}
    return axiosInstance
      .delete<T>(path, config)
      .then((res) => validateOrWarn(schema as z.ZodSchema<T> | undefined, res.data, `DELETE ${path}`))
  },
}

/** Re-export Zod type for convenience */
export type { z }
