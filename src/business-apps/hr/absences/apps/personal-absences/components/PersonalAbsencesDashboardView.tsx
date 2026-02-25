import React from 'react'
import { PageLayout, Button, Select, SelectContent, SelectItem, SelectTrigger } from '@newwork/nw-design-system'
import { CalendarBlankIcon, PlusIcon } from '@phosphor-icons/react'
import { BalanceCard } from './BalanceCard'
import { UpcomingAbsencesCard } from './UpcomingAbsencesCard'
import { PendingRequestsCard } from './PendingRequestsCard'
import { AbsenceHistoryCard } from './AbsenceHistoryCard'

type TFunction = (key: string) => string

interface PersonalAbsencesDashboardViewProps {
  onShowCalendar: () => void
  absenceGroups: any[]
  getAbsenceGroupDisplayValue: (group: any) => string
  onCreateAbsence: (absenceType: string) => void
  isLoading: boolean
  displayEntitlements: { type: string; used: number; total: number }[]
  otherEntitlements: { type: string; used: number; total: number }[]
  ytdAbsentDays: number
  ytdTotalWorkingDays: number
  wellnessInsight: string | null
  wellnessLoading: boolean
  wellnessDataSummary: unknown
  wellnessRequested: boolean
  onRequestWellnessAnalysis: () => void
  pendingRequests: any[]
  upcomingAbsences: any[]
  nextHoliday: { name: string; date: any } | null
  typeFilter: string
  setTypeFilter: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
  currentPage: number
  setCurrentPage: (v: number | ((p: number) => number)) => void
  typeOptions: string[]
  filteredAbsences: any[]
  paginatedAbsences: any[]
  totalPages: number
  error: string | null
  t: TFunction
}

export function PersonalAbsencesDashboardView({
  onShowCalendar,
  absenceGroups,
  getAbsenceGroupDisplayValue,
  onCreateAbsence,
  isLoading,
  displayEntitlements,
  otherEntitlements,
  ytdAbsentDays,
  ytdTotalWorkingDays,
  wellnessInsight,
  wellnessLoading,
  wellnessDataSummary,
  wellnessRequested,
  onRequestWellnessAnalysis,
  pendingRequests,
  upcomingAbsences,
  nextHoliday,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  currentPage,
  setCurrentPage,
  typeOptions,
  filteredAbsences,
  paginatedAbsences,
  totalPages,
  error,
  t
}: PersonalAbsencesDashboardViewProps) {
  return (
    <div data-testid="personal-absences-container">
      <PageLayout headerIcon={CalendarBlankIcon} headerTitle={t('absence-overview')} className="gba:min-h-screen">
        <div className="gba:p-4 gba:space-y-6 gba:max-w-[1400px] gba:mx-auto">
          <div className="gba:flex gba:justify-between gba:items-center">
            <h2 className="gba:text-2xl gba:font-semibold">{t('absence-overview')}</h2>
            <div className="gba:flex gba:gap-2">
              <Button variant="outline" onClick={onShowCalendar}>
                <CalendarBlankIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('calendar')}
              </Button>
              {absenceGroups.length > 0 && (
                <Select onValueChange={onCreateAbsence}>
                  <SelectTrigger className="gba:w-auto">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <PlusIcon className="gba:w-4 gba:h-4" />
                      {t('request-absence')}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {absenceGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {getAbsenceGroupDisplayValue(group)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <BalanceCard
            isLoading={isLoading}
            displayEntitlements={displayEntitlements}
            otherEntitlements={otherEntitlements}
            ytdAbsentDays={ytdAbsentDays}
            ytdTotalWorkingDays={ytdTotalWorkingDays}
            wellnessInsight={wellnessInsight}
            wellnessLoading={wellnessLoading}
            wellnessDataSummary={wellnessDataSummary}
            wellnessRequested={wellnessRequested}
            onRequestWellnessAnalysis={onRequestWellnessAnalysis}
            t={t}
          />

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <UpcomingAbsencesCard
              isLoading={isLoading}
              upcomingAbsences={upcomingAbsences}
              nextHoliday={nextHoliday}
              t={t}
            />
            <PendingRequestsCard isLoading={isLoading} pendingRequests={pendingRequests} t={t} />
          </div>

          <AbsenceHistoryCard
            isLoading={isLoading}
            error={error}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            typeOptions={typeOptions}
            filteredAbsences={filteredAbsences}
            paginatedAbsences={paginatedAbsences}
            totalPages={totalPages}
            t={t}
          />
        </div>
      </PageLayout>
    </div>
  )
}
