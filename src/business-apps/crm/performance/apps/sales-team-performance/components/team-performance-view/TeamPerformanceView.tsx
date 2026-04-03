import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Button,
  Alert,
  Spinner,
  DataDisplay,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label,
  RecordLayout
} from '@newwork/nw-design-system'
import {
  UsersIcon,
  UsersThree,
  TrendUpIcon,
  CurrencyDollarIcon,
  TargetIcon,
  CalendarIcon,
  ListChecksIcon,
  ChartLineIcon
} from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesTeamMembersList } from '../sales-members-list'
import { SalesMemberPerformance } from '../sales-member-performance'
import TeamActivitiesCalendar from './components/TeamActivitiesCalendar'
import TeamActivitiesTable from './components/TeamActivitiesTable'
import TeamActivitiesStatistics from './components/TeamActivitiesStatistics'
import TeamOverviewCharts from './components/TeamOverviewCharts'
import { useSingleTeamPerformanceData } from '../../hooks/useSingleTeamPerformanceData'
import { useTeamAnalyticsAggregates } from './hooks/useTeamAnalyticsAggregates'
import { SalesTeamMember } from '../sales-members-list/types'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const DATA_TEST_ID_PREFIX = 'TeamPerformanceView'

// Currency Filter Component
interface CurrencyFilterProps {
  selectedCurrency: string
  currencies: Array<{ code: string; label: string }>
  onCurrencyChange: (currencyCode: string) => void
}

