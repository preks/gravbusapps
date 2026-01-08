import { useMemo } from 'react'
import { getUserRoles } from '../utils/jwtParser'

export const useUserRoles = (accessToken: string) => {
  const roles = useMemo(() => {
    if (!accessToken) {
      return []
    }
    return getUserRoles(accessToken)
  }, [accessToken])

  return roles
}
