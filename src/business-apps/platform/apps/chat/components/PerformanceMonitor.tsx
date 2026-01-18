import { useEffect, useRef } from 'react'
import { resetRenderCounts } from '../utils/performanceUtils'

interface PerformanceMonitorProps {
  conversationId: string | null
  messageCount: number
}

/**
 * Development-only performance monitoring component
 * Resets render counts when conversation changes
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ conversationId, messageCount }) => {
  const prevConversationIdRef = useRef<string | null>(null)

  // Reset render counts when conversation changes
  useEffect(() => {
    if (conversationId && conversationId !== prevConversationIdRef.current) {
      if (process.env.NODE_ENV === 'development') {
        // Reset render counts for new conversation
        resetRenderCounts()
      }
      prevConversationIdRef.current = conversationId
    }
  }, [conversationId, messageCount])

  return null // This component doesn't render anything
}
