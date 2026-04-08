import React, { useMemo } from 'react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import type { EvaluationDetail } from '../types'
import translations from '../_i18n'

interface ReviewSummary {
  id: string
  name: string
  total: number
  completed: number
  pending: number
}

function buildReviewSummaries(evaluations: EvaluationDetail[], reviewerType: string): ReviewSummary[] {
  const map = new Map<string, ReviewSummary>()

  for (const evaluation of evaluations) {
    for (const reviewer of evaluation.reviewers) {
      if (reviewer.reviewerType !== reviewerType) continue
      const id = reviewer.reviewerEmployeeId ?? reviewer.id
      const existing = map.get(id)
      if (existing) {
        existing.total++
        if (reviewer.completedDate) {
          existing.completed++
        } else {
          existing.pending++
        }
      } else {
        map.set(id, {
          id,
          name: reviewer.reviewerName,
          total: 1,
          completed: reviewer.completedDate ? 1 : 0,
          pending: reviewer.completedDate ? 0 : 1
        })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

interface ReviewSummaryTableCardProps {
  readonly testId: string
  readonly titleKey: string
  readonly descriptionKey: string
  readonly firstColumnHeaderKey: string
  readonly emptyMessageKey: string
  readonly rowTestIdPrefix: string
  readonly reviewerType: string
  readonly evaluations: EvaluationDetail[]
  readonly loading: boolean
  readonly cycleName: string
}

export const ReviewSummaryTableCard: React.FC<ReviewSummaryTableCardProps> = ({
  testId,
  titleKey,
  descriptionKey,
  firstColumnHeaderKey,
  emptyMessageKey,
  rowTestIdPrefix,
  reviewerType,
  evaluations,
  loading,
  cycleName
}) => {
  const { t } = useTranslation(translations)
  const summaries = useMemo(() => buildReviewSummaries(evaluations, reviewerType), [evaluations, reviewerType])

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="gba:text-lg">{t(titleKey, { name: cycleName })}</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">{t(descriptionKey, { count: summaries.length })}</p>
      </CardHeader>
      <CardContent>
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(firstColumnHeaderKey)}</TableHead>
                <TableHead>{t('table-total-tasks')}</TableHead>
                <TableHead>{t('table-completed')}</TableHead>
                <TableHead>{t('table-pending')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:py-8 gba:text-center">
                    <Spinner className="gba:mx-auto gba:h-8 gba:w-8" />
                  </TableCell>
                </TableRow>
              ) : summaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:text-center gba:text-muted-foreground gba:py-8">
                    {t(emptyMessageKey)}
                  </TableCell>
                </TableRow>
              ) : (
                summaries.map(item => (
                  <TableRow key={item.id} data-testid={`${rowTestIdPrefix}-${item.id}`}>
                    <TableCell className="gba:font-medium">{item.name}</TableCell>
                    <TableCell>{item.total}</TableCell>
                    <TableCell>
                      <Badge variant="default">{item.completed}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.pending > 0 ? 'outline' : 'default'}>{item.pending}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
