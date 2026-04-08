import React, { useState, useMemo } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useTranslation
} from '@newwork/nw-design-system'
import { CaretUpDown, Check, ClipboardText, User, Users, UserCircle } from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { useReviewerList } from '../hooks/useReviewerList'
import { useReviewerEvaluations } from '../hooks/useReviewerEvaluations'
import { useEmployeeEvaluations } from '../hooks/useEmployeeEvaluations'
import { EmployeeEvaluationsCard } from './EmployeeEvaluationsCard'
import type { ReviewerEvaluationItem } from '../types'
import { formatDate, formatReviewerType, formatReviewerStatus, getStatusBadgeVariant } from '../utils/formatLabels'
import translations from '../_i18n'

function buildReviewerKpis(
  evaluations: ReviewerEvaluationItem[],
  t: (key: string, vars?: Record<string, unknown>) => string
): WidgetItem[] {
  const byType = (type: string) => evaluations.filter(e => e.reviewerType === type)
  const completed = (items: ReviewerEvaluationItem[]) => items.filter(e => e.completedDate).length

  const manager = byType('MANAGER_EVALUATION_PARTICIPANT_TYPE')
  const self = byType('SELF_EVALUATION_PARTICIPANT_TYPE')
  const peer = byType('PEER_EVALUATION_PARTICIPANT_TYPE')

  return [
    {
      key: 'total-reviews',
      title: t('kpi-total-reviews'),
      value: evaluations.length,
      prefix: <ClipboardText size={20} aria-hidden />,
      color: '#1890ff',
      footer: t('kpi-completed-pending-footer', {
        completed: completed(evaluations),
        pending: evaluations.length - completed(evaluations)
      })
    },
    {
      key: 'manager-reviews',
      title: t('kpi-manager-reviews'),
      value: manager.length,
      prefix: <UserCircle size={20} aria-hidden />,
      color: '#722ed1',
      footer: t('kpi-completed-pending-footer', {
        completed: completed(manager),
        pending: manager.length - completed(manager)
      })
    },
    {
      key: 'self-reviews',
      title: t('kpi-self-reviews'),
      value: self.length,
      prefix: <User size={20} aria-hidden />,
      color: '#13c2c2',
      footer: t('kpi-completed-pending-footer', { completed: completed(self), pending: self.length - completed(self) })
    },
    {
      key: 'peer-reviews',
      title: t('kpi-peer-reviews'),
      value: peer.length,
      prefix: <Users size={20} aria-hidden />,
      color: '#fa8c16',
      footer: t('kpi-completed-pending-footer', { completed: completed(peer), pending: peer.length - completed(peer) })
    }
  ]
}

interface ReviewerTrackingTabProps {
  accessToken: string | undefined
}

