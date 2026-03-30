/**
 * Document AI uses a single LLM tier (no user-facing provider toggle).
 * `openai` is the API label for the default/smart path; document-service and FlowBot map it to
 * Azure OpenAI deployments when USE_AZURE_OPENAI is enabled.
 */
export type LlmProvider = 'openai' | 'azure'

export const DEFAULT_DOCUMENT_AI_LLM_PROVIDER: LlmProvider = 'openai'
