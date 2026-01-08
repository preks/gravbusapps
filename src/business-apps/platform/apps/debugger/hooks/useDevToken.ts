import { useState, useCallback } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export const useDevToken = () => {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const restClient = useRestClient('https://keycloak-dev.newwork.com')

  const fetchToken = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const formData = new URLSearchParams()
      formData.append('grant_type', 'client_credentials')
      formData.append('client_id', 'lowcoder-debug')
      formData.append('client_secret', 'j4Vo4sJPIi7INMIi65Li5duFAvR7WpbE')

      const response = await restClient.post<TokenResponse>(
        '/realms/newwork/protocol/openid-connect/token',
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )

      if (response?.access_token) {
        setToken(response.access_token)
      } else {
        setError('No access token in response')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dev token')
      setToken(null)
    } finally {
      setLoading(false)
    }
  }, [restClient])

  return { token, loading, error, fetchToken }
}
