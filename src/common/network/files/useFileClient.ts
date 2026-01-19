import { useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { fileClient, FileClient } from './FileClient'

export function useFileClient(contextProps: BusinessAppContextProps): FileClient {
  useEffect(() => {
    if (contextProps.accessToken) {
      fileClient.setAccessToken(contextProps.accessToken)
    }
  }, [contextProps.accessToken])

  return fileClient
}
