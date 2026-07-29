import { api } from "@/api/client"
import type { CallHistoryItem } from "@/types/expert"
import { z } from "zod"
import { CallHistoryItemSchema } from "@/lib/validation-more"

export type { CallHistoryItem } from "@/types/expert"

const CallHistoryArraySchema = z.array(CallHistoryItemSchema)

export async function fetchCallHistory(): Promise<CallHistoryItem[]> {
  return api.get<CallHistoryItem[]>("/video-call/history", undefined, {
    schema: CallHistoryArraySchema,
  })
}
