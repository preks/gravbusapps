import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button
} from '@newwork/nw-design-system'
import { UserIcon, WalletIcon, AirplaneTiltIcon, MoneyWavyIcon, PathIcon } from '@phosphor-icons/react'
import {
  AbsenceApproval,
  getPriorityVariant,
  getPriorityLabel,
  getTimeAgo,
  formatCurrency
} from '../hooks/useAbsencesApprovals'
import {
  PersonalDataApproval,
  getPersonalChangePriorityVariant,
  getPersonalChangePriorityLabel
} from '../hooks/usePersonalDataApprovals'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { handleApproveAbsence, handleRejectAbsence } from './AbsenceItem'
import { useState } from 'react'
import { handleApprovePersonalChange } from './PersonalChangeItem'
import { handleApproveExpense, handleReturnExpense } from './ExpenseItem.tsx'
import { ExpenseApproval } from '../hooks/useExpensesApprovals.ts'

type RequestsToApproveTableProps = {
  activeApprovalTab: 'expenses' | 'absences' | 'personal-changes'
  setActiveApprovalTab: (_value: 'expenses' | 'absences' | 'personal-changes') => void
  allExpenseCount: number
  allAbsenceCount: number
  allPersonalChangesCount: number
  expenseRequests: ExpenseApproval[]
  leaveRequests: AbsenceApproval[]
  allPersonalChanges: PersonalDataApproval[]
  accessToken: string
  userId?: string
  refetchAbsences: () => void
  refetchPersonalData: () => void
  refetchExpenses: () => void
  employeeId?: string
}

