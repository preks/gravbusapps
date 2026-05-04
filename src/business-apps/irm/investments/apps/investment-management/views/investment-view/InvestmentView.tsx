import React from 'react'
import { DataDisplay } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentKPICards } from '@/common/components/investment-kpi-cards'
import AllInvestmentsList from './data/investment-data/AllInvestmentsList'
import GenericInvestmentsList from './data/shared/GenericInvestmentsList'
import InvestmentViewSkeleton from './components/InvestmentViewSkeleton'
import { useInvestmentViewModel } from './hooks/useInvestmentViewModel'

export interface InvestmentViewProps extends BusinessAppContextProps {
  initialSubTab?: string
  onSubTabChange?: (subTab: string) => void
}

export const InvestmentView: React.FC<InvestmentViewProps> = context => {
  const model = useInvestmentViewModel(context)

  if (model.isLoading) {
    return <InvestmentViewSkeleton />
  }

  const renderList = () => {
    if (model.currentSection === 'overview') {
      return (
        <AllInvestmentsList
          {...context}
          data={model.overviewState.investments}
          loading={model.overviewState.isInitialLoading}
          error={model.overviewState.error}
          totalCount={model.overviewState.totalCount}
          sorting={model.overviewState.sorting}
          onSortingChange={model.overviewState.handleSortingChange}
          pagination={model.overviewState.pagination}
          onPaginationChange={model.overviewState.handlePaginationChange}
          visibleColumns={model.overviewState.visibleColumns}
          listAggregates={model.overviewState.listAggregates}
          showAggregatesBar={!model.overviewState.isInitialLoading && !model.overviewState.error}
          displayCurrencyCode={model.displayCurrencyCode}
        />
      )
    }

    if (!model.activeGroup) return null

    return (
      <GenericInvestmentsList
        {...context}
        config={{
          investmentGroup: model.activeGroup.code,
          dataTestIdPrefix: `${model.activeGroup.tabId}-investment`,
          defaultTypeLabel: 'Unknown',
          fromSubView: model.activeGroup.tabId,
          emptyMessage: `No ${model.activeGroup.label.toLowerCase()} investments found`
        }}
        catalogColumns={model.activeColumnConfig?.columns}
        data={model.activeDynamicState.investments}
        loading={model.activeDynamicState.isInitialLoading}
        error={model.activeDynamicState.error}
        totalCount={model.activeDynamicState.totalCount}
        sorting={model.activeDynamicState.sorting}
        onSortingChange={model.activeDynamicState.handleSortingChange}
        pagination={model.activeDynamicState.pagination}
        onPaginationChange={model.activeDynamicState.handlePaginationChange}
        visibleColumns={model.activeDynamicState.visibleColumns}
        listAggregates={model.activeDynamicState.listAggregates}
        showAggregatesBar={!model.activeDynamicState.isInitialLoading && !model.activeDynamicState.error}
        displayCurrencyCode={model.displayCurrencyCode}
      />
    )
  }

  return (
    <div data-testid="investment-view">
      <div className="gba:mb-6">
        <InvestmentKPICards {...model.kpis} data-testid={`investment-view-${model.currentSection}-kpis`} />
      </div>

      <DataDisplay
        key={model.currentSection}
        titleSections={model.titleSections}
        currentSection={model.currentSection}
        onSectionChange={model.handleSectionChange}
        searchValue={model.currentState.search}
        searchPlaceholder="Search investments..."
        onSearchChange={model.currentState.setSearch}
        filters={model.selectedFilters}
        filterConfiguration={model.currentFilterConfig}
        onFilterChange={model.handleFilterChange}
        sorting={model.currentState.sorting}
        sortableColumns={model.sortableColumns}
        onSortingChange={model.currentState.handleSortingChange}
        availableColumns={model.availableColumns}
        visibleColumns={model.currentState.visibleColumns}
        onVisibleColumnsChange={model.currentState.setVisibleColumns}
        primaryAction={model.primaryAction}
        secondaryActions={model.secondaryActions}
        toolbarDensity="default"
      >
        {renderList()}
      </DataDisplay>
    </div>
  )
}

export default InvestmentView
