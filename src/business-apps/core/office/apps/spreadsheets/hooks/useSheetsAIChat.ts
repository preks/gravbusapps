import { useCallback, useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { SpreadsheetColumn } from '../types'
import { SHEETS_AI_CHAT_SYSTEM_PROMPT, buildSheetsAIChatUserPrompt } from '../prompts/sheets-ai-chat'

const PREFERRED_MODEL_ID = '6799beda3544ce9d4dfaa322'

export interface SheetsAIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface UseSheetsAIChatParams {
  accessToken: string
  sheetName: string
  columns: SpreadsheetColumn[]
  sheetData: Array<Record<string, unknown>>
}

interface UseSheetsAIChatResult {
  messages: SheetsAIChatMessage[]
  isSending: boolean
  error: string | null
  sendMessage: (question: string) => Promise<void>
}

const createId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`

export const useSheetsAIChat = ({
  accessToken,
  sheetName,
  columns,
  sheetData
}: UseSheetsAIChatParams): UseSheetsAIChatResult => {
  const promptClient = usePromptManagerClient(accessToken)
  const [messages, setMessages] = useState<SheetsAIChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clippedRows = useMemo(() => sheetData.slice(0, 120), [sheetData])

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed) return
      const userMessage: SheetsAIChatMessage = {
        id: createId(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString()
      }
      setMessages(prev => [...prev, userMessage])
      setError(null)
      setIsSending(true)
      try {
        const modelsResponse = await promptClient.getAiModels({
          limit: 10,
          offset: 0,
          returnTotalRecords: false
        })
        const selectedModel =
          modelsResponse.data?.find(model => model._id === PREFERRED_MODEL_ID) ??
          modelsResponse.data?.find(model => model.name.toLowerCase().includes('gpt-4')) ??
          modelsResponse.data?.[0]
        if (!selectedModel) throw new Error('No AI models available')

        const formData = new FormData()
        formData.append('model_id', selectedModel._id)
        formData.append('system_content', SHEETS_AI_CHAT_SYSTEM_PROMPT)
        formData.append('user_content', buildSheetsAIChatUserPrompt(trimmed, sheetName, columns, clippedRows))
        formData.append('model_settings', JSON.stringify({}))

        const response = await promptClient.executePrompt(formData)
        const assistantText =
          typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content ?? 'No response content')

        setMessages(prev => [
          ...prev,
          {
            id: createId(),
            role: 'assistant',
            content: assistantText,
            createdAt: new Date().toISOString()
          }
        ])
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : 'Failed to send message')
        setMessages(prev => [
          ...prev,
          {
            id: createId(),
            role: 'assistant',
            content: 'I could not answer right now. Please try again.',
            createdAt: new Date().toISOString()
          }
        ])
      } finally {
        setIsSending(false)
      }
    },
    [clippedRows, columns, promptClient, sheetName]
  )

  return {
    messages,
    isSending,
    error,
    sendMessage
  }
}
