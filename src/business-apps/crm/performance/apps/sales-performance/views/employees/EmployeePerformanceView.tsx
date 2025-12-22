import React, { useMemo } from 'react'
import { Spinner, RecordLayout, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { PiUser, PiEnvelope, PiPhone, PiDeviceMobile, PiMapPin } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useEmployeePerformanceData } from '@/business-apps/crm/performance/apps/sales-team-performance/components/sales-member-performance/hooks/useEmployeePerformanceData'
import { SalesPerformanceTab } from '@/business-apps/crm/performance/apps/sales-team-performance/components/sales-member-performance/components/tabs'

const DATA_TEST_ID_PREFIX = 'EmployeePerformanceView'

interface EmployeePerformanceViewProps extends BusinessAppContextProps {
  employeeId: string
  onBack: () => void
}

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

/**
 * Employee Performance View - Simplified version showing only Sales Performance
 * This is a streamlined view without the Activities and Calendar tabs
 */
export const EmployeePerformanceView: React.FC<EmployeePerformanceViewProps> = ({
  employeeId,
  onBack,
  accessToken,
  userInfo
}) => {
  // Fetch employee performance data
  const { headerData, trends, isLoading, error } = useEmployeePerformanceData(accessToken, employeeId)

  // Prepare header meta information
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

  // Prepare header content with contact info and manager
  const headerContent = useMemo(() => {
    if (!headerData) return null

    // Check if employee has a valid manager (not themselves)
    const hasValidManager = headerData.managerName && headerData.managerId && headerData.managerId !== headerData.id

    return (
      <div className="gba:flex gba:items-center gba:gap-6 gba:flex-wrap gba:mt-4 gba:pl-4">
        {/* Manager Info with Avatar - only show if manager exists and is not the employee themselves */}
        {hasValidManager && (
          <>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Avatar size="sm">
                {headerData.managerPicture && (
                  <AvatarImage
                    src={`data:image/jpeg;base64,${headerData.managerPicture}`}
                    alt={headerData.managerName}
                  />
                )}
                <AvatarFallback className="gba:text-xs">{getManagerInitials(headerData.managerName!)}</AvatarFallback>
              </Avatar>
              <div className="gba:text-sm">
                <div className="gba:text-xs gba:text-muted-foreground">Manager</div>
                <div className="gba:font-medium">{headerData.managerName}</div>
              </div>
            </div>
            <HeaderSeparator />
          </>
        )}

        {/* Country */}
        {headerData.country && (
          <>
            <ContactInfoItem icon={PiMapPin} label="Country" value={headerData.country} />
            <HeaderSeparator />
          </>
        )}

        {/* Contact Info */}
        {headerData.email && <ContactInfoItem icon={PiEnvelope} label="Email" value={headerData.email} />}
        {headerData.phone && <ContactInfoItem icon={PiPhone} label="Phone" value={headerData.phone} />}
        {headerData.mobile && <ContactInfoItem icon={PiDeviceMobile} label="Mobile" value={headerData.mobile} />}
      </div>
    )
  }, [headerData])

  // Custom wide content className
  const wideContentClassName = 'gba:py-4 gba:w-full gba:max-w-full'

  // Single tab configuration - only Sales Performance
  const subViewsConfig = useMemo(
    () => ({
      defaultValue: 'performance',
      items: [
        {
          value: 'performance',
          label: getTranslationFromI18nKeyAndLabel('crm.performance.salesPerformance', 'Sales Performance'),
          contentClassName: wideContentClassName,
          content: (
            <div data-testid={`${DATA_TEST_ID_PREFIX}-performance-content`}>
              <SalesPerformanceTab
                employeeId={employeeId}
                accessToken={accessToken}
                userInfo={userInfo}
                isLoading={false}
                showComparisons={false}
                trends={trends}
              />
            </div>
          )
        }
      ]
    }),
    [employeeId, accessToken, userInfo, trends]
  )

  // Loading state
  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-96"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <div className="gba:text-destructive">Error loading employee data: {error}</div>
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
        headerIcon={PiUser}
        headerImageSrc={
          headerData?.pictureThumbnail ? `data:image/jpeg;base64,${headerData.pictureThumbnail}` : undefined
        }
        headerImageAlt={headerData?.displayName || 'Employee'}
        headerCategory={getTranslationFromI18nKeyAndLabel(
          'crm.performance.employeePerformance',
          'EMPLOYEE PERFORMANCE'
        )}
        onBack={onBack}
        headerTitle={
          headerData?.displayName ||
          (headerData?.firstName && headerData?.lastName
            ? `${headerData.firstName} ${headerData.lastName}`
            : 'Employee')
        }
        headerMeta={headerMeta}
        headerContent={headerContent}
        subViews={subViewsConfig}
      />
    </div>
  )
}

export default EmployeePerformanceView