const CurrencyFilter: React.FC<CurrencyFilterProps> = ({ selectedCurrency, currencies, onCurrencyChange }) => {
  if (currencies.length === 0) return null

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${DATA_TEST_ID_PREFIX}-currency-filter`}>
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
      <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
        <SelectTrigger className="gba:w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {currencies.map(currency => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface TeamPerformanceViewProps extends BusinessAppContextProps {
  teamId: string
  teamName: string
  teamMemberIds?: string[] // Optional: Member IDs from OrganizationalUnit
  currencyCode?: string // Currency from Cross-Team Performance Analysis
  onBack?: () => void
  onMemberSelect?: (member: SalesTeamMember) => void
}

type ViewMode = 'overview' | 'calendar' | 'activities' | 'individual'

export const TeamPerformanceView: React.FC<TeamPerformanceViewProps> = ({
  teamId,
  teamName,
  teamMemberIds,
  currencyCode = 'EUR',
  onBack,
  onMemberSelect,
  accessToken,
  userInfo
}) => {
  // Get initial view from URL or default to 'overview'
  const getInitialViewMode = (): ViewMode => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const viewFromUrl = urlParams.get('view') as ViewMode | null

    // Validate that the view exists in our valid modes
    const validModes: ViewMode[] = ['overview', 'calendar', 'activities', 'individual']
    if (viewFromUrl && validModes.includes(viewFromUrl)) {
      return viewFromUrl
    }

    return 'overview'
  }

  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode())
  const [selectedMember, setSelectedMember] = useState<SalesTeamMember | null>(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'totalRevenue', desc: true }])

  // Update URL when view changes
  const updateUrl = useCallback((view: ViewMode) => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    urlParams.set('view', view)
    globalThis.history.pushState({}, '', `${globalThis.location.pathname}?${urlParams.toString()}`)
  }, [])
  const [selectedCurrency, setSelectedCurrency] = useState<string>(currencyCode || 'EUR')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'position',
    'manager',
    'totalRevenue',
    'activityScore'
  ])

  // Use optimized single team performance hook with pagination and search
  const {
    members: rawMembers,
    totalCount: serverTotalCount,
    kpis,
    availableCurrencies,
    isLoading,
    error: dataError,
    refetch
  } = useSingleTeamPerformanceData({
    accessToken,
    teamMemberIds: teamMemberIds || [],
    currencyCode: selectedCurrency,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    search: search,
    orderBy: sorting
  })

  // Get employee IDs for analytics aggregates
  const employeeIds = React.useMemo(() => {
    return (teamMemberIds || []).filter((id): id is string => !!id)
  }, [teamMemberIds])

  // Fetch analytics aggregates ONCE in parent (shared between Overview and Activities tabs)
  const {
    activityTypeAggregates,
    employeeActivityAggregates,
    entityTypeAggregates,
    timelineAggregates,
    totalActivities,
    totalActivitiesLast30Days,
    thisWeekActivities,
    thisWeekActivitiesLast30Days,
    loading: analyticsLoading,
    error: analyticsError,
    loadAggregates,
    retry: retryAnalytics
  } = useTeamAnalyticsAggregates({
    employeeIds,
    accessToken
  })

  // Track if aggregates have been loaded to avoid refetching when switching between Overview/Activities tabs
  const aggregatesLoadedRef = React.useRef(false)
  const lastEmployeeIdsRef = React.useRef<string>('')

  // Load analytics aggregates ONCE when first entering Overview or Activities tab
  React.useEffect(() => {
    const needsAnalytics = viewMode === 'overview' || viewMode === 'activities'
    const employeeIdsKey = employeeIds.join(',')
    const employeeIdsChanged = employeeIdsKey !== lastEmployeeIdsRef.current

    // Only load if:
    // 1. We're on a tab that needs analytics (Overview or Activities)
    // 2. AND either we haven't loaded yet OR the employee IDs changed
    if (needsAnalytics && employeeIds.length > 0) {
      if (!aggregatesLoadedRef.current || employeeIdsChanged) {
        loadAggregates()
        aggregatesLoadedRef.current = true
        lastEmployeeIdsRef.current = employeeIdsKey
      }
    } else if (!needsAnalytics) {
      // Reset flag when navigating away from Overview/Activities tabs
      // So data will refresh if user comes back later
      if (aggregatesLoadedRef.current) {
        aggregatesLoadedRef.current = false
      }
    }
  }, [employeeIds, viewMode, loadAggregates])

  // Transform members to SalesTeamMember format (server-side pagination/search handled by hook)
  const teamMembers = React.useMemo<SalesTeamMember[]>(() => {
    return rawMembers.map(member => ({
      id: member.employeeId,
      employeeId: member.employeeId,
      name: member.employeeName,
      position: member.position,
      totalRevenue: member.totalRevenue,
      currencyId: selectedCurrency, // Use selected currency for display
      activityScore: member.activityScore,
      avatar: member.avatar,
      manager: member.managerId
        ? {
            id: member.managerId,
            name: member.managerName || 'Unknown Manager',
            avatar: member.managerAvatar
          }
        : null
    }))
  }, [rawMembers, selectedCurrency])

  // Use server-provided total count (pagination/search/sort handled server-side)
  const totalMembers = serverTotalCount

  // Team KPIs are now provided by the optimized hook with 30-day comparisons
  const teamKPIs = React.useMemo(() => {
    if (!kpis) return null

    // Transform to old format for compatibility with existing UI
    return {
      totalRevenue: kpis.totalRevenue,
      avgActivityScore: kpis.totalActivities / kpis.memberCount,
      memberCount: kpis.memberCount,
      revenueVsCompany: kpis.revenueChange, // Now shows 30-day change instead of company comparison
      activityVsCompany: kpis.activitiesChange // Now shows 30-day change instead of company comparison
    }
  }, [kpis])

  const handleMemberClick = (member: SalesTeamMember) => {
    setSelectedMember(member)
    setViewMode('individual')
    updateUrl('individual')
    if (onMemberSelect) {
      onMemberSelect(member)
    }
  }

  const handleBackToTeam = () => {
    setSelectedMember(null)
    setViewMode('overview')
    updateUrl('overview')
  }

  // Handle tab change
  const handleViewModeChange = (value: string) => {
    const newMode = value as ViewMode
    setViewMode(newMode)
    updateUrl(newMode)
  }

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    if (!urlParams.has('view')) {
      updateUrl(viewMode)
    }
  }, [])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setCurrentPage(1) // Reset to first page when searching
  }, [])

  // Reset to first page when search or currency changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedCurrency])

  // Available columns for the team members table
  const availableColumns = useMemo(
    () => [
      { id: 'name', label: 'Name' },
      { id: 'position', label: 'Position' },
      { id: 'manager', label: 'Manager' },
      { id: 'totalRevenue', label: 'Total Sales' },
      { id: 'activityScore', label: 'Activity Score' }
    ],
    []
  )

  // Sortable columns for the team members table
  const sortableColumns = useMemo(
    () => [
      { id: 'name', label: 'Name' },
      { id: 'position', label: 'Position' },
      { id: 'manager', label: 'Manager' },
      { id: 'totalRevenue', label: 'Total Sales' },
      { id: 'activityScore', label: 'Activity Score' }
    ],
    []
  )

  // Create team KPI widgets with company comparison
  const createTeamKPIWidgets = (): WidgetItem[] => {
    if (!teamKPIs) return []

    return [
      {
        key: 'team-revenue',
        title: 'Team Revenue',
        value: formatCurrency(teamKPIs.totalRevenue, selectedCurrency),
        prefix: <CurrencyDollarIcon />,
        color: 'hsl(var(--success))',
        description: `${kpis?.memberCount || teamKPIs.memberCount} team members`,
        valueIsString: true,
        trend: {
          value: `${Math.abs(teamKPIs.revenueVsCompany).toFixed(1)}%`,
          positive: teamKPIs.revenueVsCompany >= 0,
          description: 'vs. 30 days ago'
        }
      },
      {
        key: 'team-activity',
        title: 'Team Activity Score',
        value: teamKPIs.avgActivityScore,
        prefix: <TargetIcon />,
        color: '#1677ff',
        description: `Avg per member: ${Math.round(teamKPIs.avgActivityScore)}`,
        precision: 1,
        suffix: '%',
        trend: {
          value: `${Math.abs(teamKPIs.activityVsCompany).toFixed(1)}%`,
          positive: teamKPIs.activityVsCompany >= 0,
          description: 'vs. 30 days ago'
        }
      },
      {
        key: 'team-size',
        title: 'Team Members',
        value: teamKPIs.memberCount,
        prefix: <UsersIcon />,
        color: '#722ed1',
        description: 'Active team members',
        precision: 0,
        trend:
          kpis?.memberCountChange === undefined
            ? undefined
            : {
                value: `${Math.abs(kpis.memberCountChange).toFixed(1)}%`,
                positive: kpis.memberCountChange >= 0,
                description: 'vs. last year'
              }
      },
      {
        key: 'avg-per-member',
        title: 'Avg Revenue per Member',
        value: formatCurrency(teamKPIs.totalRevenue / teamKPIs.memberCount, selectedCurrency),
        prefix: <TrendUpIcon />,
        color: 'hsl(var(--warning))',
        description: 'Average revenue contribution',
        valueIsString: true,
        trend:
          kpis?.avgRevenuePerMemberChange === undefined
            ? undefined
            : {
                value: `${Math.abs(kpis.avgRevenuePerMemberChange).toFixed(1)}%`,
                positive: kpis.avgRevenuePerMemberChange >= 0,
                description: 'vs. 30 days ago'
              }
      }
    ]
  }

  // Header metadata: Team member count (MUST be before early returns)
  const headerMeta = useMemo(() => {
    if (!teamKPIs) return null

    return (
      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
        <span>
          {teamKPIs.memberCount || 0} {teamKPIs.memberCount === 1 ? 'member' : 'members'}
        </span>
      </div>
    )
  }, [teamKPIs])

  // Prepare subviews configuration (tabs) with WIDE content (MUST be before early returns)
  const wideContentClassName = 'gba:py-4 gba:w-full gba:max-w-full'

  const subViewsConfig = useMemo(
    () => ({
      defaultValue: viewMode,
      onValueChange: handleViewModeChange,
      items: [
        {
          value: 'overview',
          label: getTranslationFromI18nKeyAndLabel('crm.performance.overview', 'Overview'),
          icon: <ChartLineIcon className="gba:mr-2" />,
          contentClassName: wideContentClassName,
          content: (
            <div data-testid={`${DATA_TEST_ID_PREFIX}-overview-content`} className="gba:space-y-6">
              {/* Team KPI Statistics */}
              <div className="gba:mb-6" data-testid={`${DATA_TEST_ID_PREFIX}-kpi-section`}>
                <WidgetGroup
                  widgets={createTeamKPIWidgets()}
                  isLoading={isLoading}
                  error={dataError ? new Error(dataError) : null}
                  onRetry={refetch}
                  skeletonCount={4}
                  emptyText="No team performance statistics available."
                  data-testid={`${DATA_TEST_ID_PREFIX}-kpi-widgets`}
                />
              </div>

              {/* Team Members List */}
              <div className="gba:mt-6">
                <DataDisplay
                  titleSections={[
                    {
                      id: 'all',
                      label: 'Team Members',
                      metadata: {
                        count: totalMembers,
                        isLoading: isLoading
                      }
                    }
                  ]}
                  currentSection="all"
                  searchValue={search}
                  searchPlaceholder="Search team members..."
                  onSearchChange={handleSearch}
                  sorting={sorting}
                  sortableColumns={sortableColumns}
                  onSortingChange={setSorting}
                  availableColumns={availableColumns}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  secondaryActions={
                    <CurrencyFilter
                      selectedCurrency={selectedCurrency}
                      currencies={availableCurrencies}
                      onCurrencyChange={setSelectedCurrency}
                    />
                  }
                  toolbarDensity="default"
                >
                  <SalesTeamMembersList
                    members={teamMembers}
                    loading={isLoading}
                    error={dataError ? new Error(dataError) : null}
                    onRetry={refetch}
                    onMemberClick={handleMemberClick}
                    accessToken={accessToken}
                    total={totalMembers}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    search={search}
                    sorting={sorting}
                    onSearchChange={setSearch}
                    onSortingChange={setSorting}
                    onPaginationChange={(page, size) => {
                      setCurrentPage(page)
                      setPageSize(size || pageSize)
                    }}
                  />
                </DataDisplay>
              </div>

              {/* Team Analytics Charts */}
              <div className="gba:mt-6">
                <TeamOverviewCharts
                  accessToken={accessToken}
                  userInfo={userInfo}
                  activityTypeAggregates={activityTypeAggregates}
                  employeeActivityAggregates={employeeActivityAggregates}
                  entityTypeAggregates={entityTypeAggregates}
                  timelineAggregates={timelineAggregates}
                  totalActivities={totalActivities}
                  loading={analyticsLoading}
                />
              </div>
            </div>
          )
        },
        {
          value: 'activities',
          label: getTranslationFromI18nKeyAndLabel('crm.performance.activities', 'Activities'),
          icon: <ListChecksIcon className="gba:mr-2" />,
          contentClassName: wideContentClassName,
          content: (
            <div data-testid={`${DATA_TEST_ID_PREFIX}-activities-content`} className="gba:space-y-6">
              {/* Activities Statistics Section */}
              <div className="gba:mb-6">
                <TeamActivitiesStatistics
                  teamMembers={teamMembers}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  activityTypeAggregates={activityTypeAggregates}
                  totalActivities={totalActivities}
                  totalActivitiesLast30Days={totalActivitiesLast30Days}
                  thisWeekActivities={thisWeekActivities}
                  thisWeekActivitiesLast30Days={thisWeekActivitiesLast30Days}
                  loading={analyticsLoading}
                  error={analyticsError}
                  retry={retryAnalytics}
                />
              </div>

              {/* Activities Table */}
              <TeamActivitiesTable teamMembers={teamMembers} accessToken={accessToken} userInfo={userInfo} />
            </div>
          )
        },
        {
          value: 'calendar',
          label: getTranslationFromI18nKeyAndLabel('crm.performance.calendar', 'Calendar'),
          icon: <CalendarIcon className="gba:mr-2" />,
          contentClassName: wideContentClassName,
          content: (
            <div data-testid={`${DATA_TEST_ID_PREFIX}-calendar-content`}>
              <TeamActivitiesCalendar
                teamId={teamId}
                teamMembers={teamMembers}
                accessToken={accessToken}
                userInfo={userInfo}
              />
            </div>
          )
        }
      ]
    }),
    [
      viewMode,
      handleViewModeChange,
      teamKPIs,
      isLoading,
      dataError,
      refetch,
      totalMembers,
      search,
      handleSearch,
      sorting,
      setSorting,
      sortableColumns,
      availableColumns,
      visibleColumns,
      setVisibleColumns,
      selectedCurrency,
      availableCurrencies,
      setSelectedCurrency,
      teamMembers,
      handleMemberClick,
      accessToken,
      userInfo,
      currentPage,
      pageSize,
      setSearch,
      setSorting,
      activityTypeAggregates,
      employeeActivityAggregates,
      entityTypeAggregates,
      timelineAggregates,
      totalActivities,
      totalActivitiesLast30Days,
      thisWeekActivities,
      thisWeekActivitiesLast30Days,
      analyticsLoading,
      analyticsError,
      retryAnalytics,
      teamId
    ]
  )

  // Only show loading spinner if we have no data at all
  const showLoadingSpinner = isLoading && !teamKPIs && teamMembers.length === 0

  if (showLoadingSpinner) {
    return (
      <div
        className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-screen"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner size="lg" />
        <p className="gba:text-gray-600 gba:mt-4">Loading team data for {teamName}...</p>
        <p className="gba:text-xs gba:text-gray-400 gba:mt-2">This should only take a moment</p>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <Alert variant="destructive">
          <span>Error loading team performance data</span>
          <Button variant="outline" size="sm" onClick={refetch} className="gba:ml-2">
            Retry
          </Button>
        </Alert>
      </div>
    )
  }

  // Show individual performance if member selected
  if (viewMode === 'individual' && selectedMember) {
    return (
      <SalesMemberPerformance
        memberId={selectedMember.employeeId || selectedMember.id}
        accessToken={accessToken}
        userInfo={userInfo}
        onBack={handleBackToTeam}
        initialTab="performance"
      />
    )
  }

  return (
    <>
      <style>
        {`
          .record-layout-content {
            padding-left: 0 !important;
            padding-right: 0 !important;
            max-width: 100% !important;
          }
        `}
      </style>
      <RecordLayout
        data-testid={DATA_TEST_ID_PREFIX}
        headerOrientation="horizontal"
        headerIcon={UsersThree}
        headerCategory={getTranslationFromI18nKeyAndLabel('crm.performance.team', 'TEAM OVERVIEW')}
        onBack={onBack}
        headerTitle={teamName}
        headerMeta={headerMeta}
        subViews={subViewsConfig}
      />
    </>
  )
}

export default TeamPerformanceView
