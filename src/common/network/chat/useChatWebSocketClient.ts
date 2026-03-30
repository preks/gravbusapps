import { useEffect } from 'react'
import { useSyncClientAccessToken } from '../useSyncClientAccessToken'
import { chatWebSocketClient } from './ChatWebSocketClient'

let chatWebSocketConsumerCount = 0

function registerChatWebSocketConsumer() {
  chatWebSocketConsumerCount += 1
}

function unregisterChatWebSocketConsumer() {
  chatWebSocketConsumerCount -= 1

  if (chatWebSocketConsumerCount <= 0) {
    chatWebSocketConsumerCount = 0
    chatWebSocketClient.disconnect()
  }
}

export function useChatWebSocketClient(accessToken?: string) {
  useSyncClientAccessToken(chatWebSocketClient, accessToken)

  useEffect(() => {
    registerChatWebSocketConsumer()

    return () => {
      unregisterChatWebSocketConsumer()
    }
  }, [])

  useEffect(() => {
    if (!accessToken) {
      if (chatWebSocketConsumerCount === 1) {
        chatWebSocketClient.disconnect()
      }

      return
    }

    chatWebSocketClient.connect(accessToken)
  }, [accessToken])

  return chatWebSocketClient
}
