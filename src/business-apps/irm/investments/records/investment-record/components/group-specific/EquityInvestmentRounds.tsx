import React, { useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Spinner
} from '@newwork/nw-design-system'
import { TrendingUp, Plus, ExternalLink } from 'lucide-react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyString, extractCurrencyCode, formatPercentage } from '@/common/utils/numberFormatter'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { BaseEquityInvestmentRound } from '@/common/data/investment/types/investmentBaseTypes'

interface EquityInvestmentRoundsProps extends BusinessAppContextProps {
  equityData?: {
    investment?: any
    equityInvestment?: any
    documents?: any[]
  } | null
  isLoading?: boolean
  onRefresh?: () => void
  'data-testid'?: string
}

const EquityInvestmentRounds: React.FC<EquityInvestmentRoundsProps> = ({
  equityData,
  isLoading,
  accessToken,
  onRefresh,
  'data-testid': dataTestId = 'investment-rounds'
}) => {
  // Helper function to format currency using centralized utilities
  const formatCurrency = (
    amount: number | null,
    currency?: { value?: string; code?: string; id?: string } | null
  ): string => {
    if (!amount && amount !== 0) return getTranslationFromI18nKeyAndLabel('common.notAvailable', 'N/A')

    // Extract currency code using centralized utility
    const currencyCode = extractCurrencyCode(currency?.id || currency?.code || currency?.value)

    return formatCurrencyString(amount, {
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  // Helper function to format year from timestamp
  const formatYear = (yearTimestamp: string | null): string => {
    if (!yearTimestamp) return getTranslationFromI18nKeyAndLabel('common.notAvailable', 'N/A')
    try {
      // Extract year from timestamp format (e.g., "2025-01-01T00:00:00.000Z" -> "2025")
      return new Date(yearTimestamp).getFullYear().toString()
    } catch {
      return yearTimestamp // Fallback to original value if parsing fails
    }
  }

  // Get equity investment ID for action button context (this is what the form needs, not the main investment ID)
  const equityInvestmentId = equityData?.equityInvestment?.id
  const mainInvestmentId = equityData?.investment?.id

  // For the form, we need to pass the equity investment ID specifically
  const actionContextId = equityInvestmentId

  // Get investment rounds from equity data
  // Note: The equityInvestmentRound property exists in the GraphQL response but isn't in the TypeScript interface
  const investmentRounds =
    ((equityData?.equityInvestment as any)?.equityInvestmentRound as BaseEquityInvestmentRound[]) || []

  // Investment rounds loaded

  // Memoized callbacks for process completion
  const handleProcessSuccess = useCallback(() => {
    // Process completed successfully, refreshing data
    if (onRefresh) {
      onRefresh()
    }
  }, [onRefresh])

  const handleProcessFailure = useCallback(() => {
    // Process failed, but still refreshing data to check for changes
    // Even on failure, refresh to check if the delete actually succeeded
    if (onRefresh) {
      onRefresh()
    }
  }, [onRefresh])

  // Listen for process completion events and refresh data when equity round processes complete
  useProcessCompletion({
    onSuccess: handleProcessSuccess,
    onFailure: handleProcessFailure
  })

  if (isLoading) {
    return (
      <Card data-testid={dataTestId} className="gba:border gba:shadow-sm">
        <CardHeader>
          <CardTitle className="gba:text-lg gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('investment.rounds.investmentRounds', 'Investment Rounds')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-[200px]">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={dataTestId} className="gba:border gba:shadow-sm">
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-start">
          <div>
            <CardTitle className="gba:text-lg gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('investment.rounds.investmentRounds', 'Investment Rounds')}
              <Badge variant="outline" className="gba:ml-2">
                {investmentRounds.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'investment.rounds.description',
                'Funding rounds and capital raises for this investment'
              )}
            </CardDescription>
          </div>
          {accessToken && actionContextId ? (
            <AppAction
              contexts={[
                {
                  context: FlowContextName.investmentEquityInvestmentRoundCreate,
                  contextData: {
                    equityInvestmentId: actionContextId,
                    targetEquityInvestmentId: actionContextId,
                    customEquityId: actionContextId,
                    investmentId: mainInvestmentId,
                    mainInvestmentId: mainInvestmentId,
                    entityId: actionContextId,
                    parentEntityId: actionContextId,
                    equityInvestment: actionContextId
                  }
                }
              ]}
              accessToken={accessToken}
              emptyState="enable"
              prefixDataTestId="equity-round-add"
            >
              <Button
                size="sm"
                variant="default"
                type="button"
                data-testid="equity-round-add-button"
                style={{ gap: 'var(--nw-spacing-xs)' }}
              >
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('investment.rounds.addRound', 'Add Round')}
              </Button>
            </AppAction>
          ) : (
            <Button
              disabled
              size="sm"
              variant="outline"
              type="button"
              data-testid="equity-round-add-button-disabled"
              style={{ gap: 'var(--nw-spacing-xs)' }}
            >
              <Plus size={16} />
              {getTranslationFromI18nKeyAndLabel('investment.rounds.addRound', 'Add Round')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {investmentRounds.length === 0 ? (
          <div className="gba:text-center gba:py-12" data-testid="investment-rounds-empty-state">
            <TrendingUp className="gba:h-12 gba:w-12 gba:text-muted-foreground gba:mx-auto gba:mb-2" />
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-2">
              {getTranslationFromI18nKeyAndLabel(
                'investment.rounds.noInvestmentRounds',
                'No investment rounds recorded yet.'
              )}
            </p>
            <p className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'investment.rounds.clickToAdd',
                'Click "Add Round" above to record a funding round.'
              )}
            </p>
          </div>
        ) : (
          <div
            className="gba:border gba:border-border gba:rounded-lg gba:overflow-hidden"
            data-testid={`${dataTestId}-table-content`}
          >
            <Table data-testid={`${dataTestId}-table`}>
              <TableHeader>
                <TableRow className="gba:bg-muted/50">
                  <TableHead className="gba:font-semibold gba:text-foreground">
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.name', 'Name')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-foreground gba:text-center">
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.year', 'Year')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-foreground gba:text-right">
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.preValue', 'Pre Value')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-foreground gba:text-right">
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.investmentVolume', 'Volume')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-foreground gba:text-center">
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.sharePercentage', 'Share %')}
                  </TableHead>
                  <TableHead className="gba:font-semibold gba:text-foreground">
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.source', 'Source')}
                  </TableHead>
                  <TableHead className="gba:w-[60px] gba:font-semibold gba:text-foreground">
                    {getTranslationFromI18nKeyAndLabel('investment.rounds.actions', '')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investmentRounds.map((round: BaseEquityInvestmentRound, index: number) => (
                  <TableRow
                    key={round.id || index}
                    className="gba:hover:bg-muted/30"
                    data-testid={`${dataTestId}-row-${index}`}
                  >
                    <TableCell className="gba:font-medium gba:py-4">
                      {round.name ||
                        `${getTranslationFromI18nKeyAndLabel('investment.rounds.round', 'Round')} ${index + 1}`}
                    </TableCell>
                    <TableCell className="gba:text-center gba:py-4">{formatYear(round.year || null)}</TableCell>
                    <TableCell className="gba:text-right gba:py-4">
                      {formatCurrency(round.preValue ?? null, round.currency || null)}
                    </TableCell>
                    <TableCell className="gba:text-right gba:py-4">
                      {formatCurrency(round.investmentVolume ?? null, round.currency || null)}
                    </TableCell>
                    <TableCell className="gba:text-center gba:py-4">
                      <Badge variant="secondary">
                        {round.roundSharePercentage !== null && round.roundSharePercentage !== undefined
                          ? formatPercentage(round.roundSharePercentage, 1)
                          : getTranslationFromI18nKeyAndLabel('common.notAvailable', 'N/A')}
                      </Badge>
                    </TableCell>
                    <TableCell className="gba:py-4">
                      {round.investmentOpportunity || round.investmentOpportunityId ? (
                        <a
                          href={buildPlatformUrl('/platform/irm/opportunity-record', {
                            opportunityId: round.investmentOpportunity?.id || round.investmentOpportunityId || ''
                          })}
                          className="gba:text-primary gba:hover:underline gba:cursor-pointer gba:flex gba:items-center gba:gap-1"
                          onClick={e => e.stopPropagation()}
                          data-testid={`${dataTestId}-source-link-${round.id || index}`}
                        >
                          {round.investmentOpportunity?.name ||
                            getTranslationFromI18nKeyAndLabel('investment.rounds.viewOpportunity', 'View Opportunity')}
                          <ExternalLink className="gba:h-3 gba:w-3" />
                        </a>
                      ) : (
                        <span className="gba:text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="gba:py-4">
                      <AppAction
                        variant="table-row"
                        contexts={[
                          {
                            context: FlowContextName.investmentEquityInvestmentRoundUpdate,
                            contextData: {
                              equityInvestmentRoundId: round.id,
                              entityId: round.id,
                              equityInvestmentId: actionContextId,
                              roundData: round
                            }
                          },
                          {
                            context: FlowContextName.investmentEquityInvestmentRoundDelete,
                            contextData: {
                              equityInvestmentRoundId: round.id,
                              entityId: round.id,
                              equityInvestmentId: actionContextId,
                              roundData: round
                            }
                          }
                        ]}
                        prefixDataTestId={`equity-round-actions-${round.id || index}`}
                        accessToken={accessToken}
                        emptyState="enable"
                        lazyLoad
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EquityInvestmentRounds
