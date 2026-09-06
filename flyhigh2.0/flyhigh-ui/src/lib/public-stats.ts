// ── Home Page Stats API + localStorage Cache ──
//
// Caches home page stats in localStorage with a 1-hour TTL.
// On cache miss → fetch from the public backend endpoint.
// On API failure → serve stale cached data if available.
// On no cache + API failure → throw (caller handles fallback).

import { api } from "@/api/client"
import type { HomePageStats } from "@/types/public-stats"

// ── Constants ──

const CACHE_KEY = "flyhigh_home_stats"
const CACHE_VERSION = 1
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

interface CacheEntry {
  version: number
  timestamp: number
  data: HomePageStats
}

// ── Dev-only logging ──

function devLog(level: "log" | "warn", message: string): void {
  if (import.meta.env.DEV) {
    console[level]("[HomeStats]", message)
  }
}

// ── Cache helpers ──

function getCachedStats(): HomePageStats | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const entry: CacheEntry = JSON.parse(raw)

    if (entry.version !== CACHE_VERSION) {
      devLog("warn", `Version mismatch (${entry.version} vs ${CACHE_VERSION}). Purging.`)
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      devLog("log", "Cache expired")
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

function setCachedStats(data: HomePageStats): void {
  try {
    const entry: CacheEntry = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      data,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function getStaleStats(): HomePageStats | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    return entry.data ?? null
  } catch {
    return null
  }
}

// ── Public API ──

/**
 * Fetch home page stats with localStorage caching.
 *
 * Flow:
 *   1. Cache hit (fresh, within TTL) → return cached data (zero network)
 *   2. Cache miss/expired → fetch from backend, update cache, return fresh data
 *   3. API failure + stale cache → return stale cached data
 *   4. API failure + no cache → throw (caller uses hardcoded fallback)
 */
export async function fetchHomePageStats(): Promise<HomePageStats> {
  // 1. Cache hit
  const cached = getCachedStats()
  if (cached) {
    devLog("log", "Cache hit — returning cached stats")
    return cached
  }

  // 2. Fetch fresh data
  try {
    devLog("log", "Cache miss — fetching from backend")
    const data = await api.get<HomePageStats>("/public/home-stats")
    setCachedStats(data)
    return data
  } catch (error) {
    // 3. Stale cache fallback
    const stale = getStaleStats()
    if (stale) {
      devLog("warn", "API request failed — serving stale cached data")
      return stale
    }

    // 4. Nothing to fall back on
    throw error
  }
}
