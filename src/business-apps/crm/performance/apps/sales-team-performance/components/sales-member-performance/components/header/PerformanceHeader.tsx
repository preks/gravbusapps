import React from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  Spinner,
  Alert
} from '@newwork/nw-design-system'
import { ArrowLeftIcon, EnvelopeIcon, PhoneIcon, CalendarIcon, FlagIcon, DeviceMobileIcon } from '@phosphor-icons/react'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { EmployeeHeaderData } from '../../queries/EmployeeHeaderQueries'

const DATA_TEST_ID_PREFIX = 'PerformanceHeader'

interface PerformanceHeaderProps {
  headerData: EmployeeHeaderData | null
  isLoading?: boolean
  error?: string | null
  onBack?: () => void
  onRetry?: () => void
}

export const PerformanceHeader: React.FC<PerformanceHeaderProps> = ({
  headerData,
  isLoading = false,
  error = null,
  onBack,
  onRetry
}) => {
  // Get employee initials for avatar
  const getEmployeeInitials = (displayName: string): string => {
    return displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  if (isLoading) {
    return (
      <div className="gba:w-full gba:mb-6" data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
        <div className="gba:mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gba:gap-2"
            data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}
          >
            <ArrowLeftIcon className="gba:w-4 gba:h-4" />
            Back to Team List
          </Button>
        </div>
        <Card className="gba:w-full">
          <CardContent className="gba:p-4 gba:flex gba:justify-center gba:items-center gba:h-32">
            <Spinner size="lg" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="gba:w-full gba:mb-6" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <div className="gba:mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gba:gap-2"
            data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}
          >
            <ArrowLeftIcon className="gba:w-4 gba:h-4" />
            Back to Team List
          </Button>
        </div>
        <Alert variant="destructive">
          <span>Error loading employee data: {error}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="gba:ml-4">
              Retry
            </Button>
          )}
        </Alert>
      </div>
    )
  }

  // No data state
  if (!headerData) {
    return (
      <div className="gba:w-full gba:mb-6" data-testid={`${DATA_TEST_ID_PREFIX}-no-data`}>
        <div className="gba:mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gba:gap-2"
            data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}
          >
            <ArrowLeftIcon className="gba:w-4 gba:h-4" />
            Back to Team List
          </Button>
        </div>
        <Alert>
          <span>Employee data not found</span>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:w-full gba:mb-6" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Back button */}
      <div className="gba:mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gba:gap-2"
          data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}
        >
          <ArrowLeftIcon className="gba:w-4 gba:h-4" />
          Back to Team List
        </Button>
      </div>

      {/* Header card */}
      <Card
        className="gba:w-full gba:bg-gradient-to-r gba:from-blue-50 gba:to-indigo-50 gba:border-0 gba:shadow-none"
        data-testid={`${DATA_TEST_ID_PREFIX}-card`}
      >
        <CardContent className="gba:p-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
            {/* Left: Avatar and Name */}
            <div className="gba:flex gba:items-center gba:gap-4">
              <Avatar size="lg" data-testid={`${DATA_TEST_ID_PREFIX}-avatar`}>
                <AvatarImage
                  src={`data:image/jpeg;base64,${headerData.pictureThumbnail}`}
                  alt={headerData.displayName}
                />
                <AvatarFallback className="gba:text-xl gba:font-semibold">
                  {getEmployeeInitials(headerData.displayName)}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1
                  className="gba:text-2xl gba:font-bold gba:text-gray-900"
                  data-testid={`${DATA_TEST_ID_PREFIX}-name`}
                >
                  {headerData.displayName}
                </h1>
                <div className="gba:text-lg gba:text-gray-600">{headerData.jobPosition || 'Unknown Position'}</div>
                <div className="gba:text-sm gba:text-gray-500">{headerData.businessUnit || 'Unknown Department'}</div>
              </div>
            </div>

            {/* Right: Contact and details in single horizontal row */}
            <div className="gba:flex gba:items-center gba:gap-6 gba:flex-wrap">
              {/* Email */}
              {headerData.email && (
                <div
                  className="gba:flex gba:items-center gba:gap-2 gba:min-w-0"
                  data-testid={`${DATA_TEST_ID_PREFIX}-email`}
                >
                  <EnvelopeIcon className="gba:w-3 gba:h-3 gba:text-gray-400 gba:flex-shrink-0" />
                  <div className="gba:min-w-0">
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Email</div>
                    <div className="gba:text-sm gba:text-gray-900 gba:truncate gba:max-w-[150px]">
                      {headerData.email}
                    </div>
                  </div>
                </div>
              )}

              {/* Phone */}
              {headerData.phone && (
                <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${DATA_TEST_ID_PREFIX}-phone`}>
                  <PhoneIcon className="gba:w-3 gba:h-3 gba:text-gray-400 gba:flex-shrink-0" />
                  <div>
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Phone</div>
                    <div className="gba:text-sm gba:text-gray-900">{headerData.phone}</div>
                  </div>
                </div>
              )}

              {/* Mobile */}
              {headerData.mobile && (
                <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${DATA_TEST_ID_PREFIX}-mobile`}>
                  <DeviceMobileIcon className="gba:w-3 gba:h-3 gba:text-gray-400 gba:flex-shrink-0" />
                  <div>
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Mobile</div>
                    <div className="gba:text-sm gba:text-gray-900">{headerData.mobile}</div>
                  </div>
                </div>
              )}

              {/* Manager */}
              {headerData.managerName && (
                <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${DATA_TEST_ID_PREFIX}-manager`}>
                  <Avatar size="sm" className="gba:w-6 gba:h-6">
                    <AvatarImage
                      src={`data:image/jpeg;base64,${headerData.managerPicture}`}
                      alt={headerData.managerName}
                    />
                    <AvatarFallback className="gba:text-xs">
                      {getEmployeeInitials(headerData.managerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Manager</div>
                    <div className="gba:text-sm gba:text-gray-900">{headerData.managerName}</div>
                  </div>
                </div>
              )}

              {/* Start Date */}
              {headerData.startDate && (
                <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${DATA_TEST_ID_PREFIX}-start-date`}>
                  <CalendarIcon className="gba:w-3 gba:h-3 gba:text-gray-400 gba:flex-shrink-0" />
                  <div>
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Start Date</div>
                    <div className="gba:text-sm gba:text-gray-900">{headerData.startDate}</div>
                  </div>
                </div>
              )}

              {/* Country */}
              {headerData.country && (
                <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${DATA_TEST_ID_PREFIX}-country`}>
                  <FlagIcon className="gba:w-3 gba:h-3 gba:text-gray-400 gba:flex-shrink-0" />
                  <div>
                    <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Country</div>
                    <div className="gba:text-sm gba:text-gray-900">{headerData.country}</div>
                  </div>
                </div>
              )}

              {/* Total Sales */}
              <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${DATA_TEST_ID_PREFIX}-total-sales`}>
                <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-green-500 gba:flex-shrink-0"></div>
                <div>
                  <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">Total Sales</div>
                  <div className="gba:text-sm gba:font-semibold gba:text-green-600">
                    {formatCurrency(headerData.totalSales, headerData.currencyId)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PerformanceHeader
