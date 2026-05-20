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
import type { LeadScoreResult } from '../types/leadScoringTypes'
import {
  formatFieldName,
  formatPercent,
  formatPrimitiveValue,
  formatScoreValue,
  formatTextValue,
  getAppliedCriterionLabel,
  getGradeBadgeVariant,
  getIgnoredCriterionLabel
} from '../utils/scoreFormatting'

export interface LeadScoreResultViewProps {
  readonly result: LeadScoreResult
  readonly dataTestIdPrefix: string
}

type CriteriaListProps = Readonly<{
  title: string
  items: Array<{ label: string; details: string[] }>
  dataTestIdPrefix: string
  emptyLabel: string
}>

function CriteriaList({ title, items, dataTestIdPrefix, emptyLabel }: CriteriaListProps) {
  return (
    <Card data-testid={dataTestIdPrefix}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState title={emptyLabel} />
        ) : (
          <ul className="gba:space-y-3" data-testid={`${dataTestIdPrefix}-list`}>
            {items.map((item, index) => (
              <li key={`${item.label}-${index}`} className="gba:border gba:border-border gba:rounded-md gba:p-3">
                <div className="gba:font-medium">{item.label}</div>
                {item.details.length > 0 ? (
                  <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{item.details.join(' · ')}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export const LeadScoreResultView: React.FC<Readonly<LeadScoreResultViewProps>> = ({ result, dataTestIdPrefix }) => {
  const { t } = useTranslation(leadScoringI18n)

  const appliedCriteria = result.applied_criteria.map(item => ({
    label: getAppliedCriterionLabel(item),
    details: [
      item.message || item.reason || '',
      item.weight !== null && item.weight !== undefined
        ? `${t('lead-scoring-weight')}: ${formatPercent(item.weight)}`
        : '',
      item.score_pct !== null && item.score_pct !== undefined
        ? `${t('lead-scoring-score')}: ${formatPercent(item.score_pct)}`
        : ''
    ].filter(Boolean)
  }))

  const ignoredCriteria = result.ignored_criteria.map(item => ({
    label: getIgnoredCriterionLabel(item),
    details: [item.message || item.reason || '', item.method || ''].filter(Boolean)
  }))

  return (
    <div className="gba:space-y-4" data-testid={dataTestIdPrefix}>
      <div className="gba:grid gba:gap-4 gba:md:grid-cols-4">
        <Card data-testid={`${dataTestIdPrefix}-overall-score`}>
          <CardHeader>
            <CardTitle>{t('lead-scoring-overall-score')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:text-3xl gba:font-semibold">{formatScoreValue(result.overall_score)}</CardContent>
        </Card>

        <Card data-testid={`${dataTestIdPrefix}-grade`}>
          <CardHeader>
            <CardTitle>{t('lead-scoring-grade')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={getGradeBadgeVariant(result.grade)}>
              {result.grade || t('lead-scoring-not-available')}
            </Badge>
          </CardContent>
        </Card>

        <Card data-testid={`${dataTestIdPrefix}-company-name`}>
          <CardHeader>
            <CardTitle>{t('lead-scoring-company-name')}</CardTitle>
          </CardHeader>
          <CardContent>{formatTextValue(result.company_name)}</CardContent>
        </Card>

        <Card data-testid={`${dataTestIdPrefix}-mahalanobis`}>
          <CardHeader>
            <CardTitle>{t('lead-scoring-mahalanobis')}</CardTitle>
          </CardHeader>
          <CardContent>{formatPrimitiveValue(result.mahalanobis_similarity)}</CardContent>
        </Card>
      </div>

      {result.warnings.length > 0 ? (
        <Alert data-testid={`${dataTestIdPrefix}-warnings`}>
          <AlertDescription>
            <ul className="gba:list-disc gba:pl-5 gba:space-y-1">
              {result.warnings.map(warning => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card data-testid={`${dataTestIdPrefix}-field-scores`}>
        <CardHeader>
          <CardTitle>{t('lead-scoring-field-scores')}</CardTitle>
        </CardHeader>
        <CardContent>
          {result.field_scores.length === 0 ? (
            <EmptyState title={t('lead-scoring-no-field-scores')} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('lead-scoring-field')}</TableHead>
                  <TableHead>{t('lead-scoring-icp-value')}</TableHead>
                  <TableHead>{t('lead-scoring-lead-value')}</TableHead>
                  <TableHead>{t('lead-scoring-score')}</TableHead>
                  <TableHead>{t('lead-scoring-method')}</TableHead>
                  <TableHead>{t('lead-scoring-weight')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.field_scores.map((fieldScore, index) => (
                  <TableRow key={`${fieldScore.field}-${index}`}>
                    <TableCell>{formatFieldName(fieldScore.field)}</TableCell>
                    <TableCell>{formatPrimitiveValue(fieldScore.icp_value)}</TableCell>
                    <TableCell>{formatPrimitiveValue(fieldScore.entity_value)}</TableCell>
                    <TableCell>{formatPercent(fieldScore.score_pct ?? fieldScore.score)}</TableCell>
                    <TableCell>{fieldScore.method || t('lead-scoring-not-available')}</TableCell>
                    <TableCell>{formatPercent(fieldScore.weight)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="gba:grid gba:gap-4 gba:lg:grid-cols-2">
        <CriteriaList
          title={t('lead-scoring-applied-criteria')}
          items={appliedCriteria}
          emptyLabel={t('lead-scoring-no-applied-criteria')}
          dataTestIdPrefix={`${dataTestIdPrefix}-applied-criteria`}
        />
        <CriteriaList
          title={t('lead-scoring-ignored-criteria')}
          items={ignoredCriteria}
          emptyLabel={t('lead-scoring-no-ignored-criteria')}
          dataTestIdPrefix={`${dataTestIdPrefix}-ignored-criteria`}
        />
      </div>
    </div>
  )
}

export default LeadScoreResultView
