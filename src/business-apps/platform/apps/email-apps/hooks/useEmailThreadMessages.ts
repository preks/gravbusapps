import { useEffect, useRef, useState } from 'react'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailMessage } from '../types'

interface UseEmailThreadMessagesArgs {
  message: EmailMessage | null
  threadEnabled: boolean
}

export const useEmailThreadMessages = ({ message, threadEnabled }: UseEmailThreadMessagesArgs) => {
  const [threadMessages, setThreadMessages] = useState<EmailMessage[]>([])
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const lastThreadIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!message?.threadId || !threadEnabled) {
      setThreadMessages([])
      lastThreadIdRef.current = null
      return
    }

    if (lastThreadIdRef.current === message.threadId) return
    lastThreadIdRef.current = message.threadId
    setThreadMessages([])

    let cancelled = false
    setIsLoadingThread(true)
    EmailApiService.getThread(message.threadId)
      .then(messages => {
        if (!cancelled) setThreadMessages(messages)
      })
      .catch(() => {
        if (!cancelled) setThreadMessages([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingThread(false)
      })

    return () => {
      cancelled = true
    }
  }, [message?.threadId, message?.id, threadEnabled])

  const showThread =
    threadEnabled && threadMessages.length > 1 && !!message?.threadId && lastThreadIdRef.current === message.threadId

  return { threadMessages, isLoadingThread, showThread }
}
