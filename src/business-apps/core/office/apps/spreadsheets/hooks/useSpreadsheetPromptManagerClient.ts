import { useMemo } from 'react'
import { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { useSyncClientAccessToken } from '@/common/network/useSyncClientAccessToken'
import { SPREADSHEET_PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'

/**
 * Prompt Manager client scoped to spreadsheet AI flows (Flowbot mount).
 * Does not affect the global `promptManagerClient` used elsewhere.
 */
export function useSpreadsheetPromptManagerClient(accessToken: string) {
  const client = useMemo(() => {
    if (!SPREADSHEET_PROMPT_MANAGER_API_URL?.trim()) {
      if (typeof console !== 'undefined') {
        console.warn('[useSpreadsheetPromptManagerClient] Spreadsheet Prompt Manager base URL is empty')
      }
    }
    return new PromptManagerClient(SPREADSHEET_PROMPT_MANAGER_API_URL)
  }, [])

  useSyncClientAccessToken(client, accessToken)

  return client
}
