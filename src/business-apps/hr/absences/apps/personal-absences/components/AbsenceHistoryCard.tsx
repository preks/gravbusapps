import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Skeleton,
  Badge
} from '@newwork/nw-design-system'
import { CaretLeftIcon, CaretRightIcon, WarningCircleIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { statusVariant } from '../utils/statusUtils'
import type { AbsenceRow } from '../types/personalAbsences'

type TFunction = (key: string) => string

interface AbsenceHistoryCardProps {
  isLoading: boolean
  error: string | null
  typeFilter: string
  setTypeFilter: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
  currentPage: number
  setCurrentPage: (v: number | ((p: number) => number)) => void
  typeOptions: string[]
  filteredAbsences: AbsenceRow[]
  paginatedAbsences: AbsenceRow[]
  totalPages: number
  t: TFunction
}

export function AbsenceHistoryCard({
  isLoading,
  error,
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
  t
}: Readonly<AbsenceHistoryCardProps>) {
  const renderCardContent = () => {
    if (isLoading) {
      return (
        <div className="gba:space-y-2">
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-10 gba:w-full" />
        </div>
      )
    }
    if (error) {
      return (
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-destructive gba:py-4">
          <WarningCircleIcon className="gba:w-4 gba:h-4" />
          <span>{error}</span>
        </div>
      )
    }
    if (filteredAbsences.length === 0) {
      return <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8">{t('no-data-found')}</p>
    }
    return (
      <>
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('start-date')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('duration')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('description')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAbsences.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="gba:whitespace-nowrap">
                    {dayjs(a.startDate).format('MMM D')}
                    {a.startDate !== a.endDate && ` – ${dayjs(a.endDate).format('MMM D, YYYY')}`}
                    {a.startDate === a.endDate && `, ${dayjs(a.startDate).format('YYYY')}`}
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div
                        className="gba:w-2 gba:h-2 gba:rounded-full gba:shrink-0"
                        style={{ backgroundColor: `#${a.typeColor}` }}
                      />
                      {a.type}
                    </div>
                  </TableCell>
                  <TableCell>
                    {a.workingDays} {a.workingDays === 1 ? t('day') : t('days')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(a.originalStatus)}>{a.status}</Badge>
                  </TableCell>
                  <TableCell className="gba:max-w-[200px] gba:truncate">{a.description || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:pt-4">
            <span className="gba:text-sm gba:text-muted-foreground">
              {filteredAbsences.length} {t('absences')}
            </span>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <CaretLeftIcon className="gba:w-4 gba:h-4" />
              </Button>
              <span className="gba:text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <CaretRightIcon className="gba:w-4 gba:h-4" />
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:flex-col sm:gba:flex-row sm:gba:items-center sm:gba:justify-between gba:gap-3">
          <CardTitle className="gba:text-base gba:font-semibold">{t('my-absence-history')}</CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <Select
              value={typeFilter}
              onValueChange={v => {
                setTypeFilter(v)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="gba:w-[140px] gba:h-8 gba:text-sm">
                <SelectValue placeholder={t('all-types')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all-types')}</SelectItem>
                {typeOptions.map(typeLabel => (
                  <SelectItem key={typeLabel} value={typeLabel}>
                    {typeLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={v => {
                setStatusFilter(v)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="gba:w-[140px] gba:h-8 gba:text-sm">
                <SelectValue placeholder={t('status-all-placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="PENDING">{getAbsenceStatusLabel('PENDING')}</SelectItem>
                <SelectItem value="APPROVED">{getAbsenceStatusLabel('APPROVED')}</SelectItem>
                <SelectItem value="REJECTED">{getAbsenceStatusLabel('REJECTED')}</SelectItem>
                <SelectItem value="CANCELLED">{getAbsenceStatusLabel('CANCELLED')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderCardContent()}</CardContent>
    </Card>
  )
}
