'use client'

import React, { useState } from 'react'
import { TabSwitch, TabSwitchList, TabSwitchTrigger, TabSwitchContent, Alert, Toaster } from '@newwork/nw-design-system'
import { Employee } from '../../hooks/useEmployeeData'
import { useCompensationData } from '../../hooks/useCompensationData'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../common/utils/windowUtils'
import { BusinessAppContextProps } from '../../../../../../../common/BusinessAppContext'
import CurrentCompensationView from './components/CurrentCompensationView'
import PayHistoryView from './components/PayHistoryView'
import GrowthView from './components/GrowthView'
import { PiCurrencyEur, PiClockCounterClockwise, PiTrendUp } from 'react-icons/pi'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'

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
  const [activeSubTab, setActiveSubTab] = useState('current')
  const empId = employeeId || employee.id

  // Feature flag for Growth tab
  const growthTabEnabled = !!useFeature(Feature.HCM.CompensationGrowth.Key)

  // Fetch compensation data
  const { loading, error, compensationData, historyData, refetch } = useCompensationData(empId, accessToken)

  // Handle error state
  if (error) {
    return (
      <div className="gba:p-6" data-testid="compensation-error">
        <Alert variant="destructive">
          <div className="gba:font-semibold">Error loading compensation data</div>
          <div className="gba:text-sm gba:mt-1">{error}</div>
          <button
            onClick={refetch}
            className="gba:mt-3 gba:px-4 gba:py-2 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:text-sm gba:hover:opacity-90"
          >
            Retry
          </button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:jobs-compensation-tab gba:space-y-6" data-testid="jobs-compensation-tab-container">
      {/* Tab Header */}
      <div className="gba:compensation-header" data-testid="compensation-header">
        <div className="gba:font-bold gba:text-2xl gba:text-foreground" data-testid="compensation-title">
          {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.title', 'Compensation')}
        </div>
        <div className="gba:text-muted-foreground gba:text-lg gba:mb-4" data-testid="compensation-description">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:compensation.description',
            'View compensation details, salary history, bonuses, and benefits'
          )}
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
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.current', 'Current Compensation')}
          </TabSwitchTrigger>
          <TabSwitchTrigger
            value="history"
            startIcon={<PiClockCounterClockwise className="gba:w-5 gba:h-5" />}
            data-testid="compensation-history-tab"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.history', 'Compensation History')}
          </TabSwitchTrigger>
          {growthTabEnabled && (
            <TabSwitchTrigger
              value="growth"
              startIcon={<PiTrendUp className="gba:w-5 gba:h-5" />}
              data-testid="compensation-growth-tab"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:compensation.growth', 'Growth')}
            </TabSwitchTrigger>
          )}
        </TabSwitchList>

        <TabSwitchContent value="current">
          {compensationData && (
            <CurrentCompensationView
              compensationData={compensationData}
              loading={loading}
              employeeId={empId}
              accessToken={accessToken}
              userInfo={userInfo}
            />
          )}
        </TabSwitchContent>

        <TabSwitchContent value="history">
          {historyData && <PayHistoryView historyData={historyData} loading={loading} />}
        </TabSwitchContent>

        {growthTabEnabled && (
          <TabSwitchContent value="growth">
            {historyData?.growthData && <GrowthView growthData={historyData.growthData} loading={loading} />}
          </TabSwitchContent>
        )}
      </TabSwitch>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}

export default CompensationTab
