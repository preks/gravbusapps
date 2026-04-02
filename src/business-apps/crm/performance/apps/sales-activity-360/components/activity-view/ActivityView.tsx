import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { RecordLayout, Avatar, AvatarImage, AvatarFallback, Spinner, IconAvatar } from '@newwork/nw-design-system'
import {
  ListBulletsIcon,
  CalendarIcon,
  UserIcon,
  BuildingIcon,
  TargetIcon,
  HandshakeIcon,
  UserCircleIcon,
  ChartLineUpIcon,
  EnvelopeIcon,
  PhoneIcon,
  DeviceMobileIcon,
  MapPinIcon,
  UsersThreeIcon
} from '@phosphor-icons/react'
import { ActivityViewProps, ActivityViewFilter, ActivityTabType } from '../../types'
import { Activity360ListTab } from '../tabs/Activity360ListTab'
import { Activity360CalendarTab } from '../tabs/Activity360CalendarTab'
import { Activity360ComparisonTab } from '../tabs/Activity360ComparisonTab'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const DATA_TEST_ID_PREFIX = 'SalesActivity360-View'

// Query to fetch employee data for header (using EmployeePosition like SalesMemberPerformance)
const GET_EMPLOYEE_HEADER = `
  query GetEmployeeHeader($employeeId: uuid!) {
    EmployeePosition(
      where: { 
        employeeId: { _eq: $employeeId }
      }
      limit: 1
    ) {
      id
      supervisor {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
      employee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
        communication(where: { isDeleted: { _eq: false } }) {
          value
          channel { code value }
          type { value }
        }
      }
      jobPosition { name }
      organizationalUnit { name }
      siteLocation {
        country { value }
      }
    }
  }
`

// Get view config based on filter
const getViewConfig = (filter: ActivityViewFilter) => {
  switch (filter) {
    case 'all':
      return {
        category: 'ALL ACTIVITIES',
        icon: ListBulletsIcon,
        subtitle: 'Complete view of all activities across the organization'
      }
    case 'by-employee':
      return {
        category: 'EMPLOYEE ACTIVITIES',
        icon: UserIcon,
        subtitle: 'Individual employee performance and activities'
      }
    case 'by-account':
      return {
        category: 'ACCOUNT ACTIVITIES',
        icon: BuildingIcon,
        subtitle: 'Activities related to this account'
      }
    case 'by-contact':
      return {
        category: 'CONTACT ACTIVITIES',
        icon: UserCircleIcon,
        subtitle: 'Touchpoints with this contact'
      }
    case 'by-lead':
      return {
        category: 'LEAD ACTIVITIES',
        icon: TargetIcon,
        subtitle: 'Engagement activities for this lead'
      }
    case 'by-opportunity':
      return {
        category: 'OPPORTUNITY ACTIVITIES',
        icon: HandshakeIcon,
        subtitle: 'Deal-related activities'
      }
    case 'by-general':
      return {
        category: 'GENERAL ACTIVITIES',
        icon: ListBulletsIcon,
        subtitle: 'Activities not linked to any specific entity'
      }
    default:
      return {
        category: 'ACTIVITIES',
        icon: ChartLineUpIcon,
        subtitle: 'Sales activities'
      }
  }
}

