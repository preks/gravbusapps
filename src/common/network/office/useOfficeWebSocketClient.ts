import { useEffect } from 'react'
import { useSyncClientAccessToken } from '../useSyncClientAccessToken'
import { officeWebSocketClient } from './OfficeWebSocketClient'

let officeWebSocketConsumerCount = 0

function registerOfficeWebSocketConsumer() {
  officeWebSocketConsumerCount += 1
}

function unregisterOfficeWebSocketConsumer() {
  officeWebSocketConsumerCount -= 1

  if (officeWebSocketConsumerCount <= 0) {
    officeWebSocketConsumerCount = 0
    officeWebSocketClient.disconnect()
  }
}

export function useOfficeWebSocketClient(accessToken?: string) {
  useSyncClientAccessToken(officeWebSocketClient, accessToken)

  useEffect(() => {
    registerOfficeWebSocketConsumer()

    return () => {
      unregisterOfficeWebSocketConsumer()
    }
  }, [])

  useEffect(() => {
    if (!accessToken) {
      if (officeWebSocketConsumerCount === 1) {
        officeWebSocketClient.disconnect()
      }

      return
    }

    officeWebSocketClient.connect(accessToken)
  }, [accessToken])

  return officeWebSocketClient
}
