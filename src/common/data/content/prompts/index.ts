import type {
  ExecutePromptJsonBody,
  PromptExecuteResponse
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'

import ContentArticleWriter from './ContentArticleWriter.json'
import ContentArticleAnalyzer from './ContentArticleAnalyzer.json'

/** Known content prompt keys; each has a matching JSON file in this folder. */
export const CONTENT_PROMPT_KEYS = ['ContentArticleWriter', 'ContentArticleAnalyzer'] as const
export type ContentPromptKey = (typeof CONTENT_PROMPT_KEYS)[number]

const PROMPT_CONFIGS: Record<ContentPromptKey, ExecutePromptJsonBody> = {
  ContentArticleWriter: ContentArticleWriter as ExecutePromptJsonBody,
  ContentArticleAnalyzer: ContentArticleAnalyzer as ExecutePromptJsonBody
}

/**
 * Returns the base execute-json body for a content prompt (from the JSON file).
 * Fill in user_params, document_links, etc. at call site and pass to executeContentPromptByJson.
 */
export function getContentPromptConfig(key: ContentPromptKey): ExecutePromptJsonBody {
  const config = PROMPT_CONFIGS[key]
  if (!config) {
    throw new Error(`Unknown content prompt key: ${key}`)
  }
  return { ...config }
}

/**
 * Overrides to merge into the base prompt config when executing (e.g. user_params, document_links).
 */
export interface ExecuteContentPromptOverrides {
  user_params?: Record<string, unknown>
  system_params?: Record<string, unknown>
  document_links?: string[]
  context?: Record<string, unknown>
}

/**
 * Executes a content prompt via the prompt-manager execute-json endpoint.
 * Base config from the prompt JSON; user_params come only from the consumer (implementation), not from the definition.
 */
export async function executeContentPromptByJson(
  client: PromptManagerClient,
  promptKey: ContentPromptKey,
  overrides: ExecuteContentPromptOverrides = {}
): Promise<PromptExecuteResponse> {
  const base = getContentPromptConfig(promptKey)
  const baseWithoutUserParams = { ...base }
  delete (baseWithoutUserParams as Record<string, unknown>).user_params
  const body: ExecutePromptJsonBody = {
    ...baseWithoutUserParams,
    user_params: overrides.user_params ?? {},
    system_params: overrides.system_params ?? base.system_params ?? {},
    document_links: overrides.document_links ?? base.document_links ?? [],
    context: overrides.context ?? base.context ?? {}
  }
  return client.executePromptByJson(body)
}
