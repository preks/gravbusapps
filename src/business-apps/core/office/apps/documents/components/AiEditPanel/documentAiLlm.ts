/**
 * Document AI uses a single LLM tier (no user-facing provider toggle).
 * `openai` is the API label for the primary path; document-service routes it to the
 * configured OpenAI-compatible endpoint (OpenAI, Azure Open AI, or Azure AI Foundry)
 * via DOCUMENT_LLM_PROVIDER / DEFAULT_LLM_PROVIDER and OPENAI_CHAT_MODEL / DOCUMENTS_MODEL.
 * Use `groq` only for the Groq-hosted API (not Foundry).
 */
export type LlmProvider = 'openai' | 'groq'

/** Primary path; keep default for Azure Foundry + gpt-oss-120b when the service is configured for it. */
export const DEFAULT_DOCUMENT_AI_LLM_PROVIDER: LlmProvider = 'openai'
