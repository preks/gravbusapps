/**
 * Document AI uses a single LLM tier (no user-facing provider toggle).
 * `openai` is the API label for the primary path; document-service routes it to Azure OpenAI
 * when USE_AZURE_OPENAI is set in the service environment, same as slides generation.
 */
export type LlmProvider = 'openai' | 'groq'

export const DEFAULT_DOCUMENT_AI_LLM_PROVIDER: LlmProvider = 'openai'
