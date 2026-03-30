import {
  PageLayout,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { CalendarBlankIcon, CaretDownIcon, PlusIcon } from '@phosphor-icons/react'
import { BalanceCard } from './BalanceCard'
import { UpcomingAbsencesCard } from './UpcomingAbsencesCard'
import { PendingRequestsCard } from './PendingRequestsCard'
import { AbsenceHistoryCard } from './AbsenceHistoryCard'
import translations from '../_i18n'

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
  embedded?: boolean
  canAddEntitlements?: boolean
  onAddEntitlement?: () => void
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
  t,
  embedded = false,
  canAddEntitlements = false,
  onAddEntitlement
}: Readonly<PersonalAbsencesDashboardViewProps>) {
  const { t: tLocal } = useTranslation(translations)

  const handleCreateAbsence = (absenceType: string) => {
    onCreateAbsence(absenceType)
  }

  const content = (
    <div className="gba:p-4 gba:space-y-6 gba:max-w-[1400px] gba:mx-auto">
      <div className="gba:flex gba:justify-between gba:items-center">
        <h2 className="gba:text-2xl gba:font-semibold">{t('absence-overview')}</h2>
        <div className="gba:flex gba:gap-2">
          {canAddEntitlements && (
            <Button variant="outline" onClick={onAddEntitlement}>
              <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
              {tLocal('change-entitlement')}
            </Button>
          )}
          <Button variant="outline" onClick={onShowCalendar}>
            <CalendarBlankIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('calendar')}
          </Button>
          {absenceGroups.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  className="gba:w-auto gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90"
                >
                  <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('request-absence')}
                  <CaretDownIcon className="gba:w-4 gba:h-4 gba:ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {absenceGroups.map(group => (
                  <DropdownMenuItem key={group.id} onClick={() => handleCreateAbsence(group.id)}>
                    {getAbsenceGroupDisplayValue(group)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <BalanceCard
        isLoading={isLoading}
        displayEntitlements={displayEntitlements}
        otherEntitlements={otherEntitlements}
        pendingRequests={pendingRequests}
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
  )

  return (
    <div data-testid="personal-absences-container">
      {embedded ? (
        content
      ) : (
        <PageLayout headerIcon={CalendarBlankIcon} headerTitle={t('absence-overview')} className="gba:min-h-screen">
          {content}
        </PageLayout>
      )}
    </div>
  )
}
