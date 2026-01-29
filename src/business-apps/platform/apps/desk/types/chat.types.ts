export interface ChatSession {
  id: string
  userId: string
  title: string
  scope: 'all' | 'space'
  spaceId?: string
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
}

export interface SendMessageDto {
  sessionId: string
  message: string
}
