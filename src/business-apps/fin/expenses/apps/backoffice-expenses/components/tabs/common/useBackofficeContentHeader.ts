import { type ReactNode, useEffect } from 'react'

const useBackofficeContentHeader = (
  onContentHeaderChange: ((header: ReactNode) => void) | undefined,
  header: ReactNode
) => {
  useEffect(() => {
    if (onContentHeaderChange) {
      onContentHeaderChange(header)
    }
  }, [onContentHeaderChange, header])
}

export default useBackofficeContentHeader