export const ReviewerTrackingTab: React.FC<ReviewerTrackingTabProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)
  const { reviewers, loading: listLoading, error: listError } = useReviewerList(accessToken)
  const [selectedReviewerId, setSelectedReviewerId] = useState<string | null>(null)
  const [comboboxOpen, setComboboxOpen] = useState(false)

  const selectedReviewer = reviewers.find(r => r.reviewerEmployeeId === selectedReviewerId) ?? reviewers[0] ?? null
  const activeReviewerId = selectedReviewer?.reviewerEmployeeId ?? null

  const { evaluations, loading: evalLoading, error: evalError } = useReviewerEvaluations(accessToken, activeReviewerId)

  const {
    evaluations: employeeEvals,
    loading: empEvalLoading,
    error: empEvalError
  } = useEmployeeEvaluations(accessToken, activeReviewerId)
  const completedCount = evaluations.filter(e => e.completedDate).length
  const pendingCount = evaluations.length - completedCount

  const kpiWidgets = useMemo(() => buildReviewerKpis(evaluations, t), [evaluations, t])

  const reviewerOptions = useMemo(
    () => reviewers.map(r => ({ value: r.reviewerEmployeeId, label: r.reviewerName })),
    [reviewers]
  )

  const handleSelectReviewer = (value: string) => {
    setSelectedReviewerId(value)
    setComboboxOpen(false)
  }

  if (listError) {
    return (
      <div className="gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-destructive gba:text-sm">
        {listError}
      </div>
    )
  }

  if (listLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-12">
        <Spinner size="lg" data-testid="reviewer-tracking-loading" />
      </div>
    )
  }

  if (reviewers.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:text-muted-foreground">
        <UserCircle size={48} className="gba:mb-4 gba:opacity-40" />
        <p className="gba:text-lg gba:font-medium">{t('empty-no-reviewers-title')}</p>
        <p className="gba:text-sm">{t('empty-no-reviewers-description')}</p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6">
      <div className="gba:flex gba:items-center gba:gap-3">
        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="gba:min-w-[320px] gba:justify-between"
              data-testid="reviewer-tracking-employee-select"
            >
              {selectedReviewer ? selectedReviewer.reviewerName : t('select-reviewer-placeholder')}
              <CaretUpDown className="gba:ml-2 gba:opacity-50" size={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="gba:w-[320px] gba:p-0" align="start">
            <Command>
              <CommandInput placeholder={t('search-reviewers-placeholder')} />
              <CommandList>
                <CommandEmpty>{t('empty-no-reviewer-found')}</CommandEmpty>
                <CommandGroup>
                  {reviewerOptions.map(option => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => handleSelectReviewer(option.value)}
                    >
                      <Check
                        size={16}
                        className={`gba:mr-2 ${activeReviewerId === option.value ? 'gba:opacity-100' : 'gba:opacity-0'}`}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedReviewer && (
        <WidgetGroup widgets={kpiWidgets} isLoading={evalLoading} error={null} data-testid="reviewer-tracking-kpis" />
      )}

      {selectedReviewer && (
        <Card data-testid="reviewer-evaluations-card">
          <CardHeader>
            <CardTitle className="gba:text-lg">
              {t('reviewer-reviews-title', { name: selectedReviewer.reviewerName })}
            </CardTitle>
            <p className="gba:text-sm gba:text-muted-foreground">
              {t('reviewer-reviews-description', {
                count: evaluations.length,
                pending: pendingCount,
                completed: completedCount
              })}
            </p>
          </CardHeader>
          <CardContent>
            {evalError && (
              <div className="gba:mb-4 gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-destructive gba:text-sm">
                {evalError}
              </div>
            )}
            <div className="gba:border gba:rounded-lg gba:overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table-employee-evaluated')}</TableHead>
                    <TableHead>{t('table-cycle')}</TableHead>
                    <TableHead>{t('table-role')}</TableHead>
                    <TableHead>{t('table-status')}</TableHead>
                    <TableHead>{t('table-assigned')}</TableHead>
                    <TableHead>{t('table-completed')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evalLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="gba:py-8 gba:text-center">
                        <Spinner className="gba:mx-auto gba:h-8 gba:w-8" />
                      </TableCell>
                    </TableRow>
                  ) : evaluations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="gba:text-center gba:text-muted-foreground gba:py-8">
                        {t('empty-no-reviews-for-reviewer')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    evaluations.map(evalItem => <ReviewRow key={evalItem.id} evaluation={evalItem} />)
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedReviewer && (
        <EmployeeEvaluationsCard
          employeeName={selectedReviewer.reviewerName}
          evaluations={employeeEvals}
          loading={empEvalLoading}
          error={empEvalError}
        />
      )}
    </div>
  )
}

function ReviewRow({ evaluation }: Readonly<{ evaluation: ReviewerEvaluationItem }>) {
  const { t } = useTranslation(translations)

  return (
    <TableRow data-testid={`reviewer-eval-row-${evaluation.id}`}>
      <TableCell className="gba:font-medium">{evaluation.employeeName}</TableCell>
      <TableCell>{evaluation.cycleName}</TableCell>
      <TableCell>
        <Badge variant="outline" className="gba:text-xs">
          {formatReviewerType(evaluation.reviewerType, t)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(evaluation.status)}>{formatReviewerStatus(evaluation.status, t)}</Badge>
      </TableCell>
      <TableCell>{formatDate(evaluation.assignedDate)}</TableCell>
      <TableCell>{formatDate(evaluation.completedDate)}</TableCell>
    </TableRow>
  )
}
