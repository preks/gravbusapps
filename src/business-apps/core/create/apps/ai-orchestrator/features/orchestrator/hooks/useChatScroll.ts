import { useEffect, useRef, useCallback } from 'react'

interface UseChatScrollReturn {
  messagesEndRef: React.RefObject<HTMLDivElement>
  scrollContainerRef: React.RefObject<HTMLDivElement>
  handleScroll: () => void
}

export const useChatScroll = (messageCount: number): UseChatScrollReturn => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)
  const prevMessageCountRef = useRef(messageCount)

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUpRef.current = distanceFromBottom > 80
  }, [])

  // Auto-scroll only when user is near bottom
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messageCount])

  // Always scroll to bottom when a new message arrives
  useEffect(() => {
    if (messageCount > prevMessageCountRef.current) {
      userScrolledUpRef.current = false
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messageCount
  }, [messageCount])

  return { messagesEndRef, scrollContainerRef, handleScroll }
}
