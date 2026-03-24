import React from 'react'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Tabs, TabsList, TabsTrigger, TabsContent, Toaster } from '@newwork/nw-design-system'
import { ClockIcon } from '@phosphor-icons/react'
import { useTabQueryParamSync } from '../../hooks/useTabQueryParamSync'
import { TimeTypesTab } from './components/tabs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import DayTypesTab from './components/tabs/DayTypesTab'
import IncrementTypesTab from './components/tabs/IncrementTypesTab'
import BreakTypesTab from './components/tabs/BreakTypesTab'
import RoundingRulesTab from './components/tabs/RoundingRulesTab'

export enum TimeAttendanceTabs {
  TIME_TYPES = 'time-types',
  DAY_TYPES = 'day-types',
  INCREMENT_TYPES = 'increment-types',
  BREAK_TYPES = 'break-types',
  ROUNDING_RULES = 'rounding-rules'
}

export interface TimeAttendanceDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'TimeAttendanceData'

const TimeAttendanceData: React.FC<TimeAttendanceDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const [selectedTab, onChangeTab] = useTabQueryParamSync(TimeAttendanceTabs, TimeAttendanceTabs.TIME_TYPES)

  const tabItems = [
    {
      key: TimeAttendanceTabs.TIME_TYPES,
      label: getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.time_types.title', 'Time Types'),
      children: <TimeTypesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    },
    {
      key: TimeAttendanceTabs.DAY_TYPES,
      label: getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.day_types.title', 'Day Types'),
      children: <DayTypesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    },
    {
      key: TimeAttendanceTabs.INCREMENT_TYPES,
      label: getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.increment_types.title',
        'Increment Types'
      ),
      children: <IncrementTypesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    },
    {
      key: TimeAttendanceTabs.BREAK_TYPES,
      label: getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.break_types.title', 'Break Types'),
      children: <BreakTypesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    },
    {
      key: TimeAttendanceTabs.ROUNDING_RULES,
      label: getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.rounding_rules.title', 'Rounding Rules'),
      children: <RoundingRulesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    }
  ]

  return (
    <PageLayout
      headerIcon={<ClockIcon weight="duotone" color="var(--nw-decorative)" />}
      headerLabel={getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.title_dashboard',
        'Time Attendance Data'
      )}
      className={`${className ?? ''} gba:!overflow-y-visible`.trim()}
      contentContainer={
        <div className="no-scrollbar gba:w-full gba:h-full gba:overflow-y-auto gba:pb-8" style={{ padding: '24px' }}>
          <div data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Tabs`}>
            <Tabs value={selectedTab} onValueChange={onChangeTab} className="gba:w-full">
              <TabsList className="gba:w-full">
                {tabItems.map(item => (
                  <TabsTrigger key={item.key} value={item.key}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabItems.map(item => (
                <TabsContent key={item.key} value={item.key}>
                  {item.children}
                </TabsContent>
              ))}
            </Tabs>
          </div>
          <Toaster position="bottom-right" richColors />
        </div>
      }
    />
  )
}

export default TimeAttendanceData
export { TimeAttendanceData }
