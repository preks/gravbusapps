import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { RiTimeLine } from '@remixicon/react'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface RecentAbsenceRequest {
  id: string
  startDate: string
  endDate: string
  calendarDays: number
  effectiveDays: number
  status: string
  createdAt: string
  employee: {
    id: string
    lastName: string
    firstName: string
    pictureThumbnail?: string
    employeePosition: {
      organizationalUnit: {
        name: string
      }
    }
  }
  type: {
    objectValue: string
    translations: { localeCode: string; value: string }[]
    id: string
    value: string
    parentEntryId: string
    groupName?: string
  }
}

interface RecentAbsenceRequestsListProps {
  recentRequests: RecentAbsenceRequest[]
  totalCount: number
  onNavigateToAbsenceListPage?: (preFilter?: any) => void
}

export const RecentAbsenceRequestsList: React.FC<RecentAbsenceRequestsListProps> = ({
  recentRequests,
  totalCount,
  onNavigateToAbsenceListPage
}) => {
  // Limit to 4 requests to fit within 510px card height
  const maxRequestsToShow = 4
  const displayedRequests = recentRequests.slice(0, maxRequestsToShow)

  // Generate avatar placeholder based on name initials
  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Generate consistent background colors for avatars
  const getAvatarBgColor = (name: string) => {
    const colors = [
      'var(--nw-chart-1)',
      'var(--nw-chart-2)',
      'var(--nw-chart-3)',
      'var(--nw-chart-4)',
      'var(--nw-chart-5)',
      'var(--nw-chart-6)',
      'var(--nw-chart-7)',
      'var(--nw-chart-8)'
    ]
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  // Generate email from name (placeholder logic)
  const generateEmail = (name: string) => {
    const nameParts = name.toLowerCase().split(' ')
    if (nameParts.length >= 2) {
      return `${nameParts[0]}${nameParts[1].charAt(0)}@gmail.com`
    }
    return `${nameParts[0]}@gmail.com`
  }

  const handleCardClick = () => {
    if (onNavigateToAbsenceListPage) {
      onNavigateToAbsenceListPage({
        type: 'recent',
        status: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']
      })
    }
  }

  return (
    <Card
      className="gba:hover:shadow-md gba:transition-shadow gba:w-full gba:h-[510px] gba:cursor-pointer"
      onClick={handleCardClick}
      data-testid="this-months-requests-card"
    >
      <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-4 gba:p-6">
        <div>
          <h5 className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.dashboard.this_month_requests_btn',
              "This Month's Requests"
            )}
          </h5>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.dashboard.created_this_month',
              'Created this month'
            )}
          </p>
          <div className="gba:text-2xl gba:font-bold gba:pt-2 gba:text-left">{totalCount}</div>
          <div className="gba:text-xs gba:text-muted-foreground gba:text-left">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.dashboard.this_month',
              'This Month'
            )}
          </div>
        </div>
        <RiTimeLine className="gba:h-6 gba:w-6 gba:text-muted-foreground gba:ml-2" />
      </div>

      <div className="gba:flex gba:flex-col gba:gap-2 gba:px-6 gba:pb-6">
        {displayedRequests.length > 0 ? (
          displayedRequests.map((request, idx) => (
            <div key={request.id + idx} className="gba:flex gba:items-center gba:justify-between gba:py-3">
              {/* Left side: Avatar + Name & Email */}
              <div className="gba:flex gba:items-center gba:gap-3">
                {/* Avatar */}
                <div
                  className="gba:w-11 gba:h-11 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:text-sm gba:font-medium gba:flex-shrink-0"
                  style={{
                    backgroundColor: getAvatarBgColor(`${request.employee.firstName} ${request.employee.lastName}`)
                  }}
                >
                  {getAvatarInitials(`${request.employee.firstName} ${request.employee.lastName}`)}
                </div>

                {/* Name and Email */}
                <div>
                  <div className="gba:text-sm gba:font-medium gba:text-foreground gba:leading-5 gba:text-left">
                    {`${request.employee.firstName} ${request.employee.lastName}`}
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:leading-4 gba:mt-1 gba:text-left">
                    {generateEmail(`${request.employee.firstName} ${request.employee.lastName}`)}
                  </div>
                </div>
              </div>

              {/* Right side: Creation date and days */}
              <div className="gba:flex gba:flex-col gba:items-end gba:gap-1">
                <div className="gba:text-sm gba:font-medium gba:text-foreground gba:text-right">
                  {dayjs(request.createdAt).format('MMM D')}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground gba:text-right">
                  {request.effectiveDays}{' '}
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.dashboard.days', 'days')}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="gba:text-center gba:text-muted-foreground gba:py-8">
            <p className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.dashboard.emptyMessage',
                'No requests this month'
              )}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
