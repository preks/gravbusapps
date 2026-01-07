import { useState, useEffect, useCallback, useRef } from 'react'
import type { TypingIndicator } from '../types'

interface UseTypingIndicatorOptions {
  onTypingStart?: (conversationId: string) => void
  onTypingStop?: (conversationId: string) => void
  typingStartDelay?: number
  typingStopDelay?: number
}

export function useTypingIndicator(options: UseTypingIndicatorOptions = {}) {
  const { onTypingStart, onTypingStop, typingStartDelay = 300, typingStopDelay = 2000 } = options

  const [typingUsers, setTypingUsers] = useState<Record<string, TypingIndicator[]>>({})
  const typingTimersRef = useRef<Record<string, NodeJS.Timeout>>({})
  const stopTypingTimersRef = useRef<Record<string, NodeJS.Timeout>>({})

  const handleUserTyping = useCallback((data: TypingIndicator) => {
    setTypingUsers(prev => {
      const conversationTyping = prev[data.conversationId] || []
      const filtered = conversationTyping.filter(t => t.userId !== data.userId)

      if (data.isTyping) {
        return {
          ...prev,
          [data.conversationId]: [...filtered, data]
        }
      } else {
        return {
          ...prev,
          [data.conversationId]: filtered
        }
      }
    })
  }, [])

  const startTyping = useCallback(
    (conversationId: string) => {
      // Clear any existing stop timer
      if (stopTypingTimersRef.current[conversationId]) {
        clearTimeout(stopTypingTimersRef.current[conversationId])
        delete stopTypingTimersRef.current[conversationId]
      }

      // If already typing, don't send another start
      if (typingTimersRef.current[conversationId]) {
        return
      }

      // Set timer to send typing_start after delay
      typingTimersRef.current[conversationId] = setTimeout(() => {
        onTypingStart?.(conversationId)
        delete typingTimersRef.current[conversationId]
      }, typingStartDelay)
    },
    [onTypingStart, typingStartDelay]
  )

  const stopTyping = useCallback(
    (conversationId: string) => {
      // Clear start timer if it hasn't fired yet
      if (typingTimersRef.current[conversationId]) {
        clearTimeout(typingTimersRef.current[conversationId])
        delete typingTimersRef.current[conversationId]
      }

      // Set timer to send typing_stop after delay
      if (stopTypingTimersRef.current[conversationId]) {
        clearTimeout(stopTypingTimersRef.current[conversationId])
      }

      stopTypingTimersRef.current[conversationId] = setTimeout(() => {
        onTypingStop?.(conversationId)
        delete stopTypingTimersRef.current[conversationId]
      }, typingStopDelay)
    },
    [onTypingStop, typingStopDelay]
  )

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(typingTimersRef.current).forEach(timer => clearTimeout(timer))
      Object.values(stopTypingTimersRef.current).forEach(timer => clearTimeout(timer))
    }
  }, [])

  // Auto-cleanup typing indicators after 5 seconds
  useEffect(() => {
    const cleanupTimers: NodeJS.Timeout[] = []

    Object.entries(typingUsers).forEach(([conversationId, users]) => {
      users.forEach(user => {
        if (user.isTyping) {
          const timer = setTimeout(() => {
            setTypingUsers(prev => {
              const conversationTyping = prev[conversationId] || []
              return {
                ...prev,
                [conversationId]: conversationTyping.filter(t => t.userId !== user.userId)
              }
            })
          }, 5000)
          cleanupTimers.push(timer)
        }
      })
    })

    return () => {
      cleanupTimers.forEach(timer => clearTimeout(timer))
    }
  }, [typingUsers])

  return {
    typingUsers,
    handleUserTyping,
    startTyping,
    stopTyping
  }
}
