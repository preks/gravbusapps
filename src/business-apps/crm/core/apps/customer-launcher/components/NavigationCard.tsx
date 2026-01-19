import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@newwork/nw-design-system'
import * as RemixIcons from '@remixicon/react'
import { NavigationCardProps } from '../types'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

const NavigationCard: React.FC<NavigationCardProps> = ({ area, onClick, stats }) => {
  // Get the icon component dynamically
  const IconComponent = (RemixIcons as any)[area.icon] || RemixIcons.RiQuestionLine

  const handleClick = () => {
    onClick(area)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(area)
    }
  }

  const handleButtonClick = (event: React.MouseEvent) => {
    event.stopPropagation() // Prevent card click

    // Navigate to customer relations with specific view using navigation utility
    if (area.id === 'leads') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'leads'
      })
      navigateTo(url)
    } else if (area.id === 'opportunities') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'opportunities'
      })
      navigateTo(url)
    } else if (area.id === 'accounts') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'accounts'
      })
      navigateTo(url)
    } else if (area.id === 'contacts') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'contacts'
      })
      navigateTo(url)
    } else if (area.id === 'analytics' || area.id === 'reports') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'dashboard'
      })
      navigateTo(url)
    }
  }

  // Handle action item navigation
  const handleActionClick = (view: string, additionalParams: Record<string, string> = {}, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent card click

    // Navigate to customer relations with specific parameters
    const params = { view, ...additionalParams }
    const url = buildPlatformUrl('/platform/crm/customer-relations', params)
    navigateTo(url)
  }

  // Category-based styling matching the professional design
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'sales':
        return {
          iconBg: 'gba:bg-green-50',
          iconColor: 'gba:text-green-500',
          statsBg: '#10B981',
          statsText: 'gba:text-hsl(var(--background))'
        }
      case 'customer':
        return {
          iconBg: 'gba:bg-blue-50',
          iconColor: 'gba:text-blue-500',
          statsBg: '#3B82F6',
          statsText: 'gba:text-hsl(var(--background))'
        }
      case 'intelligence':
        return {
          iconBg: 'gba:bg-purple-50',
          iconColor: 'gba:text-purple-500',
          statsBg: '#8B5CF6',
          statsText: 'gba:text-hsl(var(--background))'
        }
      default:
        return {
          iconBg: 'gba:bg-gray-50',
          iconColor: 'gba:text-gray-600',
          statsBg: '#6B7280',
          statsText: 'gba:text-hsl(var(--background))'
        }
    }
  }

  const styles = getCategoryStyles(area.category)

  // Get stats based on area type - use real data when available
  const getAreaStats = (areaId: string) => {
    switch (areaId) {
      case 'leads':
        return {
          number: stats?.totalLeads ? new Intl.NumberFormat('en-US').format(stats.totalLeads) : '0',
          label: 'Total Leadss',
          trend: '+12%'
        }
      case 'opportunities':
        return {
          number: stats?.totalOpportunities ? new Intl.NumberFormat('en-US').format(stats.totalOpportunities) : '0',
          label: 'Total Opportunities',
          trend: '+8%'
        }
      case 'accounts':
        return {
          number: stats?.totalAccounts ? new Intl.NumberFormat('en-US').format(stats.totalAccounts) : '0',
          label: 'Total Accounts',
          trend: '+5%'
        }
      case 'contacts':
        return {
          number: stats?.totalContacts ? new Intl.NumberFormat('en-US').format(stats.totalContacts) : '0',
          label: 'Total Contacts',
          trend: '+15%'
        }
      case 'reports':
        return { number: '23', label: 'Active Reports', trend: 'New' }
      case 'analytics':
        return { number: '8.4k', label: 'Data Points', trend: 'Live' }
      default:
        return { number: '0', label: 'Items', trend: '' }
    }
  }

  const areaStats = getAreaStats(area.id)

  return (
    <Card
      className="gba:group gba:cursor-pointer gba:transition-all gba:duration-300 gba:h-full gba:min-h-96 gba:bg-hsl(var(--background))/95 gba:backdrop-blur-md gba:border gba:border-hsl(var(--background))/30 hover:gba:shadow-2xl hover:gba:border-hsl(var(--background))/50 hover:gba:bg-hsl(var(--background)) hover:gba:scale-105 gba:rounded-xl gba:overflow-hidden gba:flex gba:flex-col"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Navigate to ${area.title}: ${area.description}`}
      data-testid={`navigation-card-${area.id}`}
    >
      <CardHeader className="gba:pb-4 gba:flex-shrink-0">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
          <div className={`gba:p-2 gba:rounded-lg ${styles.iconBg} gba:flex-shrink-0`}>
            <IconComponent
              className={`gba:h-6 gba:w-6 ${styles.iconColor}`}
              data-testid={`navigation-card-icon-${area.id}`}
            />
          </div>
          <div className="gba:text-right">
            <div className="gba:text-lg gba:font-bold gba:text-gray-900">{areaStats.number}</div>
            <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide">{areaStats.label}</div>
          </div>
        </div>

        <CardTitle className="gba:text-base gba:font-semibold gba:text-gray-900 gba:mb-1">{area.title}</CardTitle>
        <CardDescription className="gba:text-sm gba:text-gray-600 gba:leading-relaxed gba:line-clamp-2">
          {area.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="gba:pt-0 gba:flex gba:flex-col gba:flex-grow">
        {/* Action Items */}
        <div className="gba:space-y-2 gba:mb-4">
          {area.id === 'leads' && (
            <>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('leads', { salesLeadStatus: 'SalesLeadStatus:v1:OPEN' }, e)}
              >
                <span className="gba:text-gray-600">Active Leads</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('leads', { salesLeadStatus: 'SalesLeadStatus:v1:CONVERTED' }, e)}
              >
                <span className="gba:text-gray-600">Converted Leads</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}

          {area.id === 'opportunities' && (
            <>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('opportunities', { subView: 'pipeline' }, e)}
              >
                <span className="gba:text-gray-600">Pipeline Management</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('opportunities', { status: 'OPPORTUNITY_OPEN' }, e)}
              >
                <span className="gba:text-gray-600">Active Opportunities</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}

          {area.id === 'accounts' && (
            <>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('accounts', {}, e)}
              >
                <span className="gba:text-gray-600">Customers</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('accounts', { status: 'inactive' }, e)}
              >
                <span className="gba:text-gray-600">Inactive Accounts</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}

          {area.id === 'contacts' && (
            <>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('contacts', { contactType: 'FOUNDER_CONTACT' }, e)}
              >
                <span className="gba:text-gray-600">Founder Contacts</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('contacts', { contactType: 'PRIMARY_CONTACT' }, e)}
              >
                <span className="gba:text-gray-600">Primary Contacts</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('contacts', { contactType: 'SECONDARY_CONTACT' }, e)}
              >
                <span className="gba:text-gray-600">Secondary Contacts</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}

          {area.id === 'reports' && (
            <>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('dashboard', {}, e)}
              >
                <span className="gba:text-gray-600">Sales Reports</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('dashboard', {}, e)}
              >
                <span className="gba:text-gray-600">Custom Reports</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}

          {area.id === 'analytics' && (
            <>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('dashboard', {}, e)}
              >
                <span className="gba:text-gray-600">Performance Analytics</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div
                className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer hover:gba:bg-gray-50 gba:p-1 gba:rounded"
                onClick={e => handleActionClick('dashboard', {}, e)}
              >
                <span className="gba:text-gray-600">Predictive Insights</span>
                <RemixIcons.RiArrowRightSLine className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
            </>
          )}
        </div>

        {/* Primary Action Button - Always at bottom */}
        <button
          className={`gba:w-full gba:py-2 gba:px-4 ${styles.statsText} gba:text-xs gba:font-medium gba:rounded-md hover:gba:opacity-90 gba:transition-opacity gba:duration-200 gba:flex-shrink-0 gba:mt-auto gba:flex gba:items-center gba:justify-center`}
          style={{ backgroundColor: styles.statsBg }}
          onClick={handleButtonClick}
        >
          {area.id === 'leads' && 'View All Leads'}
          {area.id === 'opportunities' && 'View All Opportunities'}
          {area.id === 'accounts' && 'View All Accounts'}
          {area.id === 'contacts' && 'View All Contacts'}
          {area.id === 'reports' && 'Generate Report'}
          {area.id === 'analytics' && 'View Analytics'}
        </button>
      </CardContent>
    </Card>
  )
}

export default NavigationCard
