import React, { useState, useEffect, useMemo } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
  Alert,
  Button,
  Card,
  CardContent,
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@newwork/nw-design-system'
import {
  PiPhone,
  PiEnvelope,
  PiUsers,
  PiListChecks,
  PiArrowUp,
  PiArrowDown,
  PiUser,
  PiBuilding,
  PiTarget,
  PiHandshake,
  PiChartLine,
  PiCalendar
} from 'react-icons/pi'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesTeamMember } from '../../sales-members-list/types'
import { useTeamActivitiesData, TeamSalesActivity } from '../hooks/useTeamActivitiesData'
import { DataContainer } from '@/components/layout/dataContainer'
import { useDebounce } from '@/common/hooks/useDebounce'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import dayjs from 'dayjs'

const DATA_TEST_ID_PREFIX = 'TeamActivitiesTable'

interface TeamActivitiesTableProps extends BusinessAppContextProps {
  teamMembers: SalesTeamMember[]
  onTotalChange?: (total: number) => void
}

type ActivitySortField = 'createdAt' | 'occurredAt' | 'title'
type SortOrder = 'ASC' | 'DESC'

// Helper function to get initials from full name
const getInitials = (name: string): string => {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

// Helper function to get team member from activities
const getTeamMemberForActivity = (activity: TeamSalesActivity, teamMembers: SalesTeamMember[]) => {
  return teamMembers.find(
    member => member.employeeId === activity.ownerEmployeeId || member.id === activity.ownerEmployeeId
  )
}

export const TeamActivitiesTable: React.FC<TeamActivitiesTableProps> = ({
  teamMembers,
  accessToken,
  userInfo,
  onTotalChange
}) => {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<ActivitySortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')

  // Debounce search to prevent excessive API calls
  const debouncedSearch = useDebounce(search, 500)

  // Get employee IDs for data fetching
  const employeeIds = useMemo(() => {
    const memberIds = teamMembers.map(member => member.employeeId || member.id).filter((id): id is string => !!id)

    // Also include manager IDs
    const managerIds = teamMembers.map(member => member.manager?.id).filter((id): id is string => !!id)

    return Array.from(new Set([...memberIds, ...managerIds]))
  }, [teamMembers])

  // Use the team activities data hook
  const { activities, total, loading, error, loadActivities, retry } = useTeamActivitiesData({
    employeeIds,
    search: debouncedSearch,
    sortField,
    sortOrder,
    accessToken,
    userInfo,
    limit: 200 // Load more for team view
  })

  // Load data when component mounts or dependencies change
  useEffect(() => {
    if (employeeIds.length > 0) {
      loadActivities()
    }
  }, [employeeIds, loadActivities, debouncedSearch, sortField, sortOrder])

  // Report total change to parent component
  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(total)
    }
  }, [total, onTotalChange])

  // Handle sorting change
  const handleSort = (field: ActivitySortField) => {
    if (sortField === field) {
      // Cycle through: ASC -> DESC -> clear
      if (sortOrder === 'ASC') {
        setSortOrder('DESC')
      } else if (sortOrder === 'DESC') {
        setSortField('createdAt')
        setSortOrder('DESC')
      } else {
        setSortOrder('ASC')
      }
    } else {
      setSortField(field)
      setSortOrder('ASC')
    }
  }

  // Helper function to render sort icon
  const renderSortIcon = (field: ActivitySortField) => {
    if (sortField !== field) return null
    if (sortOrder === 'ASC') return <PiArrowUp className="gba:inline gba:ml-1" size={12} />
    if (sortOrder === 'DESC') return <PiArrowDown className="gba:inline gba:ml-1" size={12} />
    return null
  }

  // Get activity type icon
  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'Call':
        return <PiPhone size={16} className="gba:text-success" />
      case 'Email':
        return <PiEnvelope size={16} className="gba:text-primary" />
      case 'Meeting':
        return <PiUsers size={16} className="gba:text-warning" />
      case 'Task':
        return <PiListChecks size={16} className="gba:text-accent" />
      default:
        return <PiListChecks size={16} className="gba:text-muted-foreground" />
    }
  }

  // Get entity type icon
  const getEntityTypeIcon = (entityType: string, size = 16) => {
    switch (entityType) {
      case 'Contact':
        return <PiUser size={size} />
      case 'Lead':
        return <PiTarget size={size} />
      case 'Opportunity':
        return <PiHandshake size={size} />
      case 'Account':
        return <PiBuilding size={size} />
      default:
        return <PiUser size={size} />
    }
  }

  // Get entity name based on activity data
  const getEntityName = (activity: TeamSalesActivity): string => {
    if (activity.account?.name) {
      return activity.account.name
    }
    if (activity.contact?.firstName || activity.contact?.lastName) {
      const firstName = activity.contact.firstName || ''
      const lastName = activity.contact.lastName || ''
      return `${firstName} ${lastName}`.trim()
    }
    if (activity.lead?.name) {
      return activity.lead.name
    }
    if (activity.lead?.contact?.firstName || activity.lead?.contact?.lastName) {
      const firstName = activity.lead.contact.firstName || ''
      const lastName = activity.lead.contact.lastName || ''
      return `${firstName} ${lastName}`.trim()
    }
    if (activity.opportunity?.name) {
      return activity.opportunity.name
    }
    return 'Unknown'
  }

  // Get entity type based on activity data
  const getEntityType = (activity: TeamSalesActivity): string => {
    if (activity.account?.name) return 'Account'
    if (activity.contact?.firstName || activity.contact?.lastName) return 'Contact'
    if (activity.lead?.name || activity.lead?.contact) return 'Lead'
    if (activity.opportunity?.name) return 'Opportunity'
    return 'Contact' // Default fallback
  }

  // Handle team member click (navigate to employee profile)
  const handleTeamMemberClick = (activity: TeamSalesActivity) => {
    if (!activity.ownerEmployeeId) return

    const url = buildPlatformUrl('/platform/hr/employee-record', {
      employeeId: activity.ownerEmployeeId,
      source: 'customer-relations',
      fromEntity: 'teamActivities'
    })
    navigateTo(url)
  }

  // Handle reference entity click (navigate to respective record)
  const handleReferenceClick = (activity: TeamSalesActivity) => {
    const source = 'customer-relations'
    let url: string

    if (activity.account?.name && activity.accountId) {
      url = buildPlatformUrl('/platform/crm/account-record', {
        accountId: activity.accountId,
        source,
        fromEntity: 'teamActivities'
      })
    } else if ((activity.contact?.firstName || activity.contact?.lastName) && activity.contactId) {
      url = buildPlatformUrl('/platform/crm/contact-record', {
        contactId: activity.contactId,
        source,
        fromEntity: 'teamActivities'
      })
    } else if ((activity.lead?.name || activity.lead?.contact) && activity.leadId) {
      url = buildPlatformUrl('/platform/crm/lead-record', {
        leadId: activity.leadId,
        source,
        fromEntity: 'teamActivities'
      })
    } else if (activity.opportunity?.name && activity.opportunityId) {
      url = buildPlatformUrl('/platform/crm/opportunity-record', {
        opportunityId: activity.opportunityId,
        source,
        fromEntity: 'teamActivities'
      })
    } else {
      return // No valid reference to navigate to
    }

    navigateTo(url)
  }

  // Loading state
  if (loading && activities.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
        <Spinner size="lg" />
      </div>
    )
  }

  // Error state
  if (error && activities.length === 0) {
    return (
      <Alert variant="destructive" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <h4 className="gba:text-sm gba:font-medium">Error Loading Team Activities</h4>
            <p className="gba:text-sm gba:text-muted-foreground">Failed to load team activities data</p>
          </div>
          <Button variant="outline" size="sm" onClick={retry} data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}>
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <DataContainer
      dataControllerProps={{
        search,
        setSearch,
        listTitle: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiChartLine className="gba:text-black" size={20} />
            Team Sales Activities
            {total > 0 && <span className="gba:text-gray-500">({total})</span>}
          </div>
        )
      }}
      dataBody={
        <>
          {/* Activities Table Content */}
          {activities.length === 0 && !loading && (
            <div className="gba:text-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}>
              <h3 className="gba:text-sm gba:font-medium gba:text-gray-900">No team activities found</h3>
              <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
                {search ? 'Try adjusting your search criteria.' : 'This team currently has no activities.'}
              </p>
            </div>
          )}

          {/* Table */}
          {activities.length > 0 && (
            <Card data-testid={`${DATA_TEST_ID_PREFIX}-table-card`}>
              <CardContent className="gba:p-0">
                {loading && (
                  <div className="gba:flex gba:justify-center gba:p-4">
                    <Spinner />
                  </div>
                )}

                <div className="gba:overflow-x-auto">
                  <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
                    <TableHeader>
                      <TableRow className="gba:border-b gba:bg-gray-50">
                        {/* Actions Column */}
                        <TableHead
                          className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-actions`}
                        >
                          Actions
                        </TableHead>

                        {/* Owner Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-owner`}
                        >
                          Team Member
                        </TableHead>

                        {/* Title Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                          onClick={() => handleSort('title')}
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-title`}
                        >
                          <div className="gba:flex gba:items-center">Title {renderSortIcon('title')}</div>
                        </TableHead>

                        {/* Type Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-type`}
                        >
                          Type
                        </TableHead>

                        {/* Reference Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-reference`}
                        >
                          Reference
                        </TableHead>

                        {/* Created At Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                          onClick={() => handleSort('createdAt')}
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-created`}
                        >
                          <div className="gba:flex gba:items-center">Creation Date {renderSortIcon('createdAt')}</div>
                        </TableHead>

                        {/* Occurred At Column */}
                        <TableHead
                          className="gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                          onClick={() => handleSort('occurredAt')}
                          data-testid={`${DATA_TEST_ID_PREFIX}-header-occurred`}
                        >
                          <div className="gba:flex gba:items-center">Occurred At {renderSortIcon('occurredAt')}</div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map(activity => {
                        return (
                          <TableRow
                            key={activity.id}
                            className="gba:border-b gba:hover:bg-gray-50 gba:transition-colors"
                            data-testid={`${DATA_TEST_ID_PREFIX}-row-${activity.id}`}
                          >
                            {/* Actions Column */}
                            <TableCell className="gba:py-4 gba:px-6">
                              <div className="gba:flex gba:justify-start gba:gap-2">
                                <AppActionButton
                                  data-testid={`${DATA_TEST_ID_PREFIX}-update-activity-button-${activity.id}`}
                                  contextsArray={[FlowContextName.flowEntity]}
                                  externalContextData={{
                                    entityId: activity.id
                                  }}
                                  prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-activity`}
                                  accessToken={accessToken}
                                  emptyStateBehavior="disable"
                                  deferMainContextRequestsUntilClick
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>
                            </TableCell>

                            {/* Owner Column */}
                            <TableCell
                              className="gba:py-4 gba:px-6"
                              data-testid={`${DATA_TEST_ID_PREFIX}-owner-cell-${activity.id}`}
                            >
                              <div
                                className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
                                onClick={e => {
                                  e.stopPropagation()
                                  handleTeamMemberClick(activity)
                                }}
                                title={`View ${activity.ownerEmployee?.fullName || 'Unknown'}'s profile`}
                              >
                                <Avatar
                                  size="sm"
                                  className="gba:cursor-pointer gba:hover:ring-2 gba:hover:ring-blue-500 gba:transition-all"
                                >
                                  <AvatarImage
                                    src={`data:image/jpeg;base64,${
                                      getTeamMemberForActivity(activity, teamMembers)?.avatar
                                    }`}
                                    alt={activity.ownerEmployee?.fullName || 'Unknown'}
                                  />
                                  <AvatarFallback>
                                    {getInitials(activity.ownerEmployee?.fullName || 'Unknown')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="gba:text-sm gba:font-medium gba:text-gray-900">
                                    {activity.ownerEmployee?.fullName || 'Unknown'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Title Column */}
                            <TableCell
                              className="gba:py-4 gba:px-6"
                              data-testid={`${DATA_TEST_ID_PREFIX}-title-cell-${activity.id}`}
                            >
                              <div className="gba:font-medium gba:text-sm">{activity.title}</div>
                            </TableCell>

                            {/* Type Column */}
                            <TableCell
                              className="gba:py-4 gba:px-6"
                              data-testid={`${DATA_TEST_ID_PREFIX}-type-cell-${activity.id}`}
                            >
                              <div className="gba:flex gba:items-center gba:gap-2">
                                {getActivityTypeIcon(activity.activityType?.value || 'Other')}
                                <span className="gba:text-sm">{activity.activityType?.value || 'Other'}</span>
                              </div>
                            </TableCell>

                            {/* Reference Column */}
                            <TableCell
                              className="gba:py-4 gba:px-6"
                              data-testid={`${DATA_TEST_ID_PREFIX}-reference-cell-${activity.id}`}
                            >
                              <div className="gba:flex gba:flex-col gba:gap-1">
                                <div
                                  className="gba:text-sm gba:font-medium gba:text-gray-900 gba:cursor-pointer gba:hover:text-blue-600 gba:transition-colors"
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleReferenceClick(activity)
                                  }}
                                  title={`View ${getEntityType(activity).toLowerCase()}: ${getEntityName(activity)}`}
                                >
                                  {getEntityName(activity)}
                                </div>
                                <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-gray-500">
                                  {getEntityTypeIcon(getEntityType(activity), 16)}
                                  <span>{getEntityType(activity)}</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Created At Column */}
                            <TableCell
                              className="gba:py-4 gba:px-6"
                              data-testid={`${DATA_TEST_ID_PREFIX}-created-cell-${activity.id}`}
                            >
                              {activity.createdAt ? (
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <PiCalendar size={16} className="gba:text-gray-400" />
                                  <span className="gba:text-sm">
                                    {dayjs(activity.createdAt).format('MMM DD, YYYY')}
                                  </span>
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>

                            {/* Occurred At Column */}
                            <TableCell
                              className="gba:py-4 gba:px-6"
                              data-testid={`${DATA_TEST_ID_PREFIX}-occurred-cell-${activity.id}`}
                            >
                              {activity.occurredAt ? (
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <PiCalendar size={16} className="gba:text-blue-500" />
                                  <span className="gba:text-sm gba:font-medium">
                                    {dayjs(activity.occurredAt).format('MMM DD, YYYY')}
                                  </span>
                                </div>
                              ) : (
                                <span className="gba:text-gray-400 gba:text-sm gba:italic">Not specified</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      }
    />
  )
}

export default TeamActivitiesTable
