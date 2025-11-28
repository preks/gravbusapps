import React, { useState, useEffect } from 'react'
import { Alert, Button } from '@newwork/nw-design-system'
import { PiHouse, PiUsersThree, PiUser, PiSpinner } from 'react-icons/pi'
import { SalesMemberPerformance } from './components/sales-member-performance'
import { TeamPerformanceView } from './components/team-performance-view/TeamPerformanceView'
import { CEOTeamComparisonDashboard } from './components/ceo-team-comparison/CEOTeamComparisonDashboard'
import { SimpleBypass } from './components/debug/SimpleBypass'
import { useUserRole } from './hooks/useUserRole'
import { useTeamsData } from './hooks/useTeamsData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesTeamMember } from './components/sales-members-list/types'

interface SalesTeamPerformanceOverviewProps extends BusinessAppContextProps {
  loading?: boolean
  error?: Error | null
  onRetry?: () => void
}

const DATA_TEST_ID_PREFIX = 'SalesTeamPerformanceOverview'

type NavigationView = 'company' | 'team' | 'individual'

interface NavigationState {
  view: NavigationView
  selectedTeamId?: string
  selectedTeamName?: string
  selectedMemberId?: string
  selectedMemberName?: string
  selectedCurrency?: string
}

/**
 * Sales Team Performance Overview component with navigation to individual member performance
 */
