import React from 'react'
import { EyeIcon, UserPlusIcon } from '@phosphor-icons/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Spinner
} from '@newwork/nw-design-system'
import { PersonDisplay } from '@/common/components/person-display/PersonDisplay'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { OnboardingTask } from '../../hooks/useOnboardingTickets'
import type { EmployeeDisplayInfo } from '../../hooks/useOnboardingEmployeeNames'

const formatDate = (value: string | undefined) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '–'

const formatUrgency = (level: string | undefined) => (level ? level.charAt(0).toUpperCase() + level.slice(1) : '–')

export interface OnboardingTicketsTableProps {
  tickets: OnboardingTask[]
  displayNames?: Map<string, string>
  employeeInfo?: Map<string, EmployeeDisplayInfo>
  isLoading: boolean
  emptyMessage: string
  claimLabel: string
  viewLabel: string
  columnTask: string
  columnRequester: string
  columnStatus: string
  columnUrgency: string
  columnDueDate: string
  columnAssignee: string
  columnUpdated: string
  columnActions: string
  onClaim: (ticket: OnboardingTask) => void
  onView: (ticket: OnboardingTask) => void
  /** When provided, click on ticket name opens full-page view (TaskRecord); otherwise falls back to onView (sheet). */
  onTaskSelect?: (ticket: OnboardingTask) => void
  showClaim: (ticket: OnboardingTask) => boolean
  isClaimDisabled?: boolean
}

function displayFor(displayNames: Map<string, string> | undefined, userId: string | undefined): string {
  if (!userId) return '–'
  if (!displayNames) return userId
  return displayNames.get(userId) ?? '–'
}

function handleNavigateToEmployee(employeeId: string) {
  navigateTo(`/platform/employee-record?employeeId=${employeeId}`)
}

function RequesterOrAssigneeCell({
  userId,
  displayNames,
  employeeInfo
}: Readonly<{
  userId: string | undefined
  displayNames: Map<string, string> | undefined
  employeeInfo: Map<string, EmployeeDisplayInfo> | undefined
}>) {
  if (!userId) return <span className="gba:text-muted-foreground">–</span>
  const info = employeeInfo?.get(userId)
  if (info) {
    return (
      <PersonDisplay
        displayName={info.displayName}
        pictureThumbnail={info.pictureThumbnail}
        employeeId={info.employeeId}
        onClick={handleNavigateToEmployee}
      />
    )
  }
  return <span className="gba:text-sm">{displayFor(displayNames, userId)}</span>
}

export const OnboardingTicketsTable: React.FC<OnboardingTicketsTableProps> = ({
  tickets,
  displayNames,
  employeeInfo,
  isLoading,
  emptyMessage,
  claimLabel,
  viewLabel,
  columnTask,
  columnRequester,
  columnStatus,
  columnUrgency,
  columnDueDate,
  columnAssignee,
  columnUpdated,
  columnActions,
  onClaim,
  onView,
  onTaskSelect,
  showClaim,
  isClaimDisabled
}) => {
  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12 gba:text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="gba:overflow-x-auto gba:rounded-lg gba:border">
      <Table data-testid="onboarding-tickets-table">
        <TableHeader>
          <TableRow className="gba:border-b gba:bg-muted/50">
            <TableHead className="gba:font-semibold gba:py-3 gba:px-4">{columnTask}</TableHead>
            <TableHead className="gba:font-semibold gba:py-3 gba:px-4">{columnRequester}</TableHead>
            <TableHead className="gba:font-semibold gba:py-3 gba:px-4">{columnStatus}</TableHead>
            <TableHead className="gba:font-semibold gba:py-3 gba:px-4">{columnUrgency}</TableHead>
            <TableHead className="gba:font-semibold gba:py-3 gba:px-4">{columnDueDate}</TableHead>
            <TableHead className="gba:font-semibold gba:py-3 gba:px-4">{columnAssignee}</TableHead>
            <TableHead className="gba:font-semibold gba:py-3 gba:px-4">{columnUpdated}</TableHead>
            <TableHead className="gba:font-semibold gba:py-3 gba:px-4 gba:w-[140px]">{columnActions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map(ticket => (
            <TableRow key={ticket.id} className="gba:border-b">
              <TableCell className="gba:py-3 gba:px-4">
                <button
                  type="button"
                  onClick={() => (onTaskSelect ? onTaskSelect(ticket) : onView(ticket))}
                  className="gba:text-left gba:font-medium gba:text-primary gba:hover:underline"
                >
                  <div className="gba:flex gba:flex-col">
                    <span>{ticket.name}</span>
                    {ticket.flowName && (
                      <span className="gba:text-xs gba:text-muted-foreground">{ticket.flowName}</span>
                    )}
                  </div>
                </button>
              </TableCell>
              <TableCell className="gba:py-3 gba:px-4 gba:text-sm">
                <RequesterOrAssigneeCell
                  userId={ticket.flowInitiatedById}
                  displayNames={displayNames}
                  employeeInfo={employeeInfo}
                />
              </TableCell>
              <TableCell className="gba:py-3 gba:px-4">
                <Badge variant="outline" className="gba:text-xs">
                  {ticket.status}
                </Badge>
              </TableCell>
              <TableCell className="gba:py-3 gba:px-4 gba:text-sm">
                {formatUrgency((ticket as OnboardingTask & { urgency_level?: string }).urgency_level)}
              </TableCell>
              <TableCell className="gba:py-3 gba:px-4 gba:text-sm">{formatDate(ticket.dueDate)}</TableCell>
              <TableCell className="gba:py-3 gba:px-4 gba:text-sm">
                <RequesterOrAssigneeCell
                  userId={ticket.assignedToUserId ?? ticket.claimedByUserId}
                  displayNames={displayNames}
                  employeeInfo={employeeInfo}
                />
              </TableCell>
              <TableCell className="gba:py-3 gba:px-4 gba:text-sm">{formatDate(ticket.updatedAt)}</TableCell>
              <TableCell className="gba:py-3 gba:px-4">
                <div className="gba:flex gba:gap-2">
                  {showClaim(ticket) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onClaim(ticket)}
                      disabled={isClaimDisabled}
                      data-testid={`claim-task-${ticket.id}`}
                    >
                      <UserPlusIcon className="gba:w-3 gba:h-3 gba:mr-1" />
                      {claimLabel}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onView(ticket)}
                    data-testid={`view-task-${ticket.id}`}
                  >
                    <EyeIcon className="gba:w-3 gba:h-3 gba:mr-1" />
                    {viewLabel}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
