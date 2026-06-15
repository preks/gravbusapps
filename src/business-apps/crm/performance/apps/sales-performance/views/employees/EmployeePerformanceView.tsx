import React, { useMemo } from 'react'
import { Button, Spinner, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { EnvelopeIcon, PhoneIcon, DeviceMobileIcon, MapPinIcon, ArrowLeftIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useEmployeePerformanceData } from './employee-overview/hooks/useEmployeePerformanceData'
import { SalesPerformanceTab } from './employee-overview/components/tabs'

const DATA_TEST_ID_PREFIX = 'EmployeePerformanceView'

interface EmployeePerformanceViewProps extends BusinessAppContextProps {
  employeeId: string
  onBack: () => void
}

const getManagerInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

const HeaderSeparator: React.FC = () => <div className="gba:h-8 gba:w-px gba:bg-border" />

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
 * Employee Performance View - Simplified version showing only Sales Performance.
 * Uses the embedded drill-down layout (same as TeamPerformanceView) so KPI cards
 * render on the white PageLayout background instead of RecordLayout's grey shell.
 */
export const EmployeePerformanceView: React.FC<EmployeePerformanceViewProps> = ({
  employeeId,
  onBack,
  accessToken,
  userInfo
}) => {
  const { headerData, isLoading, error } = useEmployeePerformanceData(accessToken, employeeId)

  const displayName = useMemo(() => {
    if (!headerData) return 'Employee'

    return (
      headerData.displayName ||
      (headerData.firstName && headerData.lastName ? `${headerData.firstName} ${headerData.lastName}` : 'Employee')
    )
  }, [headerData])

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

  const headerDetails = useMemo(() => {
    if (!headerData) return null

    const hasValidManager = headerData.managerName && headerData.managerId && headerData.managerId !== headerData.id

    return (
      <div className="gba:flex gba:items-center gba:gap-6 gba:flex-wrap gba:pt-2">
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

        {headerData.country && (
          <>
            <ContactInfoItem icon={MapPinIcon} label="Country" value={headerData.country} />
            <HeaderSeparator />
          </>
        )}

        {headerData.email && <ContactInfoItem icon={EnvelopeIcon} label="Email" value={headerData.email} />}
        {headerData.phone && <ContactInfoItem icon={PhoneIcon} label="Phone" value={headerData.phone} />}
        {headerData.mobile && <ContactInfoItem icon={DeviceMobileIcon} label="Mobile" value={headerData.mobile} />}
      </div>
    )
  }, [headerData])

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-64"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:space-y-4" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gba:gap-2"
          data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}
        >
          <ArrowLeftIcon className="gba:h-4 gba:w-4" />
          Back to Employee Insights
        </Button>
        <div className="gba:text-destructive">Error loading employee data: {error}</div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gba:gap-2"
        data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}
      >
        <ArrowLeftIcon className="gba:h-4 gba:w-4" />
        Back to Employee Insights
      </Button>

      <div className="gba:space-y-2">
        <p className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('crm.performance.employeePerformance', 'Employee Performance')}
        </p>
        <div className="gba:flex gba:items-start gba:gap-4">
          {headerData?.pictureThumbnail && (
            <Avatar size="lg" data-testid={`${DATA_TEST_ID_PREFIX}-avatar`}>
              <AvatarImage src={`data:image/jpeg;base64,${headerData.pictureThumbnail}`} alt={displayName} />
              <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
          <div className="gba:space-y-1">
            <h2
              className="gba:text-2xl gba:font-semibold gba:text-foreground"
              data-testid={`${DATA_TEST_ID_PREFIX}-name`}
            >
              {displayName}
            </h2>
            {headerMeta}
            {headerDetails}
          </div>
        </div>
      </div>

      <div data-testid={`${DATA_TEST_ID_PREFIX}-performance-content`}>
        <SalesPerformanceTab
          employeeId={employeeId}
          accessToken={accessToken}
          userInfo={userInfo}
          showComparisons={false}
        />
      </div>
    </div>
  )
}

export default EmployeePerformanceView
