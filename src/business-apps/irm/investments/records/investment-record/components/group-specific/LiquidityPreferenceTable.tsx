import React, { useMemo, useCallback, useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
  Spinner,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { PencilIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface LiquidityPreferenceTableProps extends BusinessAppContextProps {
  investment?: any
}

export const LiquidityPreferenceTable: React.FC<LiquidityPreferenceTableProps> = ({ accessToken, investment }) => {
  const [isLoading] = useState(false)
  const [error] = useState<string | null>(null)

  // Parse liquidity preferences from additionalProperties
  const liquidityPreferences = useMemo(() => {
    if (!investment?.additionalProperties) return []

    let additionalProps = investment.additionalProperties
    if (typeof additionalProps === 'string') {
      try {
        additionalProps = JSON.parse(additionalProps)
      } catch {
        return []
      }
    }

    return additionalProps.liquidityPreferences || []
  }, [investment])

  const hasNoData = liquidityPreferences.length === 0

  // Callback to refresh data after process completes
  const loadLiquidityData = useCallback(() => {
    // This would trigger a refetch of investment data in the parent component
    // For now, the data will refresh automatically when the parent refetches
    console.log('Liquidity preference data updated')
  }, [])

  // Render content based on current state
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:h-[200px]">
          <Spinner size="lg" />
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive" data-testid="liquidity-preference-error-alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (hasNoData) {
      return (
        <div className="gba:text-center gba:py-12" data-testid="liquidity-preference-empty-state">
          <p className="gba:text-sm gba:text-muted-foreground gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'crm.investments.analytics.liquidityPreference.noData',
              'No liquidity preferences configured yet.'
            )}
          </p>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'crm.investments.analytics.liquidityPreference.clickToAdd',
              'Click "Update Table" above to add liquidity preferences.'
            )}
          </p>
        </div>
      )
    }

    return (
      <div
        className="gba:border gba:border-border gba:rounded-lg gba:overflow-hidden"
        data-testid="liquidity-preference-table-content"
      >
        <Table>
          <TableHeader>
            <TableRow className="gba:bg-muted/50">
              <TableHead className="gba:font-semibold gba:text-foreground gba:w-[45%]">
                {getTranslationFromI18nKeyAndLabel(
                  'crm.investments.analytics.liquidityPreference.column.preference',
                  'Liquidity preference'
                )}
              </TableHead>
              <TableHead className="gba:font-semibold gba:text-foreground gba:text-center gba:w-[25%]">
                {getTranslationFromI18nKeyAndLabel(
                  'crm.investments.analytics.liquidityPreference.column.interestMultiple',
                  'Interest/ Multiple'
                )}
              </TableHead>
              <TableHead className="gba:font-semibold gba:text-foreground gba:text-center gba:w-[30%]">
                {getTranslationFromI18nKeyAndLabel(
                  'crm.investments.analytics.liquidityPreference.column.amount',
                  'Amount'
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liquidityPreferences.map((item, index) => (
              <TableRow
                key={item.id || index}
                data-testid={`liquidity-preference-row-${index}`}
                className="gba:hover:bg-muted/30"
              >
                <TableCell className="gba:font-medium gba:py-4">{item.preference}</TableCell>
                <TableCell className="gba:text-center gba:py-4">{item.interestMultiple}</TableCell>
                <TableCell className="gba:text-center gba:py-4">{item.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <Card data-testid="liquidity-preference-table" className="gba:border gba:shadow-sm">
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-start">
          <div>
            <CardTitle className="gba:text-lg gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'crm.investments.analytics.liquidityPreference.title',
                'Liquidity Preference'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel(
                'crm.investments.analytics.liquidityPreference.description',
                'Priority and terms for investment returns'
              )}
            </CardDescription>
          </div>

          {/* Update Table Button - Matches ShareholderStructureChart pattern */}
          <AppAction
            contextsArray={[FlowContextName.investmentLiquidityPreferenceUpdate]}
            externalContextData={{
              investmentId: investment?.id,
              scope: 'liquidity'
            }}
            accessToken={accessToken}
            onProcessComplete={loadLiquidityData}
            emptyStateBehavior="hide"
            data-testid="liquidity-preference-manage-action"
          >
            <Button
              size="sm"
              variant="default"
              type="button"
              data-testid="liquidity-preference-update-table-button"
              style={{ gap: 'var(--nw-spacing-xs)' }}
            >
              <PencilIcon size={16} />
              {getTranslationFromI18nKeyAndLabel('crm.investments.liquidityPreference.updateTable', 'Update Table')}
            </Button>
          </AppAction>
        </div>
      </CardHeader>

      <CardContent>{renderContent()}</CardContent>
    </Card>
  )
}

export default LiquidityPreferenceTable
