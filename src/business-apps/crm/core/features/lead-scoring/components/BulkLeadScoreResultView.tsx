import React from 'react'
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useTranslation
} from '@newwork/nw-design-system'
import leadScoringI18n from '../_i18n'
import type { BulkLeadScoreResult } from '../types/leadScoringTypes'
import {
  formatNumber,
  formatScoreValue,
  formatTextValue,
  getBulkCount,
  getBulkMean,
  getBulkMedian,
  getBulkRequestedCount,
  getBulkScoredCount,
  getBulkStandardDeviation,
  getGradeBadgeVariant
} from '../utils/scoreFormatting'

export interface BulkLeadScoreResultViewProps {
  readonly result: BulkLeadScoreResult
  readonly requestedLeadCount: number
  readonly dataTestIdPrefix: string
}

type StatisticCardProps = Readonly<{
  title: string
  value: string
  dataTestId: string
}>

function StatisticCard({ title, value, dataTestId }: StatisticCardProps) {
  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="gba:text-2xl gba:font-semibold">{value}</CardContent>
    </Card>
  )
}

export const BulkLeadScoreResultView: React.FC<Readonly<BulkLeadScoreResultViewProps>> = ({
  result,
  requestedLeadCount,
  dataTestIdPrefix
}) => {
  const { t } = useTranslation(leadScoringI18n)

  const requestedCount = getBulkRequestedCount(result, requestedLeadCount)
  const scoredCount = getBulkScoredCount(result)

  return (
    <div className="gba:space-y-4" data-testid={dataTestIdPrefix}>
      <div className="gba:grid gba:gap-4 gba:md:grid-cols-4">
        <StatisticCard
          title={t('lead-scoring-mean')}
          value={formatScoreValue(getBulkMean(result))}
          dataTestId={`${dataTestIdPrefix}-mean`}
        />
        <StatisticCard
          title={t('lead-scoring-median')}
          value={formatScoreValue(getBulkMedian(result))}
          dataTestId={`${dataTestIdPrefix}-median`}
        />
        <StatisticCard
          title={t('lead-scoring-standard-deviation')}
          value={formatNumber(getBulkStandardDeviation(result))}
          dataTestId={`${dataTestIdPrefix}-std-dev`}
        />
        <StatisticCard
          title={t('lead-scoring-count')}
          value={formatNumber(getBulkCount(result))}
          dataTestId={`${dataTestIdPrefix}-count`}
        />
      </div>

      <Alert data-testid={`${dataTestIdPrefix}-diagnostic`}>
        <AlertDescription>
          {t('lead-scoring-bulk-diagnostic', {
            requested: requestedCount,
            scored: scoredCount
          })}
        </AlertDescription>
      </Alert>

      <Card data-testid={`${dataTestIdPrefix}-results`}>
        <CardHeader>
          <CardTitle>{t('lead-scoring-bulk-results')}</CardTitle>
        </CardHeader>
        <CardContent>
          {result.results.length === 0 ? (
            <EmptyState title={t('lead-scoring-no-results')} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('lead-scoring-rank')}</TableHead>
                  <TableHead>{t('lead-scoring-lead-id')}</TableHead>
                  <TableHead>{t('lead-scoring-company-name')}</TableHead>
                  <TableHead>{t('lead-scoring-overall-score')}</TableHead>
                  <TableHead>{t('lead-scoring-grade')}</TableHead>
                  <TableHead>{t('lead-scoring-mahalanobis')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.results.map((lead, index) => (
                  <TableRow key={`${lead.entity_id}-${index}`}>
                    <TableCell>{lead.rank ?? index + 1}</TableCell>
                    <TableCell>{lead.entity_id}</TableCell>
                    <TableCell>{formatTextValue(lead.company_name)}</TableCell>
                    <TableCell>{formatScoreValue(lead.overall_score)}</TableCell>
                    <TableCell>
                      <Badge variant={getGradeBadgeVariant(lead.grade)}>
                        {lead.grade || t('lead-scoring-not-available')}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatNumber(lead.mahalanobis_similarity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default BulkLeadScoreResultView
