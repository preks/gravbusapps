'use client'

import React from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { InfoIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from './_i18n'
import { ActiveBenefitsTab } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/ActiveBenefitsTab'
import { CompensationChangesTab } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/CompensationChangesTab'
import { MonthNavigator } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/MonthNavigator'
import { useMonthlyCompensationChangesPageModel } from '@/business-apps/hr/core/apps/monthly-compensation-changes/hooks/useMonthlyCompensationChangesPageModel'

interface MonthlyCompensationChangesPageProps {
  readonly accessToken: string
}

function MonthlyCompensationChangesPage({ accessToken }: MonthlyCompensationChangesPageProps) {
  const { t, locale } = useTranslation(translations)
  const model = useMonthlyCompensationChangesPageModel(accessToken, t, locale)
  const monthNavigator = (
    <MonthNavigator selectedDate={model.selectedDate} onChange={model.setSelectedDate} t={t} locale={locale} />
  )

  return (
    <PageLayout
      headerIcon={InfoIcon}
      headerTitle={t('monthly-compensation-changes-page-title')}
      headerDescription={t('monthly-compensation-changes-page-description')}
      onBack={null as unknown as (() => void) | undefined}
      headerSubViews={{
        value: model.activeTab,
        onValueChange: model.setActiveTab,
        items: [
          { value: 'changes', label: t('tab-compensation-changes') },
          { value: 'benefits', label: t('tab-active-benefits') }
        ]
      }}
      className="gba:min-h-screen"
    >
      <div className="gba:space-y-6">
        {model.activeTab === 'changes' ? (
          <CompensationChangesTab
            t={t}
            accessToken={accessToken}
            titleSections={model.changeTitleSections}
            currentSection={model.changeSection}
            onSectionChange={model.setChangeSection}
            searchValue={model.changesSearch}
            onSearchChange={model.setChangesSearch}
            filters={model.changesFilters}
            filterConfiguration={model.changesFilterConfig}
            onFilterChange={model.setChangesFilters}
            monthNavigator={monthNavigator}
            kpiCards={model.changeKpiCards}
            rows={model.filteredChangeRows}
            columns={model.changeColumns}
            loading={model.changesLoading}
            error={model.changesError}
            selectedRow={model.selectedChangeRow}
            setSelectedRow={model.setSelectedChangeRow}
          />
        ) : (
          <ActiveBenefitsTab
            t={t}
            titleSections={model.benefitTitleSections}
            currentSection={model.benefitSection}
            onSectionChange={model.setBenefitSection}
            searchValue={model.benefitsSearch}
            onSearchChange={model.setBenefitsSearch}
            filters={model.benefitsFilters}
            filterConfiguration={model.benefitsFilterConfig}
            onFilterChange={model.setBenefitsFilters}
            monthNavigator={monthNavigator}
            isExporting={model.isExporting}
            onExport={model.handleExportBenefits}
            kpiCards={model.benefitKpiCards}
            rows={model.filteredBenefitRows}
            columns={model.benefitColumns}
            loading={model.benefitsLoading}
            error={model.benefitsError}
            selectedRow={model.selectedBenefitRow}
            setSelectedRow={model.setSelectedBenefitRow}
          />
        )}
      </div>
    </PageLayout>
  )
}

export const MonthlyCompensationChanges: React.FC<BusinessAppContextProps> = ({ accessToken }) => (
  <MonthlyCompensationChangesPage accessToken={accessToken} />
)

export default MonthlyCompensationChanges
