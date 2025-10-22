import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Tabs, TabsList, TabsTrigger, TabsContent, Toaster } from '@newwork/nw-design-system'
import { ClockIcon } from '@phosphor-icons/react'
import { TimeTypesTab } from './components/tabs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export enum TimeAttendanceTabs {
  TIME_TYPES = 'time-types'
}

export interface TimeAttendanceDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'TimeAttendanceData'

// Helper function to get initial tab from URL
const getInitialTab = (): TimeAttendanceTabs => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')

    if (tabParam && Object.values(TimeAttendanceTabs).includes(tabParam as TimeAttendanceTabs)) {
      return tabParam as TimeAttendanceTabs
    }
  }
  return TimeAttendanceTabs.TIME_TYPES
}

const TimeAttendanceData: React.FC<TimeAttendanceDataProps> = ({ className, prefixDataTestId, ...contextProps }) => {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState<TimeAttendanceTabs>(getInitialTab)

  useEffect(() => {
    const setTabFromUrl = () => {
      // Check URL query parameter
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')

      if (tabParam && Object.values(TimeAttendanceTabs).includes(tabParam as TimeAttendanceTabs)) {
        setSelectedTab(tabParam as TimeAttendanceTabs)
      }
    }

    setTabFromUrl()
    window.addEventListener('popstate', setTabFromUrl)
    return () => {
      window.removeEventListener('popstate', setTabFromUrl)
    }
  }, [])

  const onChangeTab = (value: string) => {
    // Update URL with query parameter
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    history.replaceState(null, '', url.toString())
    setSelectedTab(value as TimeAttendanceTabs)
  }

  const tabItems = [
    {
      key: TimeAttendanceTabs.TIME_TYPES,
      label: t('hr.time_types', 'Time Types'),
      children: <TimeTypesTab {...contextProps} prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`} />
    }
  ]

  return (
    <PageLayout
      headerIcon={<ClockIcon />}
      headerLabel={getTranslationFromI18nKeyAndLabel('hr.time_attendance_data', 'Time Attendance Data')}
      className={className}
      contentContainer={
        <div className="gba:w-full gba:h-full gba:!overflow-y-auto" style={{ padding: '24px' }}>
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
