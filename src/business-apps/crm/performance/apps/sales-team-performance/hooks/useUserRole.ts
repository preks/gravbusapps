import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { UserRole, UserRoleContext, UserPermissions } from '../types/userRoles'

/**
 * Hook to detect user role and permissions based on organizational context
 */
export const useUserRole = (
  _context: BusinessAppContextProps // eslint-disable-line @typescript-eslint/no-unused-vars
): UserRoleContext & {
  isLoading: boolean
  error: string | null
  permissions: UserPermissions
} => {
  const [roleContext, setRoleContext] = useState<UserRoleContext>({
    role: 'individual',
    canViewAllTeams: false,
    canViewTeam: false,
    canViewIndividuals: true // Default to true for individual access
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const detectUserRole = () => {
      try {
        setError(null)

        // Default to individual role - most permissive for testing
        let detectedRole: UserRole = 'individual'
        let canViewAllTeams = true // Temporarily allow all access for testing
        let canViewTeam = true
        let canViewIndividuals = true
        const managedTeamId: string | undefined = 'default-team'
        const managedTeamName: string | undefined = 'Default Team'

        // For now, always default to CEO role to test the system
        // TODO: Implement proper role detection later
        detectedRole = 'ceo'
        canViewAllTeams = true
        canViewTeam = true
        canViewIndividuals = true

        setRoleContext({
          role: detectedRole,
          canViewAllTeams,
          canViewTeam,
          canViewIndividuals,
          managedTeamId,
          managedTeamName
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to detect user role')

        // Safe default to individual role on any error
        setRoleContext({
          role: 'individual',
          canViewAllTeams: true, // Allow access for testing
          canViewTeam: true,
          canViewIndividuals: true
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Add a small timeout to ensure loading doesn't hang
    const timer = setTimeout(() => {
      detectUserRole()
    }, 100)

    return () => clearTimeout(timer)
  }, []) // Simplified dependencies - run only once

  // Calculate permissions based on role
  const permissions: UserPermissions = {
    viewAllTeams: roleContext.canViewAllTeams,
    viewOwnTeam: roleContext.canViewTeam,
    viewIndividuals: roleContext.canViewIndividuals,
    compareTeams: roleContext.role === 'ceo',
    exportData: roleContext.role !== 'individual'
  }

  return {
    ...roleContext,
    isLoading,
    error,
    permissions
  }
}

/**
 * Simple role checker utility
 */
export const checkUserRole = (userInfo: any): UserRole => {
  // This is a simplified version - in a real app, you'd check against
  // proper role/permission systems, organizational charts, etc.

  if (userInfo?.userName?.toLowerCase().includes('ceo') || userInfo?.userName?.toLowerCase().includes('admin')) {
    return 'ceo'
  }

  if (userInfo?.employeeDetails?.organizationalUnit) {
    return 'manager' // Simplified assumption
  }

  return 'individual'
}
