export interface ChatSession {
  id: string
  userId: string
  title: string
  scope: 'all' | 'space'
  spaceId?: string
  /**
   * Optional hint for the backend LLM provider selection (e.g. 'openai', 'groq').
   * The document-service is responsible for enforcing/validating this value.
   */
  llmProvider?: string
  contextConfig: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  sources: ChatSource[]
  tokensUsed?: number
  createdAt: string
}

export interface ChatSource {
  contentType: 'document' | 'note' | 'spreadsheet'
  contentId: string
  title: string
  chunkText: string
  similarity: number
}

export interface CreateSessionDto {
  scope?: 'all' | 'space'
  spaceId?: string
  title?: string
  /**
   * Optional hint for the backend LLM provider selection (e.g. 'openai', 'groq').
   * This must never be a secret and does not include any API keys.
   */
  llmProvider?: string
}

export interface SendMessageDto {
  sessionId: string
  message: string
}
