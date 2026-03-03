/**
 * Message send handlers: sendMessageVoid, handleSendMessage, handleAISendMessage,
 * handleReplyToAI, handleTypingStart, handleTypingStop.
 */

import { useCallback } from 'react'
import type { Conversation, MessageEntityReference, User } from '../types'

export interface ExpertInfo {
  expertId: string
  expertName: string
  color?: string
}

export interface UseChatMessageHandlersParams {
  activeConversationId: string | null
  activeConversation: Conversation | null
  messages: Array<{ metadata?: Record<string, unknown> }>
  currentUser: User | null
  sendMessage: (
    conversationId: string,
    content: string,
    metadata?: Record<string, unknown>,
    parentId?: string,
    quotedMessageId?: string
  ) => Promise<unknown>
  apiClient: {
    uploadFiles: (
      conversationId: string,
      files: File[]
    ) => Promise<Array<{ id: string; name: string; url: string; type?: string; mimeType?: string; size?: number }>>
  } | null
  hasEveryMention: (entityReferences?: MessageEntityReference[]) => boolean
  processEveryAIMessage: (
    content: string,
    entityReferences?: MessageEntityReference[],
    conversationContext?: Record<string, unknown>,
    fileAttachments?: File[]
  ) => Promise<{
    text?: string
    error?: unknown
    sessionId?: string
    scheduledMeeting?: unknown
    outputs?: unknown[]
  } | null>
  processExpertMention: (
    content: string,
    entityReferences: MessageEntityReference[] | undefined,
    uploadedAttachments: Array<{ id: string; name: string; url: string }>
  ) => Promise<{
    isExpertMention: boolean
    expertResponse?: {
      text: string
      expertId: string
      expertName?: string
      expertColor?: string
      citations?: unknown
      confidence?: unknown
    }
  }>
  clearStreamingText: () => void
  setDraftMessage: React.Dispatch<React.SetStateAction<string>>
  setIsExpertProcessing: (value: boolean) => void
  setProcessingExpert: (value: { name: string; color: string } | null) => void
  activeExperts: ExpertInfo[]
  registerMentionEntityRef: React.MutableRefObject<((entity: unknown, text: string, offset: number) => void) | null>
  focusInputRef: React.MutableRefObject<(() => void) | null>
  activeConversationIdRef: React.MutableRefObject<string | null>
  startTyping: (conversationId: string) => void
  stopTyping: (conversationId: string) => void
}

export interface UseChatMessageHandlersReturn {
  sendMessageVoid: (conversationId: string, content: string, metadata?: Record<string, unknown>) => Promise<void>
  handleSendMessage: (
    content: string,
    entityReferences?: MessageEntityReference[],
    attachments?: Array<{ file: File }>,
    parentId?: string,
    quotedMessageId?: string
  ) => Promise<void>
  handleAISendMessage: (content: string, metadata?: Record<string, unknown>) => Promise<void>
  handleReplyToAI: () => void
  handleTypingStart: () => void
  handleTypingStop: () => void
}

