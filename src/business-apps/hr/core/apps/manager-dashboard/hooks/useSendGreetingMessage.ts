import { useCallback, useState } from 'react'
import { useChatClient } from '@/common/network/chat/useChatClient'
import { toast } from 'sonner'

interface GreetingPerson {
  id: string
  userId?: string
  firstName: string
  lastName: string
  fullName: string
}

interface UseSendGreetingMessageOptions {
  accessToken: string
  greetingType: 'birthday-greeting' | 'anniversary-greeting'
}

export const useSendGreetingMessage = <T extends GreetingPerson>({
  accessToken,
  greetingType
}: UseSendGreetingMessageOptions) => {
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null)
  const [messageDraft, setMessageDraft] = useState<{ person: T; message: string } | null>(null)
  const chatClient = useChatClient(accessToken)

  const sendMessage = useCallback(
    async (person: T, message: string) => {
      const recipientUserId = person.userId || person.id

      if (!recipientUserId) {
        toast.error('Unable to send message for this employee')
        return
      }

      setSendingToUserId(recipientUserId)
      try {
        const currentUser = await chatClient.getCurrentUser()
        const conversation = await chatClient.getOrCreateDirectConversation(recipientUserId)
        await chatClient.sendMessage(conversation.id, message, currentUser.id, undefined, {
          source: 'manager-dashboard',
          type: greetingType,
          aiCustomized: true
        })
        toast.success(`Message sent to ${person.firstName} ${person.lastName}`)
        setMessageDraft(null)
      } catch {
        console.error(`Failed to send ${greetingType} chat message`)
        toast.error('Failed to send message')
      } finally {
        setSendingToUserId(null)
      }
    },
    [chatClient, greetingType]
  )

  return { sendingToUserId, messageDraft, setMessageDraft, sendMessage }
}
