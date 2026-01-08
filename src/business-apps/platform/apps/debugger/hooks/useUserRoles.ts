import { useMemo } from 'react'
import { getUserRoles } from '../utils/jwtParser'

export const useUserRoles = (accessToken: string) => {
  const roles = useMemo(() => {
    if (!accessToken) {
      return []
    }
    try {
      return getUserRoles(accessToken)
    } catch (error) {
      console.error('Failed to parse user roles from JWT:', error)
      return []
    }
  }, [accessToken])

  return roles
}
