import { useEffect, useRef } from 'react'
import { logRenderCounts, resetRenderCounts, logMemory } from '../utils/performanceUtils'

interface PerformanceMonitorProps {
  conversationId: string | null
  messageCount: number
}

/**
 * Development-only performance monitoring component
 * Logs performance metrics and render counts
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ conversationId, messageCount }) => {
  const prevConversationIdRef = useRef<string | null>(null)
  const mountTimeRef = useRef<number>(Date.now())

  // Log when conversation changes
  useEffect(() => {
    if (conversationId && conversationId !== prevConversationIdRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('═══════════════════════════════════════════════')
        console.log('[V2 Performance] Conversation switched')
        console.log('Conversation ID:', conversationId)
        console.log('Message Count:', messageCount)
        logMemory('After conversation switch')
        console.log('═══════════════════════════════════════════════')

        // Reset render counts for new conversation
        resetRenderCounts()
      }
      prevConversationIdRef.current = conversationId
    }
  }, [conversationId, messageCount])

  // OPTIMIZATION: Log summary every 30 seconds (reduced frequency to minimize overhead)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    const interval = setInterval(() => {
      const uptime = Math.floor((Date.now() - mountTimeRef.current) / 1000)
      console.log('─────────────────────────────────────────────')
      console.log(`[V2 Performance] Summary (uptime: ${uptime}s)`)
      logRenderCounts()
      logMemory('Current')
      console.log('─────────────────────────────────────────────')
    }, 30000) // Every 30 seconds (reduced from 10s)

    return () => clearInterval(interval)
  }, [])

  // Log on mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [V2 Performance] Monitor started')
      console.log('Performance logs will appear in console')
      console.log('Look for [V2] prefixed messages')
    }
  }, [])

  return null // This component doesn't render anything
}
