import { useEffect, useMemo, useState } from 'react'
import type { KeycloakTokenParsed } from 'keycloak-js'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useUserManagementClient } from '@/common/network/users/useUserManagementClient'
import type { User } from '@/common/network/users/types'
import type { UserInfoProps } from '@/common/BusinessAppContext'

const GET_USER_PROFILE = `
query getUserProfile($userId: String!) {
  Employee(
    where: {
      userId: { _eq: $userId }
      isDeleted: { _eq: false }
    }
    limit: 1
  ) {
    pictureThumbnail
    picture
    id
    firstName
    lastName
    employeePosition {
      jobPosition {
        name
      }
      organizationalUnit {
        name
      }
      organizationalUnitId
      siteLocationId
      supervisorEmployeeId
      supervisor {
        id
        userId
        firstName
        lastName
      }
    }
  }
}
`

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
  jobPosition?: {
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

type UserProfileResponse = {
  Employee: Employee[]
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
  const jobPositionName = employee?.employeePosition?.jobPosition?.name

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
      pictureThumbnail: employee?.pictureThumbnail,
      jobTitle: jobPositionName,
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

  const client = useGraphQLClient(accessToken)
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
        const [employeeData, userProfile] = await Promise.all([
          client.request<UserProfileResponse>(GET_USER_PROFILE, {
            userId
          }),
          userClient.getUserById(userId)
        ])

        if (cancelled) return

        const employee = employeeData.Employee?.[0]
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
  }, [accessToken, userId, client, tokenParsed])

  return state
}
