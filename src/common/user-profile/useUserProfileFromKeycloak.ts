import { useEffect, useMemo, useState } from 'react'
import type { KeycloakTokenParsed } from 'keycloak-js'
import { useUserManagementClient } from '@/common/network/users/useUserManagementClient'
import type { User } from '@/common/network/users/types'
import type { UserInfoProps } from '@/common/BusinessAppContext'

type EmployeePosition = {
  organizationalUnitId: string
  siteLocationId: string
  supervisorEmployeeId?: string
  supervisor?: {
    firstName: string
    lastName: string
    id: string
    userId: string
  }
  organizationalUnit?: {
    name: string
  }
}

type Employee = {
  pictureThumbnail: string
  picture: string
  id: string
  firstName: string
  lastName: string
  employeePosition: EmployeePosition
}

export interface UseUserProfileFromKeycloakResult {
  loading: boolean
  error?: Error
  user?: User
  employee?: Employee
  userInfo?: UserInfoProps
}

function buildBasicUserInfoFromClaims(claims?: KeycloakTokenParsed): UserInfoProps | undefined {
  if (!claims) return undefined

  const id = (claims.sub as string | undefined) ?? ''
  const userName =
    (claims.preferredUsername as string | undefined) ?? (claims.preferred_username as string | undefined) ?? ''
  const givenName = (claims.givenName as string | undefined) ?? (claims.given_name as string | undefined) ?? ''
  const familyName = (claims.familyName as string | undefined) ?? (claims.family_name as string | undefined) ?? ''
  const nickName = (claims.nickname as string | undefined) ?? (claims.nick_name as string | undefined) ?? ''

  if (!id && !userName && !givenName && !familyName) {
    return undefined
  }

  return {
    id,
    userName,
    givenName,
    familyName,
    nickName,
    tenantId: (claims as any)?.tenantId ?? '',
    employeeDetails: {
      employeeId: '',
      firstName: givenName,
      lastName: familyName,
      supervisor: {
        id: '',
        firstName: '',
        lastName: '',
        userId: ''
      },
      organizationalUnit: {
        id: '',
        name: ''
      }
    }
  }
}

function mapUserAndEmployeeToUserInfo(
  user: User | undefined,
  employee: Employee | undefined,
  claims?: KeycloakTokenParsed
): UserInfoProps | undefined {
  const basic = buildBasicUserInfoFromClaims(claims)

  if (!employee && !basic && !user) return undefined

  const supervisor = employee?.employeePosition?.supervisor
  const orgUnit = employee?.employeePosition?.organizationalUnit

  const employeeId = employee?.id ?? user?.employeeId ?? basic?.employeeDetails.employeeId ?? ''
  const firstName = employee?.firstName ?? user?.givenName ?? basic?.employeeDetails.firstName ?? basic?.givenName ?? ''
  const lastName = employee?.lastName ?? user?.familyName ?? basic?.employeeDetails.lastName ?? basic?.familyName ?? ''

  return {
    id: user?.id ?? basic?.id ?? (claims?.sub as string | undefined) ?? '',
    userName: user?.preferredUsername ?? basic?.userName ?? (claims?.preferred_username as string | undefined) ?? '',
    givenName: user?.givenName ?? basic?.givenName ?? (claims?.given_name as string | undefined) ?? '',
    familyName: user?.familyName ?? basic?.familyName ?? (claims?.family_name as string | undefined) ?? '',
    nickName: user?.nickname ?? basic?.nickName ?? '',
    tenantId: user?.tenantId ?? basic?.tenantId,
    employeeDetails: {
      employeeId,
      firstName,
      lastName,
      supervisor: {
        id: supervisor?.id ?? basic?.employeeDetails.supervisor.id ?? '',
        firstName: supervisor?.firstName ?? basic?.employeeDetails.supervisor.firstName ?? '',
        lastName: supervisor?.lastName ?? basic?.employeeDetails.supervisor.lastName ?? '',
        userId: supervisor?.userId ?? basic?.employeeDetails.supervisor.userId ?? ''
      },
      organizationalUnit: {
        id: employee?.employeePosition?.organizationalUnitId ?? basic?.employeeDetails.organizationalUnit.id ?? '',
        name: orgUnit?.name ?? basic?.employeeDetails.organizationalUnit.name ?? ''
      }
    }
  }
}

export function useUserProfileFromKeycloak(
  accessToken?: string,
  tokenParsed?: KeycloakTokenParsed
): UseUserProfileFromKeycloakResult {
  const [state, setState] = useState<UseUserProfileFromKeycloakResult>({
    loading: false
  })

  const userClient = useUserManagementClient(accessToken ?? '')

  const userId = useMemo(() => (tokenParsed?.sub as string | undefined) ?? undefined, [tokenParsed?.sub])

  useEffect(() => {
    if (!accessToken || !userId) {
      setState({
        loading: false,
        userInfo: buildBasicUserInfoFromClaims(tokenParsed)
      })
      return
    }

    let cancelled = false

    setState(prev => ({
      ...prev,
      loading: true,
      error: undefined
    }))
    ;(async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'run-1',
            hypothesisId: 'H2',
            location: 'useUserProfileFromKeycloak.ts:190',
            message: 'User profile fetch started',
            data: { hasAccessToken: Boolean(accessToken), hasUserId: Boolean(userId) },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion
        const userProfile = await userClient.getUserById(userId)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'run-2',
            hypothesisId: 'H2',
            location: 'useUserProfileFromKeycloak.ts:199',
            message: 'Employee GraphQL skipped due backend DB errors',
            data: { userIdPresent: Boolean(userId) },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion

        if (cancelled) return

        const employee = undefined
        const userInfo = mapUserAndEmployeeToUserInfo(userProfile, employee, tokenParsed)

        setState({
          loading: false,
          user: userProfile,
          employee,
          userInfo
        })
      } catch (err) {
        if (cancelled) return

        const error = err instanceof Error ? err : new Error(String(err))
        console.error('[UserProfile] Failed to fetch profile from GraphQL', error)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'run-1',
            hypothesisId: 'H3',
            location: 'useUserProfileFromKeycloak.ts:231',
            message: 'User profile outer catch hit',
            data: { errorMessage: error.message.slice(0, 200) },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion

        setState({
          loading: false,
          error,
          user: undefined,
          employee: undefined,
          userInfo: buildBasicUserInfoFromClaims(tokenParsed)
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, userId, tokenParsed])

  return state
}