const RequestsToApproveTable = ({
  activeApprovalTab,
  setActiveApprovalTab,
  allExpenseCount,
  allAbsenceCount,
  allPersonalChangesCount,
  expenseRequests,
  leaveRequests,
  allPersonalChanges,
  accessToken,
  userId,
  refetchAbsences,
  refetchPersonalData,
  refetchExpenses,
  employeeId
}: RequestsToApproveTableProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <Tabs
      value={activeApprovalTab}
      onValueChange={value => setActiveApprovalTab(value as 'expenses' | 'absences' | 'personal-changes')}
      className="gba:flex-1 gba:flex gba:flex-col"
    >
      <TabsList className="gba:grid gba:w-full gba:grid-cols-3 gba:mb-6">
        <TabsTrigger value="expenses" className="gba:flex gba:items-center gba:space-x-2">
          <div className="gba:flex gba:w-full gba:items-center gba:justify-center">
            <WalletIcon size={16} className="gba:mr-0.5" />
            <span>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_list.flows_button.expense_requests',
                'Expense Requests'
              )}
            </span>
            <Badge variant="secondary" className="gba:ml-1">
              {allExpenseCount}
            </Badge>
          </div>
        </TabsTrigger>
        <TabsTrigger value="absences" className="gba:flex gba:items-center gba:space-x-2">
          <div className="gba:flex gba:w-full gba:items-center gba:justify-center">
            <AirplaneTiltIcon size={16} className="gba:mr-0.5" />
            <span>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.manager_dashboard.absence_requests',
                'Absence Requests'
              )}
            </span>
            <Badge variant="secondary" className="gba:ml-1">
              {allAbsenceCount}
            </Badge>
          </div>
        </TabsTrigger>
        <TabsTrigger value="personal-changes" className="gba:flex gba:items-center gba:space-x-1">
          <div className="gba:flex gba:w-full gba:items-center gba:justify-center">
            <UserIcon size={16} className="gba:mr-0.5" />
            <span>
              {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.personal_changes', 'Personal')}
            </span>
            <Badge variant="secondary" className="gba:ml-1">
              {allPersonalChangesCount}
            </Badge>
          </div>
        </TabsTrigger>
      </TabsList>

      <div className="gba:flex-1 gba:overflow-hidden">
        <TabsContent value="expenses" className="gba:h-full gba:overflow-y-auto">
          {expenseRequests.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
              <div className="gba:text-4xl gba:mb-4">
                <WalletIcon size={36} />
              </div>
              <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-2">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.status.no_expense_requests',
                  'No expense requests'
                )}
              </h3>
              <p className="gba:text-neutral-500">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.no_pending_expense_requests',
                  'There are no pending expense requests to approve.'
                )}
              </p>
            </div>
          ) : (
            <div className="gba:border gba:rounded-lg gba:overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('orgchart:overview.unit.employee', 'Employee')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_profile.details_layout.personal_information_container.title',
                        'Title'
                      )}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.expense_plan_table.type',
                        'Type'
                      )}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.dates', 'Dates')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.notes_area_label', 'Notes')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.expense_plan_table.amount',
                        'Amount'
                      )}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('flow:flow_editor.side_panel.priority', 'Priority')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:expense_report_list.submitted', 'Submitted')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseRequests.map(request => {
                    const isTrip = request.requestType === 'ExpenseRequestType:v1:TRIP'
                    const isRequestType = request.type === 'expense-request'
                    const isAdvancePayment = request.type === 'advance-payment'
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="gba:flex gba:items-center gba:space-x-3">
                            <Avatar size="sm" className="gba:h-8 gba:w-8">
                              <AvatarImage
                                src={
                                  request.employee.pictureThumbnail &&
                                  !request.employee.pictureThumbnail.startsWith('{')
                                    ? `data:image/jpeg;base64,${request.employee.pictureThumbnail}`
                                    : undefined
                                }
                                alt={request.employee.fullName}
                              />
                              <AvatarFallback>
                                {request.employee.fullName
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="gba:font-medium">{request.employee.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="gba:flex gba:flex-col gba:gap-0.5 gba:max-w-[400px]">
                            <div className="gba:font-medium gba:w-full gba:truncate">{request.title}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="gba:flex gba:flex-col gba:gap-0.5">
                            <div className="gba:font-medium gba:w-full gba:truncate">
                              {isAdvancePayment ? (
                                <div className="gba:flex gba:items-center gba:gap-1">
                                  <WalletIcon size={16} />
                                  {getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:backoffice_expense_landing_page.advance_title',
                                    'Advance Payment'
                                  )}
                                </div>
                              ) : isRequestType ? (
                                <div className="gba:flex gba:items-center gba:gap-1">
                                  <MoneyWavyIcon size={16} />
                                  {isTrip
                                    ? getTranslationFromI18nKeyAndLabel(
                                        'master-data:hr.manager_dashboard.trip_request',
                                        'Trip Request'
                                      )
                                    : getTranslationFromI18nKeyAndLabel(
                                        'lowcoder:create_expense_request.initiate_title_header',
                                        'Expense Request'
                                      )}
                                </div>
                              ) : (
                                <div className="gba:flex gba:items-center gba:gap-1">
                                  <PathIcon size={16} />
                                  {isTrip
                                    ? getTranslationFromI18nKeyAndLabel(
                                        'master-data:hr.manager_dashboard.trip_plan',
                                        'Trip Plan'
                                      )
                                    : getTranslationFromI18nKeyAndLabel(
                                        'lowcoder:team_expenses_page.expense_plan',
                                        'Expense Plan'
                                      )}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isTrip ? (
                            <div className="gba:text-sm gba:text-neutral-600">
                              {request.startDate && request.endDate
                                ? `${getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:personal_expenses.from_date',
                                    'From'
                                  )} ${formatDate(request.startDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_overview_screen.absence_overview_table.to', 'to').toLowerCase()} ${formatDate(request.endDate)}`
                                : getTranslationFromI18nKeyAndLabel(
                                    'master-data:hr.manager_dashboard.date_range_not_specified',
                                    'Date range not specified'
                                  )}
                            </div>
                          ) : (
                            <div className="gba:text-sm gba:text-neutral-600">-</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="gba:text-sm gba:text-neutral-600">
                            {request.description ||
                              getTranslationFromI18nKeyAndLabel(
                                'master-data:hr.manager_dashboard.status.no_notes_provided',
                                'No notes provided'
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="gba:font-medium gba:text-green-600">
                            {formatCurrency(request.totalAmount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityVariant(request)} size="sm">
                            {getPriorityLabel(request)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="gba:text-sm gba:text-neutral-500">{getTimeAgo(request.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="gba:flex gba:space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSubmitting}
                              onClick={() =>
                                handleReturnExpense({
                                  task: request,
                                  userId,
                                  accessToken,
                                  refetchExpenses,
                                  setIsSubmitting,
                                  employeeId
                                })
                              }
                            >
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:approve_expense_request.return_button',
                                'Return'
                              )}
                            </Button>

                            <Button
                              size="sm"
                              className="gba:bg-primary-600 gba:text-white"
                              onClick={() =>
                                handleApproveExpense({
                                  task: request,
                                  userId,
                                  accessToken,
                                  refetchExpenses,
                                  setIsSubmitting,
                                  employeeId
                                })
                              }
                              disabled={isSubmitting}
                            >
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:approve_expense_request.approve_button',
                                'Approve'
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="absences" className="gba:h-full gba:overflow-y-auto">
          {leaveRequests.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
              <div className="gba:text-4xl gba:mb-4">
                <AirplaneTiltIcon size={36} />
              </div>
              <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-2">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.status.no_absence_requests',
                  'No absence requests'
                )}
              </h3>
              <p className="gba:text-neutral-500">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.no_pending_absence_requests',
                  'There are no pending absence requests to approve.'
                )}
              </p>
            </div>
          ) : (
            <div className="gba:border gba:rounded-lg gba:overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('orgchart:overview.unit.employee', 'Employee')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.leave_type', 'Leave Type')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.dates', 'Dates')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('flow:flow_editor.side_panel.priority', 'Priority')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:expense_report_list.submitted', 'Submitted')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map(request => (
                    <TableRow key={request.id} className="gba:!h-[57px]">
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:space-x-3 ">
                          <Avatar size="sm" className="gba:h-8 gba:w-8">
                            <AvatarImage
                              src={
                                request.employee.pictureThumbnail && !request.employee.pictureThumbnail.startsWith('{')
                                  ? `data:image/jpeg;base64,${request.employee.pictureThumbnail}`
                                  : undefined
                              }
                              alt={request.employee.fullName}
                            />
                            <AvatarFallback>
                              {request.employee.fullName
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="gba:font-medium">{request.employee.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="gba:font-medium">
                            {request.leaveType === 'ABSENCE'
                              ? getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.absence', 'Absence')
                              : request.leaveType === 'VACATION'
                                ? getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:absence_landing_page.vacation_card_header_container.vacation_card_title_text',
                                    'Vacation'
                                  )
                                : request.leaveType === 'SPECIAL LEAVE'
                                  ? getTranslationFromI18nKeyAndLabel(
                                      'lowcoder:absence_landing_page.special_leave_card_header_container.special_leave_card_title_text',
                                      'Special Leave'
                                    )
                                  : getTranslationFromI18nKeyAndLabel(
                                      'master-data:hr.manager_dashboard.work_leave',
                                      'Work Leave'
                                    )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:text-sm">
                          {request.startDate && request.endDate ? (
                            <div className="gba:font-medium">
                              {`${formatDate(request.startDate)} ${getTranslationFromI18nKeyAndLabel(
                                'lowcoder:absence_overview_screen.absence_overview_table.to',
                                'to'
                              )} ${formatDate(request.endDate)}`}
                            </div>
                          ) : (
                            <div className="gba:font-medium">{formatDate(request.createdAt)}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityVariant(request)} size="sm">
                          {getPriorityLabel(request)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="gba:text-sm gba:text-neutral-500">{getTimeAgo(request.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSubmitting}
                            onClick={() =>
                              handleRejectAbsence({
                                task: request,
                                userId,
                                accessToken,
                                refetchAbsences,
                                setIsSubmitting
                              })
                            }
                          >
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:approve_expense_request.reject_button',
                              'Reject'
                            )}
                          </Button>

                          <Button
                            size="sm"
                            className="gba:bg-primary-600 gba:text-white"
                            disabled={isSubmitting}
                            onClick={() =>
                              handleApproveAbsence({
                                task: request,
                                userId,
                                accessToken,
                                refetchAbsences,
                                setIsSubmitting
                              })
                            }
                          >
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:approve_expense_request.approve_button',
                              'Approve'
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="personal-changes" className="gba:h-full gba:overflow-y-auto">
          {allPersonalChanges.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-6">
              <div className="gba:text-4xl gba:mb-4">
                <UserIcon size={36} />
              </div>
              <h3 className="gba:text-lg gba:font-medium gba:text-neutral-900 gba:mb-2">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.status.no_personal_changes',
                  'No personal data changes'
                )}
              </h3>
              <p className="gba:text-neutral-500">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.manager_dashboard.status.no_pending_personal_changes',
                  'There are no pending personal data changes to review.'
                )}
              </p>
            </div>
          ) : (
            <div className="gba:border gba:rounded-lg gba:overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('orgchart:overview.unit.employee', 'Employee')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.change_type', 'Change Type')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.description', 'Description')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('flow:flow_editor.side_panel.priority', 'Priority')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:expense_report_list.submitted', 'Submitted')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPersonalChanges.map(change => (
                    <TableRow key={change.id} className="gba:!h-[57px]">
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:space-x-3">
                          <Avatar size="sm" className="gba:h-8 gba:w-8">
                            <AvatarImage
                              src={
                                change.employee?.pictureThumbnail && !change.employee.pictureThumbnail.startsWith('{')
                                  ? `data:image/jpeg;base64,${change.employee.pictureThumbnail}`
                                  : undefined
                              }
                              alt={
                                change.employee?.fullName ||
                                getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:common.unknown_employee',
                                  'Unknown Employee'
                                )
                              }
                            />
                            <AvatarFallback>
                              {change.employee?.fullName
                                ?.split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="gba:font-medium">
                            {change.employee?.fullName ||
                              getTranslationFromI18nKeyAndLabel('lowcoder:common.unknown_employee', 'Unknown Employee')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="gba:font-medium">{change.title}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:text-sm gba:text-neutral-600">{change.description || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPersonalChangePriorityVariant(change)} size="sm">
                          {getPersonalChangePriorityLabel(change)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="gba:text-sm">{getTimeAgo(change.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:space-x-2">
                          <Button
                            size="sm"
                            className="gba:bg-primary-600 gba:text-white"
                            disabled={isSubmitting}
                            onClick={() =>
                              handleApprovePersonalChange({
                                change,
                                userId,
                                accessToken,
                                refetchPersonalData,
                                setIsSubmitting
                              })
                            }
                          >
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:acknowledge_sick_leave.acknowledge',
                              'Acknowledge'
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  )
}

export default RequestsToApproveTable
