/**
 * VacationHistory Component
 * Displays detailed list of approved and pending absences
 */

import React, { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Separator,
  Spinner,
  Alert,
  useTranslation,
  EmptyState
} from '@newwork/nw-design-system'
import { History, ChevronDown, ChevronUp, Calendar, Clock } from 'lucide-react'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/en'
import 'dayjs/locale/de'
import 'dayjs/locale/ro'
import translations from '../_i18n'

// Initialize dayjs localizedFormat plugin once at module level
dayjs.extend(localizedFormat)

interface AbsenceRecord {
  id: string
  startDate: string
  endDate: string
  workingDays: number
  status: string
  typeRef: string
  typeName: string
  description?: string
}

interface VacationHistoryProps {
  approvedAbsences: AbsenceRecord[]
  pendingAbsences: AbsenceRecord[]
  totalApprovedDays: number
  totalPendingDays: number
  isLoading: boolean
  error: string | null
}

export const VacationHistory: React.FC<VacationHistoryProps> = ({
  approvedAbsences,
  pendingAbsences,
  totalApprovedDays,
  totalPendingDays,
  isLoading,
  error
}) => {
  const { t, locale } = useTranslation(translations)
  const [showApproved, setShowApproved] = useState(false)
  const [showPending, setShowPending] = useState(false)

  if (isLoading) {
    return (
      <Card data-testid="vacation-history-card" className="gba:shadow-sm">
        <CardContent className="gba:flex gba:justify-center gba:items-center gba:py-8">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="vacation-history-error">
        {error}
      </Alert>
    )
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = dayjs(startDate).locale(locale)
    const end = dayjs(endDate).locale(locale)

    if (!start.isValid() || !end.isValid()) {
      return t('vacation-history-invalid-date')
    }

    // Same day: show single date in long format (e.g., "January 15, 2024")
    if (start.isSame(end, 'day')) {
      return start.format('LL')
    }

    // Same month: show abbreviated start and full end (e.g., "Jan 15 - 20, 2024")
    if (start.isSame(end, 'month')) {
      return `${start.format('MMM D')} - ${end.format('D, YYYY')}`
    }

    // Different months: show both dates in long format (e.g., "Jan 15, 2024 - Feb 10, 2024")
    return `${start.format('LL')} - ${end.format('LL')}`
  }

  const getStatusBadge = (status: string) => {
    // Normalize the value to prevent runtime errors from null/undefined
    const normalized = status ? status.toUpperCase() : ''

    switch (normalized) {
      case 'APPROVED':
        return (
          <Badge variant="secondary" className="gba:bg-success-secondary gba:text-success-secondary-foreground">
            {t('status-approved')}
          </Badge>
        )
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return (
          <Badge variant="secondary" className="gba:bg-warning-secondary gba:text-warning-secondary-foreground">
            {t('status-pending')}
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="secondary" className="gba:bg-destructive-secondary gba:text-destructive-secondary-foreground">
            {t('status-rejected')}
          </Badge>
        )
      default:
        // Handle empty/default case with safe fallback
        return <Badge variant="outline">{status || 'Unknown'}</Badge>
    }
  }

  return (
    <Card data-testid="vacation-history-card" className="gba:shadow-sm">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
          <History className="gba:h-5 gba:w-5 gba:text-primary" />
          {t('vacation-history-title')}
        </CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{t('vacation-history-description')}</p>
      </CardHeader>
      <CardContent>
        {/* Show empty state ONLY when no data at all */}
        {approvedAbsences.length === 0 && pendingAbsences.length === 0 ? (
          <div className="gba:py-8">
            <EmptyState
              type="no-data"
              title={t('vacation-history-no-data')}
              description={t('vacation-history-description')}
              data-testid="vacation-history-empty-state"
            />
          </div>
        ) : (
          <>
            {/* Summary Stats - Subtle premium styling */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:mb-6">
              <div className="gba:bg-success-secondary/50 gba:p-3 gba:rounded-lg gba:border gba:border-success-secondary">
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  {t('vacation-history-total-approved')}
                </div>
                <div className="gba:flex gba:items-baseline gba:gap-1">
                  <div className="gba:text-2xl gba:font-bold gba:text-success-secondary-foreground">
                    {totalApprovedDays}
                  </div>
                  <div className="gba:text-sm gba:text-muted-foreground">
                    {totalApprovedDays === 1 ? t('vacation-history-day') : t('vacation-history-days')}
                  </div>
                </div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {approvedAbsences.length} {t('vacation-history-absences')}
                </div>
              </div>

              <div className="gba:bg-warning-secondary/50 gba:p-3 gba:rounded-lg gba:border gba:border-warning-secondary">
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  {t('vacation-history-total-pending')}
                </div>
                <div className="gba:flex gba:items-baseline gba:gap-1">
                  <div className="gba:text-2xl gba:font-bold gba:text-warning-secondary-foreground">
                    {totalPendingDays}
                  </div>
                  <div className="gba:text-sm gba:text-muted-foreground">
                    {totalPendingDays === 1 ? t('vacation-history-day') : t('vacation-history-days')}
                  </div>
                </div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {pendingAbsences.length} {t('vacation-history-requests')}
                </div>
              </div>
            </div>

            <Separator className="gba:my-4" />

            {/* Approved Absences Section */}
            <div className="gba:mb-6">
              <button
                onClick={() => setShowApproved(!showApproved)}
                className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted/30 gba:rounded-lg hover:gba:bg-muted/50 gba:transition-colors"
                data-testid="toggle-approved-absences"
              >
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Calendar className="gba:h-4 gba:w-4 gba:text-success-secondary-foreground" />
                  <span className="gba:font-semibold gba:text-sm">
                    {t('vacation-history-approved-section')} ({approvedAbsences.length})
                  </span>
                </div>
                {showApproved ? (
                  <ChevronUp className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                ) : (
                  <ChevronDown className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                )}
              </button>

              {showApproved && (
                <div className="gba:mt-3 gba:space-y-3">
                  {approvedAbsences.length === 0 ? (
                    <div className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm">
                      {t('vacation-history-no-approved')}
                    </div>
                  ) : (
                    approvedAbsences.map(absence => (
                      <div
                        key={absence.id}
                        className="gba:bg-background gba:border gba:border-border gba:rounded-lg gba:p-3 hover:gba:shadow-sm gba:transition-shadow"
                        data-testid={`approved-absence-${absence.id}`}
                      >
                        <div className="gba:flex gba:justify-between gba:items-start gba:mb-2">
                          <div className="gba:flex-1">
                            <div className="gba:font-medium gba:text-sm gba:mb-1">{absence.typeName}</div>
                            <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                              <Calendar className="gba:h-3 gba:w-3" />
                              {formatDateRange(absence.startDate, absence.endDate)}
                            </div>
                          </div>
                          <div className="gba:flex gba:flex-col gba:items-end gba:gap-1">
                            {getStatusBadge(absence.status)}
                            <div className="gba:text-sm gba:font-semibold gba:text-foreground">
                              {absence.workingDays}{' '}
                              {absence.workingDays === 1 ? t('vacation-history-day') : t('vacation-history-days')}
                            </div>
                          </div>
                        </div>
                        {absence.description && (
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-2 gba:pt-2 gba:border-t">
                            {absence.description}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Pending Absences Section */}
            {pendingAbsences.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPending(!showPending)}
                  className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted/30 gba:rounded-lg hover:gba:bg-muted/50 gba:transition-colors"
                  data-testid="toggle-pending-absences"
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Clock className="gba:h-4 gba:w-4 gba:text-warning-secondary-foreground" />
                    <span className="gba:font-semibold gba:text-sm">
                      {t('vacation-history-pending-section')} ({pendingAbsences.length})
                    </span>
                  </div>
                  {showPending ? (
                    <ChevronUp className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  ) : (
                    <ChevronDown className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  )}
                </button>

                {showPending && (
                  <div className="gba:mt-3 gba:space-y-3">
                    {pendingAbsences.map(absence => (
                      <div
                        key={absence.id}
                        className="gba:bg-background gba:border gba:border-border gba:rounded-lg gba:p-3 hover:gba:shadow-sm gba:transition-shadow"
                        data-testid={`pending-absence-${absence.id}`}
                      >
                        <div className="gba:flex gba:justify-between gba:items-start gba:mb-2">
                          <div className="gba:flex-1">
                            <div className="gba:font-medium gba:text-sm gba:mb-1">{absence.typeName}</div>
                            <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                              <Calendar className="gba:h-3 gba:w-3" />
                              {formatDateRange(absence.startDate, absence.endDate)}
                            </div>
                          </div>
                          <div className="gba:flex gba:flex-col gba:items-end gba:gap-1">
                            {getStatusBadge(absence.status)}
                            <div className="gba:text-sm gba:font-semibold gba:text-foreground">
                              {absence.workingDays}{' '}
                              {absence.workingDays === 1 ? t('vacation-history-day') : t('vacation-history-days')}
                            </div>
                          </div>
                        </div>
                        {absence.description && (
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-2 gba:pt-2 gba:border-t">
                            {absence.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
