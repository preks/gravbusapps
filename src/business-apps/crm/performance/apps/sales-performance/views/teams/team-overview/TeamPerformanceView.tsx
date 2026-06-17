import React, { useState, useMemo, useCallback } from 'react'
import {
  Button,
  Alert,
  Spinner,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label
} from '@newwork/nw-design-system'
import type { SortingState } from '@tanstack/react-table'
import { UsersIcon, TrendUpIcon, CurrencyDollarIcon, TrophyIcon, ArrowLeftIcon } from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import TeamOverviewCharts from './components/TeamOverviewCharts'
import TeamMembersTable from './components/TeamMembersTable'
import { useSingleTeamPerformanceData } from '../../../hooks/useSingleTeamPerformanceData'
import { SalesTeamMember } from '../../../types/teamMemberTypes'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const DATA_TEST_ID_PREFIX = 'TeamPerformanceView'

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
  teamMemberIds?: string[]
  membersLoading?: boolean
  currencyCode?: string
  onBack?: () => void
}

export const TeamPerformanceView: React.FC<TeamPerformanceViewProps> = ({
  teamId,
  teamName,
  teamMemberIds,
  membersLoading = false,
  currencyCode = 'EUR',
  onBack,
  accessToken
}) => {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalRevenue', desc: true }])

  const [selectedCurrency, setSelectedCurrency] = useState<string>(currencyCode || 'EUR')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'position', 'totalRevenue'])

  const hookSorting = useMemo(() => sorting.map(sort => ({ id: sort.id, desc: sort.desc })), [sorting])

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
    search,
    // Scope free-text search to the visible columns only while a search is active.
    searchColumns: search.trim() ? visibleColumns : undefined,
    orderBy: hookSorting
  })

  const employeeIds = useMemo(() => {
    return (teamMemberIds || []).filter((id): id is string => !!id)
  }, [teamMemberIds])

  const teamMembers = useMemo<SalesTeamMember[]>(() => {
    return rawMembers.map(member => ({
      id: member.employeeId,
      employeeId: member.employeeId,
      name: member.employeeName,
      position: member.position,
      totalRevenue: member.totalRevenue,
      currencyId: selectedCurrency,
      avatar: member.avatar
    }))
  }, [rawMembers, selectedCurrency])

  const totalMembers = serverTotalCount

  const teamKPIs = useMemo(() => {
    if (!kpis) return null

    return {
      totalRevenue: kpis.totalRevenue,
      totalWonOpportunities: kpis.totalWonOpportunities,
      memberCount: kpis.memberCount,
      revenueVsCompany: kpis.revenueChange,
      wonOpportunitiesChange: kpis.wonOpportunitiesChange
    }
  }, [kpis])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }, [])

  const handleSortingChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting)
    setCurrentPage(1)
  }, [])

  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setCurrentPage(newPagination.pageIndex + 1)
    setPageSize(newPagination.pageSize)
  }, [])

  const handleCurrencyChange = useCallback((currency: string) => {
    setSelectedCurrency(currency)
    setCurrentPage(1)
  }, [])

  const createTeamKPIWidgets = (): WidgetItem[] => {
    if (!teamKPIs) return []

    return [
      {
        key: 'team-revenue',
        title: 'Team Revenue',
        value: formatCurrency(teamKPIs.totalRevenue, selectedCurrency),
        prefix: <CurrencyDollarIcon />,
        description: `${kpis?.memberCount || teamKPIs.memberCount} team members`,
        valueIsString: true,
        trend: {
          value: `${Math.abs(teamKPIs.revenueVsCompany).toFixed(1)}%`,
          positive: teamKPIs.revenueVsCompany >= 0,
          description: 'vs. 30 days ago'
        }
      },
      {
        key: 'total-won-opportunities',
        title: 'Total Won Opportunities',
        value: teamKPIs.totalWonOpportunities,
        prefix: <TrophyIcon />,
        description: 'Closed-won opportunities',
        precision: 0,
        trend: {
          value: `${Math.abs(teamKPIs.wonOpportunitiesChange).toFixed(1)}%`,
          positive: teamKPIs.wonOpportunitiesChange >= 0,
          description: 'vs. 30 days ago'
        }
      },
      {
        key: 'team-size',
        title: 'Team Members',
        value: teamKPIs.memberCount,
        prefix: <UsersIcon />,
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

  // Keep the spinner up continuously until the first KPIs are ready. Using the
  // members-loading flag (not the KPI `isLoading`, which only flips true AFTER a
  // render where teamMemberIds is already set) avoids a brief window where the
  // charts mount, then get unmounted by the spinner, then remount - which would
  // make every chart fetch its data twice.
  const showLoadingSpinner = membersLoading || (employeeIds.length > 0 && !teamKPIs && !dataError)

  if (showLoadingSpinner) {
    return (
      <div
        className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-64"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner size="lg" />
        <p className="gba:text-muted-foreground gba:mt-4">Loading team data for {teamName}...</p>
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

  return (
    <div className="gba:space-y-6" data-testid={`${DATA_TEST_ID_PREFIX}-${teamId}`}>
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gba:gap-2"
          data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}
        >
          <ArrowLeftIcon className="gba:h-4 gba:w-4" />
          Back to Teams
        </Button>
      )}

      <div className="gba:space-y-1">
        <p className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('crm.performance.team', 'Team Overview')}
        </p>
        <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground">{teamName}</h2>
        {headerMeta}
      </div>

      <div data-testid={`${DATA_TEST_ID_PREFIX}-overview-content`} className="gba:space-y-6">
        <div data-testid={`${DATA_TEST_ID_PREFIX}-kpi-section`}>
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

        <TeamMembersTable
          members={teamMembers}
          totalCount={totalMembers}
          isLoading={isLoading}
          error={dataError}
          search={search}
          onSearchChange={handleSearch}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          currentPage={currentPage}
          pageSize={pageSize}
          onPaginationChange={handlePaginationChange}
          selectedCurrency={selectedCurrency}
          currencyFilter={
            <CurrencyFilter
              selectedCurrency={selectedCurrency}
              currencies={availableCurrencies}
              onCurrencyChange={handleCurrencyChange}
            />
          }
        />

        <TeamOverviewCharts accessToken={accessToken} teamMemberIds={employeeIds} currencyCode={selectedCurrency} />
      </div>
    </div>
  )
}

export default TeamPerformanceView
