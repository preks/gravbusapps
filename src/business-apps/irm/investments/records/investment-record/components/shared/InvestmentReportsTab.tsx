// Investment Record — Reports Tab (thin wrapper around InvestmentReportPanel)
//
// This tab reuses the same group-agnostic, catalog-driven report rendering
// pipeline as the portfolio-level investment report view. It does so by:
//
//   1. Looking up the per-group configuration via `getReportGroupConfiguration`,
//      which automatically falls back to `DEFAULT_REPORT_GROUP_CONFIGURATION`
//      for any group not explicitly configured (so new investment groups added
//      to the catalog work here without code changes).
//   2. Resolving the locked sub-section for this record via the configuration's
//      `getRecordSection(investment, typeSpecificData)` accessor — the only
//      group-specific knowledge needed lives in one place
//      (`reportGroupConfigurations.tsx`).
//   3. Rendering `InvestmentReportPanel` with `extraWhereFilters` set to
//      `{ investmentIds: [investmentId] }`, which `buildWhere` translates to a
//      `where: { investmentId: { _in: [...] } }` GraphQL clause via the
//      existing `INVESTMENT_REPORT_DESCRIPTORS` definition. The whole catalog
//      filter / column visibility / sorting / search / export pipeline is
//      inherited automatically and scoped to this single investment.
//
// Anything specific to "the record context" (hide the section bar, append the
// "Add Report" action with the investment in flow context) is wired here.
import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  InvestmentReportPanel,
  ReportFiltersHeader,
  getReportGroupConfiguration,
  type SubSection,
  useReportFilters
} from '@/business-apps/irm/investments/apps/investment-management/views/report-view'

interface InvestmentReportsTabProps extends BusinessAppContextProps {
  /** The investment whose reports we're displaying. */
  investmentId: string
  /** Catalog data (passed through to the panel for filter/column generation). */
  catalogData: any
  /** Full investment record (used to resolve the locked section). */
  investment?: any
  /** Group-specific data (e.g. `liquidFundInvestment.investmentLiquidFundType`). */
  typeSpecificData?: any
  /** Optional override for primary action (defaults to "Add Report" prefilled with investmentId). */
  primaryAction?: React.ReactNode
  'data-testid'?: string
}

/**
 * Build the locked section for this record. Falls back to a synthetic
 * "overview" section so the panel always has a valid section to display
 * when the group has no per-type breakdown.
 */
const resolveRecordSection = (investmentGroup: string, investment: any, typeSpecificData: any): SubSection => {
  const config = getReportGroupConfiguration(investmentGroup)
  const resolved = config.getRecordSection?.(investment, typeSpecificData)
  if (resolved) return resolved

  return {
    id: 'overview',
    code: investmentGroup,
    value: 'Overview',
    label: 'Overview'
  }
}

const InvestmentReportsTab: React.FC<InvestmentReportsTabProps> = ({
  investmentId,
  catalogData,
  investment,
  typeSpecificData,
  primaryAction,
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'investment-reports-tab'
}) => {
  const reportFilters = useReportFilters()
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([])

  const investmentGroup: string = investment?.investmentGroup?.code || ''
  const groupLabel: string = investment?.investmentGroup?.value || investmentGroup || 'Investment'

  const lockedSection = useMemo<SubSection>(
    () => resolveRecordSection(investmentGroup, investment, typeSpecificData),
    [investmentGroup, investment, typeSpecificData]
  )

  const extraWhereFilters = useMemo(() => ({ investmentIds: [investmentId] }), [investmentId])

  /**
   * Inject the currently selected currencies into the shared report filters
   * before handing them to the panel — same pattern as `ReportView.getFiltersForTab`.
   * The panel itself doesn't own currency state because the portfolio view
   * needs a per-tab currency map; here we just have one scope.
   */
  const reportFiltersWithCurrencies = useMemo(
    () => ({
      ...reportFilters,
      selectedCurrencies,
      computedFilters: {
        ...reportFilters.computedFilters,
        currencyIds: selectedCurrencies.length > 0 ? selectedCurrencies : undefined
      }
    }),
    [reportFilters, selectedCurrencies]
  )

  // Default primary action: "Add Report" prefilled with this investment.
  // Consumers can override via the `primaryAction` prop.
  const resolvedPrimaryAction = useMemo(() => {
    if (primaryAction) return primaryAction
    if (!accessToken) return undefined
    return (
      <AppAction
        variant="create-primary"
        contexts={[
          {
            context: FlowContextName.investmentReportCreate,
            contextData: { investmentId }
          }
        ]}
        accessToken={accessToken}
        data-testid="investment-record-add-report-action"
        emptyState="hide"
      >
        {getTranslationFromI18nKeyAndLabel('investment.reports.addReport', 'Add Report')}
      </AppAction>
    )
  }, [primaryAction, accessToken, investmentId])

  if (!investmentGroup) {
    return (
      <Card data-testid={`${dataTestId}-missing-group`}>
        <CardContent className="gba:p-8 gba:text-center gba:text-muted-foreground">
          Loading investment data…
        </CardContent>
      </Card>
    )
  }

  return (
    <div data-testid={`${dataTestId}-container`}>
      <ReportFiltersHeader
        reportFilters={reportFilters}
        selectedCurrencies={selectedCurrencies}
        onCurrenciesChange={setSelectedCurrencies}
        accessToken={accessToken}
        userInfo={userInfo}
        data-testid={`${dataTestId}-filters-header`}
      />
      <InvestmentReportPanel
        investmentGroup={investmentGroup}
        groupLabel={groupLabel}
        sections={[lockedSection]}
        currentSection={lockedSection.code}
        showSectionBar={false}
        reportFilters={reportFiltersWithCurrencies}
        extraWhereFilters={extraWhereFilters}
        catalogData={catalogData}
        enabled
        accessToken={accessToken}
        userInfo={userInfo}
        primaryAction={resolvedPrimaryAction}
        exportFilenamePrefix={`investment-${investmentId}-reports`}
        dataTestId={dataTestId}
      />
    </div>
  )
}

export default InvestmentReportsTab
