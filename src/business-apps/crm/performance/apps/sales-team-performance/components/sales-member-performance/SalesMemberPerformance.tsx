import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { Spinner, RecordLayout, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import {
  PiChartLine,
  ListChecksIcon,
  CalendarIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  DeviceMobileIcon,
  MapPinIcon
} from '@phosphor-icons/react'
import { SalesPerformanceTab, SalesActivitiesTab } from './components/tabs'
import { ActivitiesCalendar } from './components/activities/ActivitiesCalendar'
import { useEmployeePerformanceData } from './hooks/useEmployeePerformanceData'
import { SalesMemberPerformanceProps } from './types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Helper to extract team context from URL or props
const getTeamContextFromUrl = (): { teamId: string; teamName: string } | undefined => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const teamId = urlParams.get('teamId')

  if (teamId) {
    // In real implementation, fetch team name from API or pass as prop
    // For now, use mock team names
    const mockTeamNames: Record<string, string> = {
      'team-1': 'Enterprise Sales',
      'team-2': 'SMB Sales',
      'team-3': 'Key Accounts',
      'team-4': 'Inside Sales',
      'team-5': 'Channel Partners'
    }

    return {
      teamId,
      teamName: mockTeamNames[teamId] || `Team ${teamId}`
    }
  }

  return undefined
}

const DATA_TEST_ID_PREFIX = 'SalesMemberPerformance'

// Helper to get initials from name
const getManagerInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

// Separator component for header sections
const HeaderSeparator: React.FC = () => <div className="gba:h-8 gba:w-px gba:bg-border" />

// Contact info item component
interface ContactInfoItemProps {
  icon: React.ElementType
  label: string
  value: string
}

const ContactInfoItem: React.FC<ContactInfoItemProps> = ({ icon: Icon, label, value }) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <Icon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
    <div className="gba:text-sm">
      <div className="gba:text-xs gba:text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  </div>
)