export function useChatMessageHandlers({
  activeConversationId,
  activeConversation,
  messages,
  currentUser,
  sendMessage,
  apiClient,
  hasEveryMention,
  processEveryAIMessage,
  processExpertMention,
  clearStreamingText,
  setDraftMessage,
  setIsExpertProcessing,
  setProcessingExpert,
  activeExperts,
  registerMentionEntityRef,
  focusInputRef,
  activeConversationIdRef,
  startTyping,
  stopTyping
}: UseChatMessageHandlersParams): UseChatMessageHandlersReturn {
  const sendMessageVoid = useCallback(
    async (conversationId: string, content: string, metadata?: Record<string, unknown>): Promise<void> => {
      await sendMessage(conversationId, content, metadata)
    },
    [sendMessage]
  )

  const handleSendMessage = useCallback(
    async (
      content: string,
      entityReferences?: MessageEntityReference[],
      attachments?: Array<{ file: File }>,
      parentId?: string,
      quotedMessageId?: string
    ): Promise<void> => {
      if (!activeConversationId) return
      try {
        const metadata: Record<string, unknown> = {}
        if (entityReferences?.length) {
          metadata.entityReferences = entityReferences
        }
        let uploadedAttachments: Array<{
          id: string
          name: string
          url: string
          type?: string
          mimeType?: string
          size?: number
        }> = []
        if (attachments?.length && apiClient) {
          try {
            const files = attachments.map(a => a.file)
            uploadedAttachments = await apiClient.uploadFiles(activeConversationId, files)
            metadata.attachments = uploadedAttachments
          } catch {
            // continue without attachments
          }
        }
        await sendMessage(
          activeConversationId,
          content,
          Object.keys(metadata).length > 0 ? metadata : undefined,
          parentId,
          quotedMessageId
        )
        setDraftMessage('')
        const expertMention = entityReferences?.find(ref => ref.type === 'every_expert')
        const mentionedExpert = expertMention ? activeExperts.find(e => e.expertId === expertMention.id) : null
        if (mentionedExpert) {
          setIsExpertProcessing(true)
          setProcessingExpert({ name: mentionedExpert.expertName, color: mentionedExpert.color ?? '' })
        }
        const expertResult = await processExpertMention(content, entityReferences, uploadedAttachments)
        setIsExpertProcessing(false)
        setProcessingExpert(null)
        if (expertResult.isExpertMention && expertResult.expertResponse) {
          const expertResp = expertResult.expertResponse
          await new Promise(resolve => setTimeout(resolve, 100))
          await sendMessage(activeConversationId, expertResp.text, {
            isEveryExpertResponse: true,
            expertId: expertResp.expertId,
            expertName: expertResp.expertName,
            expertColor: expertResp.expertColor,
            citations: expertResp.citations,
            confidence: expertResp.confidence,
            initiatedBy: currentUser?.id
          })
          const expertName = (expertResp.expertName ?? '').toLowerCase()
          const isDocumentReviewer = expertName.includes('document') || expertName.includes('review')
          if (isDocumentReviewer) {
            try {
              const responseText = expertResp.text
              const annotationsRegex = /\{[\s\S]*"annotations"[\s\S]*\}/m
              const jsonMatch = annotationsRegex.exec(responseText)
              if (jsonMatch?.[0]) {
                const reviewData = JSON.parse(jsonMatch[0]) as { annotations?: Array<Record<string, unknown>> }
                if (reviewData.annotations?.length) {
                  const docContext = (globalThis as unknown as { __currentDocumentContext?: { documentId: string } })
                    .__currentDocumentContext
                  if (docContext?.documentId) {
                    const annotations = reviewData.annotations.map((ann: Record<string, unknown>, idx: number) => ({
                      id: ann.id ?? `ann-${idx}`,
                      type: ann.type ?? 'error',
                      severity: ann.severity ?? 'warning',
                      category: ann.category ?? 'grammar',
                      startOffset: ann.startOffset ?? ann.start_offset ?? 0,
                      endOffset: ann.endOffset ?? ann.end_offset ?? 0,
                      originalText: ann.originalText ?? ann.original_text ?? '',
                      message: ann.message ?? '',
                      suggestion: ann.suggestedText ?? ann.suggested_text ?? ann.suggestion ?? '',
                      resolved: false
                    }))
                    globalThis.dispatchEvent(
                      new CustomEvent('document-review-annotations', {
                        detail: { documentId: docContext.documentId, annotations, isLoading: false }
                      })
                    )
                  }
                }
              }
            } catch {
              // not JSON annotations
            }
          }
          clearStreamingText()
          return
        }
        if (hasEveryMention(entityReferences) && activeConversation) {
          try {
            const participants =
              activeConversation.participants
                ?.filter(p => p.userId || p.user)
                .map(p => {
                  const user = p.user
                  const name = user
                    ? user.displayName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || ''
                    : ''
                  return {
                    id: p.userId || user?.id || '',
                    odId: p.userId || user?.id || '',
                    name,
                    email: user?.email ?? '',
                    employeeId: user?.employeeId
                  }
                })
                .filter(p => p.name) ?? []
            const currentUserName = currentUser
              ? currentUser.displayName ||
                `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() ||
                currentUser.username ||
                ''
              : ''
            const existingSessionId = messages
              .filter(m => m.metadata?.isAIResponse && m.metadata?.everyAiSessionId)
              .map(m => m.metadata?.everyAiSessionId as string)
              .pop()
            const lastScheduledMeeting = messages
              .filter(m => m.metadata?.isAIResponse && m.metadata?.scheduledMeeting)
              .map(m => m.metadata?.scheduledMeeting)
              .pop()
            const mentionedUsers =
              entityReferences
                ?.filter(ref => ref.type === 'employee' || ref.type === 'contact')
                .map(ref => ({
                  id: ref.id,
                  odId: (ref as { userId?: string }).userId || ref.id,
                  name: ref.name || 'Unknown',
                  email: undefined,
                  employeeId: ref.type === 'employee' ? ref.id : undefined
                })) ?? []
            const conversationContext = {
              conversationId: activeConversationId,
              conversationName: activeConversation.name,
              participants,
              existingSessionId,
              currentUserId: currentUser?.id,
              currentUserName,
              lastScheduledMeeting,
              mentionedUsers
            }
            const fileAttachments = attachments?.map(a => a.file) ?? []
            const aiResponse = await processEveryAIMessage(
              content,
              entityReferences ?? [],
              conversationContext,
              fileAttachments
            )
            if (aiResponse?.text && !aiResponse.error) {
              const responseText = aiResponse.text.trim()
              if (responseText) {
                await new Promise(resolve => setTimeout(resolve, 100))
                const aiMetadata: Record<string, unknown> = {
                  isAIResponse: true,
                  aiAssistant: 'Every',
                  originalQuestion: content,
                  everyAiSessionId: aiResponse.sessionId,
                  initiatedBy: currentUser?.id
                }
                if (aiResponse.scheduledMeeting) aiMetadata.scheduledMeeting = aiResponse.scheduledMeeting
                if (aiResponse.outputs?.length) aiMetadata.outputs = aiResponse.outputs
                await sendMessage(activeConversationId, responseText, aiMetadata)
                clearStreamingText()
              }
            }
          } catch {
            // don't crash
          }
        }
      } catch {
        // error sending
      }
    },
    [
      activeConversationId,
      sendMessage,
      apiClient,
      hasEveryMention,
      processEveryAIMessage,
      processExpertMention,
      activeConversation,
      clearStreamingText,
      setDraftMessage,
      setIsExpertProcessing,
      setProcessingExpert,
      activeExperts,
      currentUser,
      messages
    ]
  )

  const handleAISendMessage = useCallback(
    async (content: string, metadata?: Record<string, unknown>): Promise<void> => {
      if (!activeConversationId) return
      try {
        if (metadata?.isFormSubmission) {
          const conversationContext = {
            conversationId: activeConversationId,
            conversationName: activeConversation?.name,
            participants: activeConversation?.participants
              ?.filter(p => p.user)
              .map(p => {
                const user = p.user!
                const name =
                  user.displayName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || ''
                return {
                  id: p.userId || user.id,
                  odId: p.userId || user.id,
                  name,
                  email: user.email,
                  employeeId: user.employeeId
                }
              })
              .filter(p => p.name),
            existingSessionId: messages
              .filter(m => m.metadata?.isAIResponse && m.metadata?.everyAiSessionId)
              .map(m => m.metadata?.everyAiSessionId as string)
              .pop(),
            currentUserId: currentUser?.id,
            currentUserName: currentUser
              ? currentUser.displayName ||
                `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() ||
                currentUser.username ||
                ''
              : ''
          }
          const aiResponse = await processEveryAIMessage(content, [], conversationContext, [])
          if (aiResponse && !aiResponse.error) {
            const responseText = aiResponse.text?.trim() ?? ''
            const hasOutputs = Boolean(aiResponse.outputs?.length)
            if (responseText || hasOutputs) {
              await new Promise(resolve => setTimeout(resolve, 100))
              const aiMetadata: Record<string, unknown> = {
                isAIResponse: true,
                aiAssistant: 'Every',
                originalQuestion: content,
                everyAiSessionId: aiResponse.sessionId,
                isFormResult: true,
                initiatedBy: currentUser?.id
              }
              if (aiResponse.scheduledMeeting) aiMetadata.scheduledMeeting = aiResponse.scheduledMeeting
              if (hasOutputs) aiMetadata.outputs = aiResponse.outputs
              const messageText = responseText || 'Processing your request...'
              await sendMessage(activeConversationId, messageText, aiMetadata)
              clearStreamingText()
            }
          }
        } else {
          await sendMessage(activeConversationId, content, metadata)
        }
      } catch {
        // error
      }
    },
    [
      activeConversationId,
      activeConversation,
      messages,
      currentUser,
      processEveryAIMessage,
      sendMessage,
      clearStreamingText
    ]
  )

  const handleReplyToAI = useCallback(() => {
    setDraftMessage(prev => {
      if (prev.startsWith('@Every ')) return prev
      const newText = `@Every ${prev}`
      if (registerMentionEntityRef.current) {
        registerMentionEntityRef.current(
          { id: 'every-ai-assistant', type: 'ai_assistant', name: 'Every', subtitle: 'AI Assistant • Ask me anything' },
          newText,
          0
        )
      }
      setTimeout(() => {
        focusInputRef.current?.()
      }, 0)
      return newText
    })
  }, [setDraftMessage, registerMentionEntityRef, focusInputRef])

  const handleTypingStart = useCallback(() => {
    if (activeConversationIdRef.current) startTyping(activeConversationIdRef.current)
  }, [startTyping])

  const handleTypingStop = useCallback(() => {
    if (activeConversationIdRef.current) stopTyping(activeConversationIdRef.current)
  }, [stopTyping])

  return {
    sendMessageVoid,
    handleSendMessage,
    handleAISendMessage,
    handleReplyToAI,
    handleTypingStart,
    handleTypingStop
  }
}