export const SalesTeamPerformanceOverview: React.FC<SalesTeamPerformanceOverviewProps> = ({
  accessToken,
  userInfo
}) => {
  // Role detection
  const {
    role,
    canViewAllTeams,
    managedTeamId,
    managedTeamName,
    isLoading: roleLoading,
    error: roleError
  } = useUserRole({ accessToken, userInfo })

  // Get initial navigation state from URL parameters
  const getInitialNavigationState = (): NavigationState => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const teamIdFromUrl = urlParams.get('teamId')
    const employeeIdFromUrl = urlParams.get('employeeId')

    // If URL has parameters, try to restore the state
    if (employeeIdFromUrl && teamIdFromUrl) {
      return {
        view: 'individual',
        selectedTeamId: teamIdFromUrl,
        selectedMemberId: employeeIdFromUrl
      }
    } else if (teamIdFromUrl) {
      return {
        view: 'team',
        selectedTeamId: teamIdFromUrl
      }
    }

    // Default: will be set by role detection
    return { view: 'company' }
  }

  // Check for debug mode in URL
  const urlParams = new URLSearchParams(globalThis.location.search)
  const debugMode = urlParams.get('debug') === 'true'

  // Only use 'view' parameter if it's a navigation-level view (company/team/individual)
  // Tab-level views (overview/calendar/activities) should be ignored by parent
  const viewFromUrl = urlParams.get('view')
  const validNavigationViews = ['company', 'team', 'individual']
  const forceView =
    viewFromUrl && validNavigationViews.includes(viewFromUrl)
      ? (viewFromUrl as 'company' | 'team' | 'individual')
      : null

  // Debug mode state
  const [useDebugBypass, setUseDebugBypass] = useState(debugMode)

  // Navigation state - enhanced for three-tier structure
  const [navigationState, setNavigationState] = useState<NavigationState>(getInitialNavigationState())

  // Fetch real teams data from API
  const {
    teams: availableTeams,
    isLoading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams
  } = useTeamsData({ accessToken })

  // Set initial view based on user role (only if no URL parameters)
  useEffect(() => {
    if (!roleLoading && role) {
      // Read fresh URL parameters
      const currentUrlParams = new URLSearchParams(globalThis.location.search)
      const teamIdFromUrl = currentUrlParams.get('teamId')
      const employeeIdFromUrl = currentUrlParams.get('employeeId')

      // Only set default view if no URL parameters exist
      if (!teamIdFromUrl && !employeeIdFromUrl) {
        if (role === 'ceo') {
          setNavigationState({ view: 'company' })
        } else if (role === 'manager' && managedTeamId && managedTeamName) {
          setNavigationState({
            view: 'team',
            selectedTeamId: managedTeamId,
            selectedTeamName: managedTeamName
          })
        } else {
          setNavigationState({ view: 'individual' })
        }
      }
    }
  }, [roleLoading, role, managedTeamId, managedTeamName])

  // Enrich navigation state with team/member names from loaded data
  useEffect(() => {
    if (!teamsLoading && availableTeams.length > 0) {
      // Read fresh URL parameters
      const currentUrlParams = new URLSearchParams(globalThis.location.search)
      const teamIdFromUrl = currentUrlParams.get('teamId')
      const employeeIdFromUrl = currentUrlParams.get('employeeId')

      if (
        teamIdFromUrl &&
        (!navigationState.selectedTeamName || (employeeIdFromUrl && !navigationState.selectedMemberName))
      ) {
        const team = availableTeams.find(t => t.id === teamIdFromUrl)
        if (team) {
          setNavigationState(prev => ({
            ...prev,
            selectedTeamName: team.name,
            // If there's an employeeId, try to find the member name
            ...(employeeIdFromUrl &&
              team.members && {
                selectedMemberName: team.members.find(m => m.employeeId === employeeIdFromUrl)?.fullName
              })
          }))
        }
      }
    }
  }, [teamsLoading, availableTeams, navigationState.selectedTeamName, navigationState.selectedMemberName])

  // Add timeout fallback to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (roleLoading) {
        console.warn('Role loading timeout - enabling debug bypass automatically')
        setUseDebugBypass(true)
      }
    }, 5000)

    return () => clearTimeout(timeoutId)
  }, [roleLoading])

  // Handle URL force view parameter (only for debug mode without other params)
  useEffect(() => {
    if (forceView && !roleLoading) {
      // Only use forceView for debug mode if there are no other navigation parameters
      const currentUrlParams = new URLSearchParams(globalThis.location.search)
      const teamIdFromUrl = currentUrlParams.get('teamId')
      const employeeIdFromUrl = currentUrlParams.get('employeeId')

      // Only trigger debug view selection if no real navigation params exist
      if (!teamIdFromUrl && !employeeIdFromUrl) {
        handleDebugViewSelection(forceView)
      }
    }
  }, [forceView, roleLoading])

  // Handle debug bypass view selection
  const handleDebugViewSelection = (view: 'company' | 'team' | 'individual') => {
    setUseDebugBypass(false)

    if (view === 'team') {
      setNavigationState({
        view: 'team',
        selectedTeamId: 'team-1',
        selectedTeamName: 'Enterprise Sales'
      })
    } else {
      setNavigationState({ view })
    }
  }

  // Navigation Handlers
  const handleTeamSelect = (teamId: string, teamName?: string, currency?: string) => {
    const team = availableTeams.find(t => t.id === teamId)
    if (team) {
      setNavigationState({
        view: 'team',
        selectedTeamId: teamId,
        selectedTeamName: teamName || team.name,
        selectedCurrency: currency || 'EUR' // Default to EUR if not provided
      })
      updateUrlWithParams({ teamId, employeeId: null })
      // Set the view to 'overview' when first selecting a team
      const url = new URL(window.location.href)
      url.searchParams.set('view', 'overview')
      window.history.pushState({}, '', url.toString())
    }
  }

  const handleMemberSelect = (member: SalesTeamMember) => {
    if (!member) {
      console.error('handleMemberSelect: member is undefined')
      return
    }
    setNavigationState({
      ...navigationState,
      view: 'individual',
      selectedMemberId: member.employeeId || member.id,
      selectedMemberName: member.name
    })
    updateUrlWithParams({
      teamId: navigationState.selectedTeamId,
      employeeId: member.employeeId || member.id
    })
  }

  const handleBackToCompany = () => {
    setNavigationState({ view: 'company' })
    updateUrlWithParams({ teamId: null, employeeId: null })
    // Clear the view parameter when going back to company view
    const url = new URL(window.location.href)
    url.searchParams.delete('view')
    window.history.pushState({}, '', url.toString())
  }

  const handleBackToTeam = () => {
    setNavigationState({
      view: 'team',
      selectedTeamId: navigationState.selectedTeamId,
      selectedTeamName: navigationState.selectedTeamName
    })
    updateUrlWithParams({
      teamId: navigationState.selectedTeamId,
      employeeId: null
    })
    // Reset the view parameter to 'overview' when going back to team view
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'overview')
    window.history.pushState({}, '', url.toString())
  }

  // Enhanced URL management
  const updateUrlWithParams = (params: { teamId?: string | null; employeeId?: string | null }) => {
    const url = new URL(window.location.href)

    if (params.teamId) {
      url.searchParams.set('teamId', params.teamId)
    } else if (params.teamId === null) {
      url.searchParams.delete('teamId')
    }

    if (params.employeeId) {
      url.searchParams.set('employeeId', params.employeeId)
    } else if (params.employeeId === null) {
      url.searchParams.delete('employeeId')
    }

    window.history.pushState({}, '', url.toString())
  }

  // Legacy handlers for backward compatibility
  const handleBackToTeamList = () => {
    if (navigationState.selectedTeamId) {
      handleBackToTeam()
    } else {
      handleBackToCompany()
    }
  }

  // Simple Breadcrumb Navigation
  const renderBreadcrumbs = () => (
    <div
      className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600 gba:mb-4"
      data-testid={`${DATA_TEST_ID_PREFIX}-breadcrumbs`}
    >
      <button
        onClick={() => canViewAllTeams && handleBackToCompany()}
        className={`gba:flex gba:items-center gba:gap-1 gba:hover:text-blue-600 ${canViewAllTeams ? 'gba:cursor-pointer' : 'gba:cursor-default'}`}
        disabled={!canViewAllTeams}
      >
        <PiHouse className="gba:w-4 gba:h-4" />
        Sales Performance
      </button>

      {navigationState.view !== 'company' && navigationState.selectedTeamName && (
        <>
          <span className="gba:text-gray-400">/</span>
          <button
            onClick={() => navigationState.view === 'individual' && handleBackToTeam()}
            className={`gba:flex gba:items-center gba:gap-1 gba:hover:text-blue-600 ${navigationState.view === 'individual' ? 'gba:cursor-pointer' : 'gba:cursor-default'}`}
            disabled={navigationState.view !== 'individual'}
          >
            <PiUsersThree className="gba:w-4 gba:h-4" />
            {navigationState.selectedTeamName}
          </button>
        </>
      )}

      {navigationState.view === 'individual' && navigationState.selectedMemberName && (
        <>
          <span className="gba:text-gray-400">/</span>
          <span className="gba:flex gba:items-center gba:gap-1 gba:text-gray-900">
            <PiUser className="gba:w-4 gba:h-4" />
            {navigationState.selectedMemberName}
          </span>
        </>
      )}
    </div>
  )

  // Show debug bypass if enabled
  if (useDebugBypass) {
    return <SimpleBypass onSelectView={handleDebugViewSelection} />
  }

  // Show loading state for role detection
  if (roleLoading) {
    return (
      <div
        className="gba:bg-hsl(var(--background)) gba:min-h-screen gba:p-6 gba:flex gba:items-center gba:justify-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-role-loading`}
      >
        <div className="gba:text-center">
          <PiSpinner className="gba:w-8 gba:h-8 gba:animate-spin gba:mx-auto gba:mb-2" />
          <p className="gba:text-gray-600">Loading user permissions...</p>
          <p className="gba:text-xs gba:text-gray-400 gba:mt-2">This should only take a moment...</p>
          <Button onClick={() => setUseDebugBypass(true)} variant="outline" size="sm" className="gba:mt-4">
            Use Debug Mode
          </Button>
        </div>
      </div>
    )
  }

  // Show role error
  if (roleError) {
    return (
      <div
        className="gba:bg-hsl(var(--background)) gba:min-h-screen gba:p-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-role-error`}
      >
        <Alert variant="destructive">
          <span>Error loading user permissions: {roleError ?? 'Unknown error'}</span>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gba:ml-2">
            Refresh
          </Button>
        </Alert>
      </div>
    )
  }

  // Show teams loading
  if (teamsLoading) {
    return (
      <div
        className="gba:bg-hsl(var(--background)) gba:min-h-screen gba:p-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        {renderBreadcrumbs()}
        <div className="gba:mt-6">
          <div className="gba:text-center gba:py-8">
            <PiSpinner className="gba:w-8 gba:h-8 gba:animate-spin gba:mx-auto gba:mb-4" />
            <p className="gba:text-gray-600">Loading teams data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show teams error
  if (teamsError) {
    return (
      <div
        className="gba:bg-hsl(var(--background)) gba:min-h-screen gba:p-6"
        data-testid={`${DATA_TEST_ID_PREFIX}-error`}
      >
        <Alert variant="destructive">
          <div className="gba:space-y-2">
            <div>Error loading teams data:</div>
            <div className="gba:text-sm">{teamsError ?? 'Unknown error'}</div>
          </div>
          <div className="gba:flex gba:gap-2 gba:mt-4">
            <Button variant="outline" size="sm" onClick={refetchTeams}>
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  // Render based on navigation state and user role
  const renderContent = () => {
    const baseProps = {
      accessToken,
      userInfo
    }

    switch (navigationState.view) {
      case 'company':
        // CEO view - company overview with team comparison
        if (role === 'ceo') {
          return (
            <CEOTeamComparisonDashboard
              {...baseProps}
              availableTeams={availableTeams}
              onTeamSelect={handleTeamSelect}
            />
          )
        }
        // ✅ Fallback: Non-CEO shouldn't reach company view
        return (
          <Alert variant="destructive">
            <div>Access denied: You don't have permission to view company-wide data.</div>
          </Alert>
        )

      case 'team':
        // Team manager view - team performance with member list
        if (navigationState.selectedTeamId) {
          const selectedTeam = availableTeams.find(t => t.id === navigationState.selectedTeamId)

          // Use team name from state or from loaded team data as fallback
          const teamName = navigationState.selectedTeamName || selectedTeam?.name || 'Team'

          return (
            <TeamPerformanceView
              {...baseProps}
              teamId={navigationState.selectedTeamId}
              teamName={teamName}
              teamMemberIds={selectedTeam?.memberIds}
              currencyCode={navigationState.selectedCurrency || 'EUR'}
              onBack={canViewAllTeams ? handleBackToCompany : undefined}
              onMemberSelect={handleMemberSelect}
            />
          )
        }
        // ✅ Fallback: Team view without team ID
        return (
          <Alert variant="destructive">
            <div>Error: No team selected. Please select a team to view performance data.</div>
          </Alert>
        )

      case 'individual':
        // Individual view - personal performance
        if (navigationState.selectedMemberId) {
          return (
            <SalesMemberPerformance
              memberId={navigationState.selectedMemberId}
              accessToken={accessToken}
              userInfo={userInfo}
              onBack={handleBackToTeamList}
              initialTab="performance"
            />
          )
        }
        // ✅ Fallback: Individual view without member ID
        return (
          <Alert variant="destructive">
            <div>Error: No member selected. Please select a team member to view performance data.</div>
          </Alert>
        )

      default:
        return (
          <Alert variant="destructive">
            <div>Error: Unknown view state.</div>
          </Alert>
        )
    }
  }

  return (
    <div
      className="gba:bg-hsl(var(--background)) gba:min-h-screen gba:p-6 gba:space-y-6"
      style={{ backgroundColor: 'hsl(var(--background))' }}
      data-testid={DATA_TEST_ID_PREFIX}
    >
      {/* Breadcrumb Navigation */}
      {renderBreadcrumbs()}

      {/* Main Content */}
      {renderContent()}
    </div>
  )
}

export default SalesTeamPerformanceOverview