export const SalesMemberPerformance: React.FC<SalesMemberPerformanceProps> = ({
  memberId,
  onBack,
  initialTab = 'performance',
  accessToken,
  userInfo,
  additionalData
}) => {
  // Get initial tab from URL or use prop/default
  const getInitialTab = (): string => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const subViewFromUrl = urlParams.get('subView')

    // Validate that the tab exists in our valid tabs
    const validTabs = ['performance', 'activities', 'calendar']
    if (subViewFromUrl && validTabs.includes(subViewFromUrl)) {
      return subViewFromUrl
    }

    return initialTab
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialTab())
  const tabContentRef = useRef<HTMLDivElement>(null)

  // Update URL when tab changes
  const updateUrl = useCallback((tab: string) => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    urlParams.set('subView', tab)
    globalThis.history.pushState({}, '', `${globalThis.location.pathname}?${urlParams.toString()}`)
  }, [])

  // Handle tab change
  const handleTabChange = useCallback(
    (newTab: string) => {
      setActiveTab(newTab)
      updateUrl(newTab)
    },
    [updateUrl]
  )

  // Ensure URL always has subView parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    if (!urlParams.has('subView')) {
      updateUrl(activeTab)
    }
  }, [activeTab, updateUrl])

  // Get team context for comparisons
  const teamContext = getTeamContextFromUrl()

  // Fetch all employee performance data (header + trends + totals) in one query
  const {
    headerData,
    trends,
    isLoading: headerLoading,
    error: headerError
  } = useEmployeePerformanceData(accessToken, memberId)

  // Prepare header meta information (JSX component displayed under title)
  const headerMeta = useMemo(() => {
    if (!headerData) return null

    return (
      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
        <span>{headerData.jobPosition || 'Unknown Position'}</span>
        <span>•</span>
        <span>{headerData.businessUnit || 'Unknown Department'}</span>
      </div>
    )
  }, [headerData])

  // Prepare compact header content with contact info, sales, manager, and country
  const headerContent = useMemo(() => {
    if (!headerData) return null

    return (
      <div className="gba:flex gba:items-center gba:gap-6 gba:flex-wrap gba:mt-4 gba:pl-4">
        {/* Manager Info with Avatar - ALWAYS FIRST */}
        {headerData.managerName && (
          <>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Avatar size="sm">
                {headerData.managerPicture && (
                  <AvatarImage
                    src={`data:image/jpeg;base64,${headerData.managerPicture}`}
                    alt={headerData.managerName}
                  />
                )}
                <AvatarFallback className="gba:text-xs">{getManagerInitials(headerData.managerName)}</AvatarFallback>
              </Avatar>
              <div className="gba:text-sm">
                <div className="gba:text-xs gba:text-muted-foreground">Manager</div>
                <div className="gba:font-medium">{headerData.managerName}</div>
              </div>
            </div>
            <HeaderSeparator />
          </>
        )}

        {/* Country - SECOND */}
        {headerData.country && (
          <>
            <ContactInfoItem icon={MapPinIcon} label="Country" value={headerData.country} />
            <HeaderSeparator />
          </>
        )}

        {/* Contact Info - AFTER */}
        {headerData.email && <ContactInfoItem icon={EnvelopeIcon} label="Email" value={headerData.email} />}
        {headerData.phone && <ContactInfoItem icon={PhoneIcon} label="Phone" value={headerData.phone} />}
        {headerData.mobile && <ContactInfoItem icon={DeviceMobileIcon} label="Mobile" value={headerData.mobile} />}
      </div>
    )
  }, [headerData])

  // Custom wide content className for dashboard/analytics views
  // This overrides the default narrow RecordLayout width
  const wideContentClassName = 'gba:py-4 gba:w-full gba:max-w-full'

  // Prepare subviews configuration (tabs) with WIDE content
  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: [
        {
          value: 'performance',
          label: getTranslationFromI18nKeyAndLabel('crm.performance.salesPerformance', 'Sales Performance'),
          icon: <PiChartLine className="gba:mr-2" />,
          contentClassName: wideContentClassName, // FULL WIDTH FOR DASHBOARD
          content: (
            <div ref={tabContentRef} data-testid={`${DATA_TEST_ID_PREFIX}-performance-content`}>
              <SalesPerformanceTab
                employeeId={memberId}
                accessToken={accessToken}
                userInfo={userInfo}
                additionalData={additionalData}
                isLoading={false}
                teamContext={teamContext}
                showComparisons={!!teamContext}
                trends={trends}
              />
            </div>
          )
        },
        {
          value: 'activities',
          label: getTranslationFromI18nKeyAndLabel('crm.performance.salesActivities', 'Sales Activities'),
          icon: <ListChecksIcon className="gba:mr-2" />,
          contentClassName: wideContentClassName, // FULL WIDTH FOR TABLES
          content: (
            <div data-testid={`${DATA_TEST_ID_PREFIX}-activities-content`}>
              <SalesActivitiesTab
                memberId={memberId}
                accessToken={accessToken}
                userInfo={userInfo}
                additionalData={additionalData}
              />
            </div>
          )
        },
        {
          value: 'calendar',
          label: getTranslationFromI18nKeyAndLabel('crm.performance.activityCalendar', 'Activity Calendar'),
          icon: <CalendarIcon className="gba:mr-2" />,
          contentClassName: wideContentClassName, // FULL WIDTH FOR CALENDAR
          content: (
            <div data-testid={`${DATA_TEST_ID_PREFIX}-calendar-content`}>
              <ActivitiesCalendar employeeId={memberId} accessToken={accessToken} />
            </div>
          )
        }
      ]
    }),
    [activeTab, memberId, accessToken, userInfo, additionalData, teamContext, trends, handleTabChange]
  )

  // Handle loading and error states AFTER all hooks
  if (headerLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-screen"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (headerError) {
    return (
      <div className="gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <div className="gba:text-destructive">Error loading employee data: {headerError}</div>
      </div>
    )
  }

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`} className="gba:record-layout-no-padding">
      <style>
        {String.raw`
          .gba\:record-layout-no-padding .layout-content {
            padding-left: 0 !important;
            padding-right: 0 !important;
            max-width: 100% !important;
          }
        `}
      </style>
      <RecordLayout
        headerOrientation="horizontal"
        headerIcon={UserIcon}
        headerImageSrc={
          headerData?.pictureThumbnail ? `data:image/jpeg;base64,${headerData.pictureThumbnail}` : undefined
        }
        headerImageAlt={headerData?.displayName || 'Employee'}
        headerCategory={getTranslationFromI18nKeyAndLabel('crm.performance.employeeOverview', 'EMPLOYEE OVERVIEW')}
        onBack={onBack}
        headerTitle={headerData?.displayName || 'Employee Performance'}
        headerMeta={headerMeta}
        headerContent={headerContent}
        subViews={subViewsConfig}
      />
    </div>
  )
}

export default SalesMemberPerformance
