'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, useTranslation } from '@newwork/nw-design-system'
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
    <div className="gba:flex gba:flex-col gba:gap-6 gba:p-6">
      <div>
        <h1 className="gba:text-2xl gba:font-bold gba:leading-tight">{t('page-title')}</h1>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{t('page-description')}</p>
      </div>

      <Tabs value={model.activeTab} onValueChange={model.setActiveTab}>
        <TabsList>
          <TabsTrigger value="changes">{t('tab-compensation-changes')}</TabsTrigger>
          <TabsTrigger value="benefits">{t('tab-active-benefits')}</TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="gba:mt-4 gba:space-y-6">
          <CompensationChangesTab
            t={t}
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
        </TabsContent>

        <TabsContent value="benefits" className="gba:mt-4 gba:space-y-6">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}

export const MonthlyCompensationChanges: React.FC<BusinessAppContextProps> = ({ accessToken }) => (
  <MonthlyCompensationChangesPage accessToken={accessToken} />
)

export default MonthlyCompensationChanges
