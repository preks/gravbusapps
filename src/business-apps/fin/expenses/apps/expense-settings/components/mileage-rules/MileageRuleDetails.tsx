import React, { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Badge,
  Button,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system'
import { PiClock, PiCurrencyDollar, PiMapPin, PiUsers, PiArrowUpRight } from 'react-icons/pi'
import { EnhancedMileageRule } from '../../hooks/useMileageRulesIntegration'
import { useGetCalculationRuleUsage, CalculationRuleUsage } from '../../queries/MileageRuleQueries'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

interface MileageRuleDetailsProps extends BusinessAppContextProps {
  mileageRule: EnhancedMileageRule
  onNavigateToCalculationRule?: (ruleId: string, page?: string) => void
}

const MileageRuleDetails: React.FC<MileageRuleDetailsProps> = ({
  mileageRule,
  onNavigateToCalculationRule,
  ...context
}) => {
  const [calculationRules, setCalculationRules] = useState<CalculationRuleUsage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { fetchCalculationRulesUsingMileageRule } = useGetCalculationRuleUsage(context)

  // Load calculation rules that use this mileage rule
  const loadCalculationRules = useCallback(
    async (pageNumber = 0, append = false) => {
      if (!mileageRule.code) return

      if (pageNumber === 0) {
        setIsLoading(true)
        setCalculationRules([])
      } else {
        setIsLoadingMore(true)
      }
      setError(null)

      try {
        const result = await fetchCalculationRulesUsingMileageRule(mileageRule.code)
        const newRules = result?.ExpenseRule || []

        // For now, simulate pagination since the API doesn't support it yet
        const pageSize = 10
        const start = pageNumber * pageSize
        const end = start + pageSize
        const paginatedRules = newRules.slice(start, end)

        if (append) {
          setCalculationRules(prev => [...prev, ...paginatedRules])
        } else {
          setCalculationRules(paginatedRules)
        }

        setHasMore(end < newRules.length)
        setPage(pageNumber)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load calculation rules'
        setError(errorMessage)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [mileageRule.code, fetchCalculationRulesUsingMileageRule]
  )

  // Load more calculation rules
  const loadMoreCalculationRules = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadCalculationRules(page + 1, true)
    }
  }, [isLoadingMore, hasMore, page, loadCalculationRules])

  // Scroll event handler for infinite scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || isLoadingMore || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = container
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadMoreCalculationRules()
    }
  }, [isLoadingMore, hasMore, loadMoreCalculationRules])

  useEffect(() => {
    loadCalculationRules(0, false)
  }, [loadCalculationRules])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  return (
    <div className="gba:space-y-6" data-testid="mileage-rule-details">
      {/* Basic Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiCurrencyDollar className="gba:text-primary" />
            {getTranslationFromI18nKeyAndLabel('expense-settings:mileage_rule_information', 'Mileage Rule Information')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <dt className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('expense-settings:rule_code', 'Rule Code')}
              </dt>
              <dd className="gba:mt-1 gba:text-sm gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
                {mileageRule.code}
              </dd>
            </div>

            <div>
              <dt className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('expense-settings:rule_name', 'Rule Name')}
              </dt>
              <dd className="gba:mt-1 gba:text-sm gba:font-semibold">{mileageRule.name}</dd>
            </div>

            <div>
              <dt className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('expense-settings:status', 'Status')}
              </dt>
              <dd className="gba:mt-1">
                <Badge variant={mileageRule.isActive ? 'default' : 'secondary'}>
                  {mileageRule.isActive
                    ? getTranslationFromI18nKeyAndLabel('expense-settings:active', 'Active')
                    : getTranslationFromI18nKeyAndLabel('expense-settings:inactive', 'Inactive')}
                </Badge>
              </dd>
            </div>

            <div className="gba:col-span-2">
              <dt className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('expense-settings:valid_period', 'Valid Period')}
              </dt>
              <dd className="gba:mt-1 gba:flex gba:items-center gba:gap-2">
                <PiClock className="gba:text-muted-foreground" />
                <span className="gba:text-sm">{mileageRule.validityPeriod}</span>
              </dd>
            </div>

            {mileageRule.rulePeriodLabel && (
              <div className="gba:col-span-2">
                <dt className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('expense-settings:rule_period', 'Rule Period')}
                </dt>
                <dd className="gba:mt-1">
                  <Badge variant="outline">{mileageRule.rulePeriodLabel}</Badge>
                </dd>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rate Details Card */}
      {mileageRule.details && mileageRule.details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('expense-settings:rate_details', 'Rate Details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-3">
              {[...mileageRule.details]
                .sort((a, b) => {
                  // Sort by limitFrom, with undefined values at the end
                  if (a.limitFrom === undefined && b.limitFrom === undefined) return 0
                  if (a.limitFrom === undefined) return 1
                  if (b.limitFrom === undefined) return -1
                  return a.limitFrom - b.limitFrom
                })
                .map(detail => (
                  <div key={detail.id} className="gba:p-3 gba:border gba:border-border gba:rounded-md gba:bg-muted">
                    <div className="gba:flex gba:justify-between gba:items-center">
                      <div>
                        {(detail.limitFrom !== undefined || detail.limitTo !== undefined) && (
                          <div className="gba:text-sm gba:text-muted-foreground gba:font-medium">
                            {detail.limitFrom !== undefined && detail.limitTo !== undefined
                              ? `${detail.limitFrom} - ${detail.limitTo} km`
                              : detail.limitFrom !== undefined
                                ? `From ${detail.limitFrom} km`
                                : `Up to ${detail.limitTo} km`}
                          </div>
                        )}
                      </div>
                      <div className="gba:text-right">
                        <span className="gba:text-lg gba:font-semibold gba:text-success">
                          {formatAmount(detail.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Used in Calculation Rules Card */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiUsers className="gba:text-primary" />
              {getTranslationFromI18nKeyAndLabel(
                'expense-settings:used_in_calculation_rules',
                'Used in Calculation Rules'
              )}
              <Badge variant="default">{calculationRules.length}</Badge>
            </CardTitle>

            <Button
              size="sm"
              variant="outline"
              onClick={() => loadCalculationRules(0, false)}
              disabled={isLoading}
              data-testid="mileage-rule-details-refresh-button"
            >
              {getTranslationFromI18nKeyAndLabel('expense-settings:refresh', 'Refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="gba:mb-4">
              <AlertDescription>
                <div>
                  <strong>
                    {getTranslationFromI18nKeyAndLabel(
                      'expense-settings:error_loading_calculation_rules',
                      'Error Loading Calculation Rules'
                    )}
                  </strong>
                  <br />
                  {error}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {calculationRules.length === 0 && !isLoading ? (
            <Alert>
              <AlertDescription>
                <div>
                  <strong>
                    {getTranslationFromI18nKeyAndLabel(
                      'expense-settings:no_calculation_rules_found',
                      'No Calculation Rules Found'
                    )}
                  </strong>
                  <br />
                  {getTranslationFromI18nKeyAndLabel(
                    'expense-settings:mileage_rule_not_used',
                    'This mileage rule is not currently used in any calculation rules.'
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <div
              ref={scrollContainerRef}
              className="gba:max-h-96 gba:overflow-y-auto gba:space-y-3"
              data-testid="calculation-rules-container"
            >
              {isLoading && calculationRules.length === 0 ? (
                <div className="gba:flex gba:justify-center gba:py-8">
                  <div className="gba:text-muted-foreground">Loading calculation rules...</div>
                </div>
              ) : (
                <>
                  {calculationRules.map(rule => (
                    <Card
                      key={rule.id}
                      className="gba:border gba:border-border gba:hover:border-primary gba:transition-colors gba:cursor-pointer"
                      onClick={() => onNavigateToCalculationRule?.(rule.id, 'Mileage Rules')}
                      data-testid={`calculation-rule-item-${rule.id}`}
                    >
                      <div className="gba:flex gba:justify-between gba:items-start">
                        <div className="gba:flex-1">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                            <span className="gba:font-mono gba:text-sm gba:bg-primary/10 gba:px-2 gba:py-1 gba:rounded">
                              {rule.code}
                            </span>
                            <Badge variant="default" className="gba:text-xs">
                              {rule.calculationType?.value || 'N/A'}
                            </Badge>
                          </div>

                          <div className="gba:mb-2">
                            <span className="gba:font-semibold gba:text-base">{rule.name || '-'}</span>
                          </div>

                          <div className="gba:flex gba:flex-wrap gba:gap-4 gba:text-sm gba:text-muted-foreground">
                            <div className="gba:flex gba:items-center gba:gap-1">
                              <PiMapPin size={14} />
                              <span>{rule.country?.code || '-'}</span>
                            </div>

                            <div className="gba:flex gba:items-center gba:gap-1">
                              <PiCurrencyDollar size={14} />
                              <span>{rule.currency?.code || '-'}</span>
                            </div>

                            <div className="gba:flex gba:items-center gba:gap-1">
                              <PiClock size={14} />
                              <span>
                                {dayjs(rule.activeFrom).format('DD.MM.YYYY')} -
                                {rule.activeTo ? dayjs(rule.activeTo).format('DD.MM.YYYY') : 'No end'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="gba:opacity-70 gba:hover:opacity-100"
                          onClick={e => {
                            e.stopPropagation()
                            onNavigateToCalculationRule?.(rule.id, 'Mileage Rules')
                          }}
                          title={getTranslationFromI18nKeyAndLabel(
                            'expense-settings:view_calculation_rule',
                            'View Calculation Rule'
                          )}
                          data-testid={`calculation-rule-view-button-${rule.id}`}
                        >
                          <PiArrowUpRight />
                        </Button>
                      </div>
                    </Card>
                  ))}

                  {isLoadingMore && (
                    <div className="gba:flex gba:justify-center gba:py-4">
                      <div className="gba:text-muted-foreground">Loading more...</div>
                    </div>
                  )}

                  {!hasMore && calculationRules.length > 0 && (
                    <div className="gba:text-center gba:py-4 gba:text-muted-foreground gba:text-sm">
                      {getTranslationFromI18nKeyAndLabel(
                        'expense-settings:no_more_calculation_rules',
                        'No more calculation rules to load'
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MileageRuleDetails
