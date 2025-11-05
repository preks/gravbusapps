'use client'

import React, { useState } from 'react'
import {
  TabSwitch,
  TabSwitchList,
  TabSwitchTrigger,
  TabSwitchContent,
  Alert,
  Button,
  Toaster,
  useTranslation,
  useLocale
} from '@newwork/nw-design-system'
import { Employee } from '../../../hooks/useEmployeeData'
import { useCompensationData } from './hooks/useCompensationData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import CurrentCompensationView from './views/CurrentCompensationView'
import PayHistoryView from './views/PayHistoryView'
import GrowthView from './views/GrowthView'
import { PiCurrencyEur, PiClockCounterClockwise, PiTrendUp } from 'react-icons/pi'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import translations from '../../../_i18n'

interface JobsCompensationTabProps extends BusinessAppContextProps {
  employee: Employee
  employeeId?: string
  isSelfView: boolean
}

/**
 * Jobs & Compensation Tab Component
 * Main tab containing Current Compensation and Compensation History views
 */
const CompensationTab: React.FC<JobsCompensationTabProps> = ({ employee, employeeId, accessToken, userInfo }) => {
  const { t } = useTranslation(translations)
  const { locale: currentLocale } = useLocale() // Get current locale from LocalizationProvider context
  const [activeSubTab, setActiveSubTab] = useState('current')
  const empId = employeeId || employee.id

  // Feature flag for Growth tab
  const growthTabEnabled = Boolean(useFeature(Feature.HCM.CompensationGrowth.Key))

  // Fetch compensation data
  const { loading, error, compensationData, historyData, refetch } = useCompensationData(empId, accessToken)

  // Extract currency code from compensation data
  const currencyCode = compensationData?.currentCompensation?.currency?.code || 'EUR'

  // Handle error state
  if (error) {
    return (
      <div className="gba:p-6" data-testid="compensation-error">
        <Alert variant="destructive">
          <div className="gba:font-semibold">{t('compensation-error-title')}</div>
          <div className="gba:text-sm gba:mt-1">{error}</div>
          <Button
            onClick={refetch}
            variant="destructive"
            size="sm"
            className="gba:mt-3"
            data-testid="compensation-error-retry-button"
          >
            {t('compensation-error-retry')}
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:jobs-compensation-tab gba:space-y-6" data-testid="jobs-compensation-tab-container">
      {/* Tab Header */}
      <div className="gba:compensation-header" data-testid="compensation-header">
        <div className="gba:font-bold gba:text-2xl gba:text-foreground" data-testid="compensation-title">
          {t('compensation-title')}
        </div>
        <div className="gba:text-muted-foreground gba:text-lg gba:mb-4" data-testid="compensation-description">
          {t('compensation-description')}
        </div>
      </div>

      {/* Sub-tabs for Current Compensation, Compensation History, and Growth */}
      <TabSwitch value={activeSubTab} onValueChange={setActiveSubTab} className="gba:w-full">
        <TabSwitchList
          className={`gba:grid gba:w-[45%] ${growthTabEnabled ? 'gba:grid-cols-3' : 'gba:grid-cols-2'} gba:mb-6`}
        >
          <TabSwitchTrigger
            value="current"
            startIcon={<PiCurrencyEur className="gba:w-5 gba:h-5" />}
            data-testid="current-compensation-tab"
          >
            {t('tab-current-compensation')}
          </TabSwitchTrigger>
          <TabSwitchTrigger
            value="history"
            startIcon={<PiClockCounterClockwise className="gba:w-5 gba:h-5" />}
            data-testid="compensation-history-tab"
          >
            {t('tab-compensation-history')}
          </TabSwitchTrigger>
          {growthTabEnabled && (
            <TabSwitchTrigger
              value="growth"
              startIcon={<PiTrendUp className="gba:w-5 gba:h-5" />}
              data-testid="compensation-growth-tab"
            >
              {t('tab-growth')}
            </TabSwitchTrigger>
          )}
        </TabSwitchList>

        <TabSwitchContent value="current">
          {compensationData && (
            <CurrentCompensationView
              t={t}
              compensationData={compensationData}
              loading={loading}
              employeeId={empId}
              accessToken={accessToken}
              userInfo={userInfo}
              locale={currentLocale}
            />
          )}
        </TabSwitchContent>

        <TabSwitchContent value="history">
          {historyData && (
            <PayHistoryView
              t={t}
              historyData={historyData}
              loading={loading}
              locale={currentLocale}
              accessToken={accessToken}
              userInfo={userInfo}
            />
          )}
        </TabSwitchContent>

        {growthTabEnabled && (
          <TabSwitchContent value="growth">
            {historyData?.growthData && (
              <GrowthView
                t={t}
                growthData={historyData.growthData}
                loading={loading}
                locale={currentLocale}
                currencyCode={currencyCode}
                accessToken={accessToken}
                userInfo={userInfo}
              />
            )}
          </TabSwitchContent>
        )}
      </TabSwitch>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}

export default CompensationTab
