import React, { useState } from 'react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  IconAvatar,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  type ActionOption
} from '@newwork/nw-design-system'
import { AbsenceListProps } from '../../../queries/types'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  hasApprovedAbsenceCancellationExpired,
  getAbsenceStatusBadgeVariant,
  getBadgeVariantBackgroundClass
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'

const AbsenceList: React.FC<AbsenceListProps> = ({
  absenceList,
  loading,
  error,
  currentPage,
  setCurrentPage,
  pageSize,
  onRequestCancellation,
  cancellingAbsenceId,
  accessToken
}) => {
  const [selectedApprovedAbsenceId, setSelectedApprovedAbsenceId] = useState<string | null>(null)

  const selectedApprovedAbsence =
    selectedApprovedAbsenceId === null
      ? null
      : absenceList.find(absence => absence.id === selectedApprovedAbsenceId) || null

  const approvedCancellationDayCount = selectedApprovedAbsence?.employeeAbsence.workingDays ?? 0
  const approvedCancellationSummary =
    selectedApprovedAbsence == null
      ? ''
      : getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_absences.request_cancellation_dialog_date_range',
          `${formatDate(selectedApprovedAbsence.startDate, 'date.medium')} to ${formatDate(
            selectedApprovedAbsence.endDate,
            'date.medium'
          )} (${approvedCancellationDayCount} ${approvedCancellationDayCount === 1 ? 'day' : 'days'})`,
          {
            startDate: formatDate(selectedApprovedAbsence.startDate, 'date.medium') ?? '—',
            endDate: formatDate(selectedApprovedAbsence.endDate, 'date.medium') ?? '—',
            days: approvedCancellationDayCount,
            dayLabel: approvedCancellationDayCount === 1 ? 'day' : 'days'
          }
        )

  const buildActions = (absence: AbsenceListProps['absenceList'][number]): ActionOption[] => {
    if (hasApprovedAbsenceCancellationExpired(absence.endDate)) {
      return []
    }

    return [
      {
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_absences.action', 'Action'),
        key: `request-cancellation-${absence.id}`,
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_absences.request_cancellation',
          'Request cancellation'
        ),
        onClick: () => {
          setSelectedApprovedAbsenceId(absence.id)
        }
      }
    ]
  }

  const handleConfirmRequestCancellation = async () => {
    if (!selectedApprovedAbsence || !onRequestCancellation) {
      return
    }

    const requestSucceeded = await onRequestCancellation(selectedApprovedAbsence)
    if (requestSucceeded) {
      setSelectedApprovedAbsenceId(null)
    }
  }

  if (loading) {
    return (
      <div
        className="gba:loading-skeleton gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
        data-testid="absencehub-loading"
      >
        {['skeleton-1', 'skeleton-2', 'skeleton-3'].map(skeletonId => (
          <div key={skeletonId} className="gba:h-40 gba:bg-muted gba:rounded gba:animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:error-container gba:text-center gba:py-8" data-testid="absencehub-error">
        <div className="gba:text-destructive gba:text-lg gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.error_loading', 'Failed to load absence data.')}
        </div>
        <div className="gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.try_again', 'Try again.')}
        </div>
      </div>
    )
  }

  // Paginated absence list
  const paginatedAbsenceList = absenceList.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <>
      {absenceList.length > 0 ? (
        <div
          className="gba:absenceListCards gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4"
          data-testid="absencehub-absence-list-cards"
        >
          {paginatedAbsenceList.map((absence, idx) => (
            <div
              key={absence.id || `${absence.startDate}-${absence.endDate}-${absence.title}`}
              className="gba:absence-card gba:border gba:rounded gba:p-4"
              data-testid={`absence-card-${idx}`}
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <IconAvatar icon={absence.icon} variant="decorative" size="md" />
                <h4 className="gba:text-lg gba:font-medium">{absence.title}</h4>
                {absence.originalStatus === 'APPROVED' && !hasApprovedAbsenceCancellationExpired(absence.endDate) ? (
                  <div className="gba:ml-auto">
                    <AppActionButton
                      data-testid={`employee-record-absence-actions-${absence.id}`}
                      size="icon"
                      staticFlowData={buildActions(absence)}
                      prefixDataTestId={`employee-record-absence-action-${absence.id}`}
                      accessToken={accessToken}
                      emptyStateBehavior="enable"
                      deferMainContextRequestsUntilClick
                      disabled={cancellingAbsenceId === absence.id}
                    />
                  </div>
                ) : null}
              </div>

              <div className="gba:absence-details gba:mt-3">
                <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
                  <div className="gba:text-muted-foreground">
                    {formatDate(absence.startDate, 'date.long')} - {formatDate(absence.endDate, 'date.long')}
                  </div>
                  <div
                    className={`gba:status-badge gba:px-3 gba:py-1 gba:rounded gba:text-sm ${getBadgeVariantBackgroundClass(getAbsenceStatusBadgeVariant(absence.originalStatus))}`}
                    data-testid={`absence-status-badge-${idx}`}
                  >
                    {absence.status}
                  </div>
                </div>

                <div className="gba:mb-2">
                  <span className="gba:text-muted-foreground gba:mr-1">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration')}
                    :
                  </span>
                  <span>{absence.duration}</span>
                </div>

                {absence.description && (
                  <div className="gba:mb-2 gba:text-foreground">
                    <span className="gba:text-muted-foreground gba:mr-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_profile.document_layout.document_table.description',
                        'Description'
                      )}
                      :
                    </span>
                    <span>{absence.description}</span>
                  </div>
                )}

                <div className="gba:text-muted-foreground gba:text-sm gba:mt-3 gba:text-right">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.requested_on', 'Requested on')}:{' '}
                  {formatDate(absence.requestDate, 'date.short')}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="gba:absenceListEmpty gba:text-center gba:py-8 gba:text-muted-foreground"
          data-testid="absencehub-absence-list-empty"
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.no_absences_found', 'No absences found.')}
        </div>
      )}

      {absenceList.length > pageSize && (
        <div
          className="gba:absenceListPagination gba:mt-6 gba:flex gba:justify-center gba:items-center gba:gap-4"
          data-testid="absencehub-absence-list-pagination"
        >
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
                />
              </PaginationItem>

              {Array.from({ length: Math.ceil(absenceList.length / pageSize) }, (_, i) => i + 1).map(page => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="gba:cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(Math.ceil(absenceList.length / pageSize), currentPage + 1))}
                  className={
                    currentPage === Math.ceil(absenceList.length / pageSize)
                      ? 'gba:pointer-events-none gba:opacity-50'
                      : 'gba:cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.pagination',
              '{{range0}}-{{range1}} of {{total}}',
              {
                range0: (currentPage - 1) * pageSize + 1,
                range1: Math.min(currentPage * pageSize, absenceList.length),
                total: absenceList.length
              }
            )}
          </div>
        </div>
      )}

      <Dialog
        open={selectedApprovedAbsence !== null}
        onOpenChange={open => {
          if (!open && cancellingAbsenceId !== selectedApprovedAbsence?.id) {
            setSelectedApprovedAbsenceId(null)
          }
        }}
      >
        <DialogContent data-testid="employee-record-approved-cancel-dialog">
          <DialogHeader>
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_absences.request_cancellation_dialog_title',
                'Request Cancellation'
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_absences.request_cancellation_dialog_intro',
                'You are requesting to cancel the following absence:'
              )}
            </p>

            {selectedApprovedAbsence && (
              <div className="gba:rounded-lg gba:border gba:bg-muted/40 gba:p-4 gba:space-y-2">
                <p className="gba:text-sm gba:font-medium">{selectedApprovedAbsence.type}</p>
                <p className="gba:text-sm gba:text-muted-foreground">{approvedCancellationSummary}</p>
              </div>
            )}

            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_absences.request_cancellation_dialog_approval_note',
                'By submitting this request, a cancellation notification will be sent to your manager for approval. The absence will remain in your calendar and balance until the request is finalized.'
              )}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedApprovedAbsenceId(null)}
              disabled={cancellingAbsenceId === selectedApprovedAbsence?.id}
              data-testid="employee-record-approved-cancel-dialog-cancel-button"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => {
                void handleConfirmRequestCancellation()
              }}
              disabled={cancellingAbsenceId === selectedApprovedAbsence?.id}
              data-testid="employee-record-approved-cancel-dialog-confirm-button"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_absences.request_cancellation_confirm',
                'Send request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AbsenceList