// Helper to get initials from name
const getInitials = (name: string): string => {
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

// Employee header data interface
interface EmployeeHeaderData {
  displayName: string
  fullName: string
  jobPosition?: string
  businessUnit?: string
  pictureThumbnail?: string
  email?: string
  phone?: string
  mobile?: string
  country?: string
  managerName?: string
  managerPicture?: string
}

export const ActivityView: React.FC<ActivityViewProps> = ({
  accessToken,
  userInfo,
  filter,
  entityId,
  entityName,
  onBack
}) => {
  // Get initial tab from URL or default
  // Note: 'comparison' tab is only available for 'all' filter
  const getInitialTab = (): ActivityTabType => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const subViewFromUrl = urlParams.get('tab')
    if (subViewFromUrl === 'list' || subViewFromUrl === 'calendar') {
      return subViewFromUrl
    }
    // Comparison tab only allowed for 'all' filter
    if (subViewFromUrl === 'comparison' && filter === 'all') {
      return 'comparison'
    }
    return 'list'
  }

  const [activeTab, setActiveTab] = useState<ActivityTabType>(getInitialTab())
  const [employeeData, setEmployeeData] = useState<EmployeeHeaderData | null>(null)
  // Start loading true if we're viewing by-employee to prevent flash of no-avatar
  const [employeeLoading, setEmployeeLoading] = useState(filter === 'by-employee' && !!entityId)

  const config = getViewConfig(filter)
  const graphqlClient = useGraphQLClient(accessToken)

  // Fetch employee data for header when viewing by-employee
  useEffect(() => {
    if (filter === 'by-employee' && entityId) {
      setEmployeeLoading(true)
      graphqlClient
        .request<{ EmployeePosition: any[] }>(GET_EMPLOYEE_HEADER, { employeeId: entityId })
        .then(result => {
          const position = result.EmployeePosition?.[0]
          if (position?.employee) {
            const emp = position.employee

            // Extract communication info
            const communications = emp.communication || []
            let email: string | undefined
            let phone: string | undefined
            let mobile: string | undefined

            communications.forEach((comm: any) => {
              const channelCode = comm.channel?.code?.toLowerCase()
              const typeValue = comm.type?.value?.toLowerCase()

              if (channelCode === 'email' || typeValue === 'email') {
                email = comm.value
              } else if (channelCode === 'phone' || typeValue === 'phone' || typeValue === 'telephone') {
                phone = comm.value
              } else if (channelCode === 'mobile' || typeValue === 'mobile') {
                mobile = comm.value
              }
            })

            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
            const managerFullName = position.supervisor
              ? `${position.supervisor.firstName || ''} ${position.supervisor.lastName || ''}`.trim()
              : undefined

            setEmployeeData({
              displayName: emp.displayName || fullName || 'Unknown Employee',
              fullName: fullName || 'Unknown',
              jobPosition: position.jobPosition?.name,
              businessUnit: position.organizationalUnit?.name,
              pictureThumbnail: emp.pictureThumbnail,
              email,
              phone,
              mobile,
              country: position.siteLocation?.country?.value,
              managerName: position.supervisor?.displayName || managerFullName || undefined,
              managerPicture: position.supervisor?.pictureThumbnail
            })
          }
        })
        .catch(err => {
          console.error('Failed to load employee data:', err)
        })
        .finally(() => {
          setEmployeeLoading(false)
        })
    } else {
      setEmployeeLoading(false)
    }
  }, [filter, entityId, graphqlClient])

  // Update URL when tab changes
  const updateUrl = useCallback((tab: string) => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    urlParams.set('tab', tab)
    globalThis.history.replaceState({}, '', `${globalThis.location.pathname}?${urlParams.toString()}`)
  }, [])

  // Handle tab change
  const handleTabChange = useCallback(
    (newTab: string) => {
      setActiveTab(newTab as ActivityTabType)
      updateUrl(newTab)
    },
    [updateUrl]
  )

  // Ensure URL always has tab parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    if (!urlParams.has('tab')) {
      updateUrl(activeTab)
    }
  }, [activeTab, updateUrl])

  // Prepare header meta information
  const headerMeta = useMemo(() => {
    if (filter === 'by-employee' && employeeData) {
      return (
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
          <span>{employeeData.jobPosition || 'Unknown Position'}</span>
          <span>•</span>
          <span>{employeeData.businessUnit || 'Unknown Department'}</span>
        </div>
      )
    }
    return (
      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
        <span>{config.subtitle}</span>
      </div>
    )
  }, [filter, employeeData, config])

  // Prepare compact header content with contact info (for employee view)
  const headerContent = useMemo(() => {
    if (filter !== 'by-employee' || !employeeData) return null

    return (
      <div className="gba:flex gba:items-center gba:gap-6 gba:flex-wrap gba:mt-4 gba:pl-4">
        {/* Manager Info with Avatar - ALWAYS FIRST */}
        {employeeData.managerName && (
          <>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Avatar size="sm">
                {employeeData.managerPicture && (
                  <AvatarImage
                    src={`data:image/jpeg;base64,${employeeData.managerPicture}`}
                    alt={employeeData.managerName}
                  />
                )}
                <AvatarFallback className="gba:text-xs">{getInitials(employeeData.managerName)}</AvatarFallback>
              </Avatar>
              <div className="gba:text-sm">
                <div className="gba:text-xs gba:text-muted-foreground">Manager</div>
                <div className="gba:font-medium">{employeeData.managerName}</div>
              </div>
            </div>
            <HeaderSeparator />
          </>
        )}

        {/* Country - SECOND */}
        {employeeData.country && (
          <>
            <ContactInfoItem icon={MapPinIcon} label="Country" value={employeeData.country} />
            <HeaderSeparator />
          </>
        )}

        {/* Contact Info - AFTER */}
        {employeeData.email && <ContactInfoItem icon={EnvelopeIcon} label="Email" value={employeeData.email} />}
        {employeeData.phone && <ContactInfoItem icon={PhoneIcon} label="Phone" value={employeeData.phone} />}
        {employeeData.mobile && <ContactInfoItem icon={DeviceMobileIcon} label="Mobile" value={employeeData.mobile} />}
      </div>
    )
  }, [filter, employeeData])

  // Custom wide content className for full width tables/calendars
  const wideContentClassName = 'gba:py-4 gba:w-full gba:max-w-full'

  // Build tabs array - comparison tab only available for 'all' filter
  const tabItems = useMemo(() => {
    const items = [
      {
        value: 'list',
        label: getTranslationFromI18nKeyAndLabel('crm.salesActivity360.activityList', 'Activity List'),
        icon: <ListBulletsIcon className="gba:mr-2" />,
        contentClassName: wideContentClassName,
        content: (
          <div data-testid={`${DATA_TEST_ID_PREFIX}-list-content`}>
            <Activity360ListTab accessToken={accessToken} userInfo={userInfo} filter={filter} entityId={entityId} />
          </div>
        )
      },
      {
        value: 'calendar',
        label: getTranslationFromI18nKeyAndLabel('crm.salesActivity360.activityCalendar', 'Activity Calendar'),
        icon: <CalendarIcon className="gba:mr-2" />,
        contentClassName: wideContentClassName,
        content: (
          <div data-testid={`${DATA_TEST_ID_PREFIX}-calendar-content`}>
            <Activity360CalendarTab
              accessToken={accessToken}
              userInfo={userInfo}
              filter={filter}
              entityId={entityId}
              compact
            />
          </div>
        )
      }
    ]

    // Only add comparison tab for 'all' filter
    if (filter === 'all') {
      items.push({
        value: 'comparison',
        label: getTranslationFromI18nKeyAndLabel('crm.salesActivity360.employeeComparison', 'Employee Comparison'),
        icon: <UsersThreeIcon className="gba:mr-2" />,
        contentClassName: wideContentClassName,
        content: (
          <div data-testid={`${DATA_TEST_ID_PREFIX}-comparison-content`}>
            <Activity360ComparisonTab
              accessToken={accessToken}
              userInfo={userInfo}
              filter={filter}
              entityId={entityId}
            />
          </div>
        )
      })
    }

    return items
  }, [accessToken, userInfo, filter, entityId, wideContentClassName])

  // Prepare subviews configuration (tabs)
  const subViewsConfig = useMemo(
    () => ({
      defaultValue: activeTab,
      onValueChange: handleTabChange,
      items: tabItems
    }),
    [activeTab, handleTabChange, tabItems]
  )

  // Show loading for employee header fetch
  if (filter === 'by-employee' && employeeLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  // Get header title and image
  const headerTitle =
    filter === 'by-employee' && employeeData ? employeeData.displayName : entityName || 'Sales Activities'

  const headerImageSrc =
    filter === 'by-employee' && employeeData?.pictureThumbnail
      ? `data:image/jpeg;base64,${employeeData.pictureThumbnail}`
      : undefined

  const headerAvatar = headerImageSrc ? (
    <Avatar size="xl">
      <AvatarImage src={headerImageSrc} alt={headerTitle} />
      <AvatarFallback>?</AvatarFallback>
    </Avatar>
  ) : (
    <IconAvatar icon={config.icon} variant="decorative" size="xl" />
  )

  return (
    <>
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
        data-testid={`${DATA_TEST_ID_PREFIX}-container`}
        className="gba:record-layout-no-padding"
        headerOrientation="horizontal"
        headerAvatar={headerAvatar}
        headerOverline={config.category}
        onBack={onBack}
        headerTitle={headerTitle}
        headerMeta={headerMeta}
        headerSlotAfter={headerContent}
        views={subViewsConfig.items}
        defaultView={subViewsConfig.defaultValue}
        onViewChange={subViewsConfig.onValueChange}
      />
    </>
  )
}

export default ActivityView
