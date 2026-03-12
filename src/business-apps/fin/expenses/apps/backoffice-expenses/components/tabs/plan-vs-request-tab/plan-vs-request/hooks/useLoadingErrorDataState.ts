import { useState } from 'react'

export const useLoadingErrorDataState = <T>(initialData: T) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T>(initialData)

  return {
    loading,
    setLoading,
    error,
    setError,
    data,
    setData
  }
}
