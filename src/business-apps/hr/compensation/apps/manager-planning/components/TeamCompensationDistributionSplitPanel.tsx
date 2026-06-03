import React from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataDisplay,
  useTranslation
} from '@newwork/nw-design-system'
import type { DistributionMethod, TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import compensationPlanningTranslations from '../../planning/_i18n'
import { BudgetDistributionMethodSelector } from '../../planning/components/views/BudgetDistributionMethodSelector'
import type {
  CustomBudgetInputMode,
  OrgUnitCustomBudgetInput
} from '../../planning/components/views/budgetDistributionCustomTypes'
import translations from '../_i18n'
import { TeamCompensationEmployeeDistributionList } from './TeamCompensationEmployeeDistributionList'

const EXCLUDED_DISTRIBUTION_METHODS = ['proportional_headcount'] as const

export interface TeamCompensationDistributionSplitPanelProps {
  distributionMethod: DistributionMethod
  setDistributionMethod: (m: DistributionMethod) => void
  loading: boolean
  proposalsLockedAfterSubmit: boolean
  filteredRows: TeamMemberCompensationData[]
  totalFiltered: number
  activePool: number | null
  allocationByEmployeeId: ReadonlyMap<string, number>
  currencyCode: string
  error: string | null
  customBudgetByEmployeeId: Record<string, OrgUnitCustomBudgetInput>
  handleCustomAmountRawChange: (employeeId: string, value: string) => void
  handleCustomPercentRawChange: (employeeId: string, value: string) => void
  handleCustomModeChange: (employeeId: string, mode: CustomBudgetInputMode) => void
  performanceFallbackToEqual: boolean
  performancePartialScores: boolean
  totalSalaryCostAcrossEmployees: number
  grandTotalPositivePerformanceScores: number
  dataDisplay: { searchQuery: string; setSearchQuery: (value: string) => void }
  canShowSaveAction: boolean
  onOpenSubmitProposals: () => void
  /** After "New proposal", show a way to return to the submitted-proposals table without changing cycle. */
  showBackToProposalsTable?: boolean
  onBackToProposalsTable?: () => void
}

export function TeamCompensationDistributionSplitPanel({
  distributionMethod,
  setDistributionMethod,
  loading,
  proposalsLockedAfterSubmit,
  filteredRows,
  totalFiltered,
  activePool,
  allocationByEmployeeId,
  currencyCode,
  error,
  customBudgetByEmployeeId,
  handleCustomAmountRawChange,
  handleCustomPercentRawChange,
  handleCustomModeChange,
  performanceFallbackToEqual,
  performancePartialScores,
  totalSalaryCostAcrossEmployees,
  grandTotalPositivePerformanceScores,
  dataDisplay,
  canShowSaveAction,
  onOpenSubmitProposals,
  showBackToProposalsTable = false,
  onBackToProposalsTable
}: Readonly<TeamCompensationDistributionSplitPanelProps>) {
  const { t } = useTranslation(translations)
  const { t: tBudget } = useTranslation(compensationPlanningTranslations)

  const cardTitle = t('team-summary', { count: totalFiltered })

  return (
    <Card className="gba:w-full" data-testid="manager-team-distribution-preview-panel">
      <CardHeader className="gba:flex gba:flex-row gba:flex-wrap gba:items-center gba:justify-between gba:gap-3 gba:border-b gba:border-border gba:pb-4">
        <CardTitle className="gba:min-w-0 gba:text-base gba:font-semibold gba:text-foreground">
          {tBudget('budget-distribution-split-panel-title')}
        </CardTitle>
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          {showBackToProposalsTable && onBackToProposalsTable != null ? (
            <Button
              type="button"
              variant="outline"
              className="gba:shrink-0"
              onClick={onBackToProposalsTable}
              data-testid="manager-team-back-to-proposals-table"
            >
              {t('manager-team-back-to-proposals-list')}
            </Button>
          ) : null}
          <Button
            type="button"
            className="gba:shrink-0"
            disabled={!canShowSaveAction}
            onClick={onOpenSubmitProposals}
            data-testid="manager-team-submit-proposals-open"
          >
            {t('manager-team-submit-proposals-toolbar')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="gba:p-0">
        <div className="gba:flex gba:min-h-0 gba:flex-col gba:md:flex-row gba:md:items-stretch">
          <aside
            className="gba:flex gba:w-full gba:max-w-xs gba:shrink-0 gba:flex-col gba:border-b gba:border-border gba:bg-muted/30 gba:p-4 md:gba:max-w-none md:gba:w-64 md:gba:border-b-0 md:gba:border-r"
            data-testid="manager-team-distribution-method-sidebar"
          >
            <p className="gba:mb-3 gba:w-full gba:max-w-xs gba:text-sm gba:font-medium gba:text-muted-foreground md:gba:max-w-none">
              {tBudget('budget-distribution-split-panel-methods-column-title')}
            </p>
            <BudgetDistributionMethodSelector
              variant="sidebar"
              selectedMethod={distributionMethod}
              onMethodChange={setDistributionMethod}
              disabled={loading || proposalsLockedAfterSubmit}
              sectionTitle={t('manager-team-distribution-method-section')}
              t={tBudget}
              excludedMethods={EXCLUDED_DISTRIBUTION_METHODS}
            />
          </aside>
          <div
            className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:bg-background gba:p-4"
            data-testid="manager-team-distribution-list-pane"
          >
            <DataDisplay
              data-testid="manager-team-compensation-display"
              titleSections={[
                {
                  id: 'team-members',
                  label: t('table-section-title'),
                  metadata: { count: totalFiltered, isLoading: loading }
                }
              ]}
              currentSection="team-members"
              toolbarDensity="default"
              searchValue={dataDisplay.searchQuery}
              searchPlaceholder={t('search-placeholder')}
              onSearchChange={dataDisplay.setSearchQuery}
            >
              <TeamCompensationEmployeeDistributionList
                embedded
                sortedMembers={filteredRows}
                distributionPool={activePool}
                allocationByEmployeeId={allocationByEmployeeId}
                currencyCode={currencyCode}
                loading={loading}
                error={error}
                selectedMethod={distributionMethod}
                customBudgetByEmployeeId={customBudgetByEmployeeId}
                onCustomAmountRawChange={handleCustomAmountRawChange}
                onCustomPercentRawChange={handleCustomPercentRawChange}
                onCustomModeChange={handleCustomModeChange}
                performanceFallbackToEqual={performanceFallbackToEqual}
                performancePartialScores={performancePartialScores}
                totalSalaryCostAcrossEmployees={totalSalaryCostAcrossEmployees}
                grandTotalPositivePerformanceScores={grandTotalPositivePerformanceScores}
                cardTitle={cardTitle}
                tBudget={tBudget}
                emptyMessage={t('table-empty')}
                inputsDisabled={proposalsLockedAfterSubmit}
              />
            </DataDisplay>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
