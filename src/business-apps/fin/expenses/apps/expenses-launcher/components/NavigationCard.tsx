import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, IconAvatar } from '@newwork/nw-design-system'
import { CaretRightIcon } from '@phosphor-icons/react'
import { formatCurrencyLocalized } from '@/business-apps/fin/expenses/apps/expenses-launcher/utils/currencyUtils'
import { NavigationCardProps } from '../types'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

// Default KPI fallback values (can be made configurable later)
const DEFAULT_KPI_VALUES = {
  PERSONAL_MONTHLY_EXPENSES: 2450,
  TEAM_MONTHLY_EXPENSES: 849,
  DEFAULT_ANALYTICS_INSIGHTS: 27
} as const

const NavigationCard: React.FC<NavigationCardProps> = ({ area, stats, showManagerView, showFinanceView }) => {
  const IconComponent = area.icon

  const handleButtonClick = (event: React.MouseEvent) => {
    event.stopPropagation()

    if (area.buttonAction) {
      console.log(`Manager action: ${area.buttonAction} for ${area.title}`)

      // Handle manager and finance-specific navigation
      switch (area.buttonAction) {
        case 'navigate-personal-expenses':
          // Navigate to personal expenses dashboard tab
          const personalExpensesUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', { tab: 'dashboard' })
          navigateTo(personalExpensesUrl)
          break
        case 'navigate-team-expenses':
          // Navigate to team expenses dashboard
          const teamExpensesUrl = buildPlatformUrl('/platform/fin/expenses/manager-expenses', { tab: 'dashboard' })
          navigateTo(teamExpensesUrl)
          break
        case 'navigate-finance-management':
          // Navigate to backoffice expenses dashboard (finance management)
          const financeManagementUrl = buildPlatformUrl('/platform/fin/expenses/backoffice-expenses', {
            tab: 'dashboard'
          })
          navigateTo(financeManagementUrl)
          break
        case 'navigate-personal-analytics':
          // Navigate to personal analytics
          console.log('Navigate to personal analytics - to be implemented')
          break
        case 'navigate-team-analytics':
          // Navigate to team analytics (manager expenses with analytics view)
          const teamAnalyticsUrl = buildPlatformUrl('/platform/fin/expenses/manager-expenses', { view: 'analytics' })
          navigateTo(teamAnalyticsUrl)
          break
        case 'navigate-advanced-analytics':
          // Navigate to advanced finance analytics
          console.log('Navigate to advanced finance analytics - to be implemented')
          break
        default:
          console.log(`Unknown button action: ${area.buttonAction}`)
      }
    } else {
      // Handle employee view card navigation (when no specific buttonAction is defined)
      console.log(`Employee action for ${area.title} - area ID: ${area.id}`)

      // Map area IDs to personal expenses tabs
      const areaToTabMap: Record<string, string> = {
        'expense-items': 'expense-items',
        plans: 'expense-plans',
        'advance-payments': 'advance-payments',
        requests: 'expense-requests',
        calendar: 'calendar'
      }

      const tabName = areaToTabMap[area.id]

      if (tabName) {
        // Navigate to personal expenses with specific tab
        const personalExpensesUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', { tab: tabName })
        navigateTo(personalExpensesUrl)
      } else {
        console.log(`Button clicked for ${area.title} - navigation disabled temporarily`)
      }
    }
  }

  const handleLinkClick = (linkAction: string, event: React.MouseEvent) => {
    event.stopPropagation()
    console.log(`Manager link action: ${linkAction} for ${area.title}`)

    // Map link actions to tab names and navigate to specific apps with tabs
    const actionToTabMap: Record<string, string> = {
      'personal-expense-items': 'expense-items',
      'personal-expense-plans': 'expense-plans',
      'personal-advance-payments': 'advance-payments',
      'personal-expense-requests': 'expense-requests',
      'team-expense-plans': 'expense-plans',
      'team-advance-payments': 'advance-payments',
      'team-expense-requests': 'expense-requests',
      'team-expense-calendar': 'expense-calendar',
      'finance-expense-plans': 'expense-plans',
      'finance-advance-payments': 'advance-payments',
      'finance-expense-requests': 'expense-requests',
      'finance-policy-management': 'policy-management'
    }

    const tabName = actionToTabMap[linkAction]

    if (tabName) {
      if (linkAction.startsWith('personal-')) {
        // Navigate to personal expenses with specific tab
        const personalExpensesUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', { tab: tabName })
        navigateTo(personalExpensesUrl)
      } else if (linkAction.startsWith('team-')) {
        // Navigate to team expenses with specific tab
        const teamExpensesUrl = buildPlatformUrl('/platform/fin/expenses/manager-expenses', { tab: tabName })
        navigateTo(teamExpensesUrl)
      } else if (linkAction.startsWith('finance-')) {
        // Navigate to finance/backoffice expenses with specific tab
        const financeExpensesUrl = buildPlatformUrl('/platform/fin/expenses/backoffice-expenses', { tab: tabName })
        navigateTo(financeExpensesUrl)
      }
    } else {
      console.log(`Unknown link action: ${linkAction}`)
    }
  }

  const handleQuickLinkClick = (quickLinkType: string, filterValue: string, event: React.MouseEvent) => {
    event.stopPropagation()
    console.log(`Quick link clicked: ${quickLinkType} with filter: ${filterValue}`)

    // Map quick link types to their corresponding tabs and navigate with filters
    const quickLinkToTabMap: Record<string, { tab: string; filterParam: string }> = {
      'assigned-items': { tab: 'expense-items', filterParam: 'status' },
      'unassigned-items': { tab: 'expense-items', filterParam: 'status' },
      'pending-plans': { tab: 'expense-plans', filterParam: 'status' },
      'approved-plans': { tab: 'expense-plans', filterParam: 'status' },
      'pending-advances': { tab: 'advance-payments', filterParam: 'status' },
      'approved-advances': { tab: 'advance-payments', filterParam: 'status' },
      'pending-approval': { tab: 'expense-requests', filterParam: 'status' },
      'draft-requests': { tab: 'expense-requests', filterParam: 'status' },
      'spending-trends': { tab: 'expense-items', filterParam: 'view' },
      'budget-analysis': { tab: 'expense-plans', filterParam: 'view' }
    }

    const mapping = quickLinkToTabMap[quickLinkType]

    if (mapping) {
      // Build URL with tab and filter parameters
      const params = {
        tab: mapping.tab,
        [mapping.filterParam]: filterValue
      }
      const personalExpensesUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', params)
      navigateTo(personalExpensesUrl)
    } else {
      console.log(`Unknown quick link type: ${quickLinkType}`)
    }
  }

  // Category-based styling for IconAvatar
  const getIconAvatarVariant = (category: string, areaId: string) => {
    // Plans-specific styling (blue for plans card)
    if (areaId === 'plans') {
      return 'default'
    }

    // Calendar-specific styling (green for calendar card)
    if (areaId === 'calendar') {
      return 'success'
    }

    // Analytics-specific styling (different blue for analytics card)
    if (areaId === 'analytics') {
      return 'info'
    }

    // Finance-specific styling (green for finance cards)
    if (areaId === 'expense-management' || areaId === 'advanced-expense-analytics') {
      return 'success'
    }

    // Team-specific styling (green for team cards)
    if (areaId === 'team-expenses' || areaId === 'team-expense-analytics') {
      return 'success'
    }

    switch (category) {
      case 'core':
        return 'default'
      case 'planning':
        return 'success'
      case 'reporting':
        return 'premium'
      case 'manager':
        return 'default'
      default:
        return 'secondary'
    }
  }

  // Category-based styling
  const getCategoryStyles = (category: string, areaId: string) => {
    // Plans-specific styling (blue for plans card)
    if (areaId === 'plans') {
      return {
        iconBg: 'gba:bg-blue-50',
        iconColor: 'gba:text-blue-500',
        statsBg: '#3B82F6',
        statsText: 'gba:text-background'
      }
    }

    // Calendar-specific styling (green for calendar card)
    if (areaId === 'calendar') {
      return {
        iconBg: 'gba:bg-green-50',
        iconColor: 'gba:text-green-500',
        statsBg: '#10B981',
        statsText: 'gba:text-background'
      }
    }

    // Analytics-specific styling (different blue for analytics card)
    if (areaId === 'analytics') {
      return {
        iconBg: 'gba:bg-sky-50',
        iconColor: 'gba:text-sky-500',
        statsBg: '#0EA5E9',
        statsText: 'gba:text-background'
      }
    }

    // Finance-specific styling (green for finance cards)
    if (areaId === 'expense-management' || areaId === 'advanced-expense-analytics') {
      return {
        iconBg: 'gba:bg-green-50',
        iconColor: 'gba:text-green-500',
        statsBg: '#10B981',
        statsText: 'gba:text-background'
      }
    }

    // Team-specific styling (green for team cards)
    if (areaId === 'team-expenses' || areaId === 'team-expense-analytics') {
      return {
        iconBg: 'gba:bg-green-50',
        iconColor: 'gba:text-green-500',
        statsBg: '#10B981',
        statsText: 'gba:text-background'
      }
    }

    switch (category) {
      case 'core':
      case 'manager':
        // Both core and manager areas use blue theme
        return {
          iconBg: 'gba:bg-blue-50',
          iconColor: 'gba:text-blue-500',
          statsBg: '#3B82F6',
          statsText: 'gba:text-background'
        }
      case 'planning':
        return {
          iconBg: 'gba:bg-green-50',
          iconColor: 'gba:text-green-500',
          statsBg: '#10B981',
          statsText: 'gba:text-background'
        }
      case 'reporting':
        return {
          iconBg: 'gba:bg-purple-50',
          iconColor: 'gba:text-purple-500',
          statsBg: '#8B5CF6',
          statsText: 'gba:text-background'
        }
      default:
        return {
          iconBg: 'gba:bg-gray-50',
          iconColor: 'gba:text-gray-600',
          statsBg: '#6B7280',
          statsText: 'gba:text-background'
        }
    }
  }

  // Button color override based on area ID
  const getButtonColor = (areaId: string, category: string) => {
    // Plans-specific styling (blue for plans card)
    if (areaId === 'plans') {
      return '#3B82F6' // Blue for plans card
    }

    // Calendar-specific styling (green for calendar card)
    if (areaId === 'calendar') {
      return '#10B981' // Green for calendar card
    }

    // Analytics-specific styling (sky blue for analytics card)
    if (areaId === 'analytics') {
      return '#0EA5E9' // Sky blue for analytics card
    }

    // Finance-specific styling (green for finance cards)
    if (areaId === 'expense-management' || areaId === 'advanced-expense-analytics') {
      return '#10B981' // Green for finance cards
    }

    // Team-specific styling (green for team cards)
    if (areaId === 'team-expenses' || areaId === 'team-expense-analytics') {
      return '#10B981' // Green for team cards
    }

    if (category === 'manager') {
      return '#3B82F6' // Blue for manager cards (matching action items)
    }

    switch (areaId) {
      case 'expense-items':
      case 'plans':
      case 'advance-payments':
      case 'requests':
        return '#3B82F6' // Blue for all "View All" buttons
      default:
        return '#6B7280' // Gray fallback
    }
  }

  const styles = getCategoryStyles(area.category, area.id)
  const buttonColor = getButtonColor(area.id, area.category)
  const iconVariant = getIconAvatarVariant(area.category, area.id)

  // Get stats based on area type
  const getAreaStats = (areaId: string, kpiType?: string) => {
    // Manager and Finance-specific KPIs (both views get manager-style KPIs)
    if ((showManagerView || showFinanceView) && kpiType) {
      switch (kpiType) {
        case 'personal':
          return {
            number: formatCurrencyLocalized(
              stats.personalMonthlyExpenses ?? DEFAULT_KPI_VALUES.PERSONAL_MONTHLY_EXPENSES,
              'EUR',
              0
            ),
            label: 'Monthly Expenses',
            trend: 'Personal'
          }
        case 'team':
          return {
            number: new Intl.NumberFormat('en-US').format(
              stats.teamMonthlyExpenses || DEFAULT_KPI_VALUES.TEAM_MONTHLY_EXPENSES
            ),
            label: 'Monthly Requests',
            trend: 'Current Month'
          }
        case 'analytics':
          return {
            number: new Intl.NumberFormat('en-US').format(
              stats.analyticsInsights || DEFAULT_KPI_VALUES.DEFAULT_ANALYTICS_INSIGHTS
            ),
            label: 'Active Reports',
            trend: 'Updated'
          }
        default:
          return { number: '0', label: 'Items', trend: '' }
      }
    }

    // Regular user KPIs
    switch (areaId) {
      case 'expense-items':
        return {
          number: new Intl.NumberFormat('en-US').format(stats.totalExpenseItems),
          label: 'Total Items',
          trend: '+5%'
        }
      case 'plans':
        return {
          number: new Intl.NumberFormat('en-US').format(stats.activePlans),
          label: 'Total Plans',
          trend: 'Current'
        }
      case 'advance-payments':
        return {
          number: new Intl.NumberFormat('en-US').format(stats.advancePayments),
          label: 'Total Advances',
          trend: 'Pending'
        }
      case 'requests':
        return {
          number: new Intl.NumberFormat('en-US').format(stats.pendingRequests),
          label: 'Total Requests',
          trend: 'Review'
        }
      case 'calendar':
        return {
          number: new Intl.NumberFormat('en-US').format(stats.upcomingEvents || 0),
          label: 'Upcoming Events',
          trend: 'This Month'
        }
      case 'analytics':
        return {
          number: new Intl.NumberFormat('en-US').format(stats.pendingApprovals),
          label: 'Need Approval',
          trend: 'Urgent'
        }
      default:
        return { number: '0', label: 'Items', trend: '' }
    }
  }

  const areaStats = getAreaStats(area.id, area.kpiType)

  /**
   * Interactive link component with proper accessibility
   */
  const InteractiveLink: React.FC<{
    onClick: (e: React.MouseEvent) => void
    testId: string
    label: string
  }> = ({ onClick, testId, label }) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick(e as any)
      }
    }

    return (
      <div
        role="button"
        tabIndex={0}
        className="gba:flex gba:items-center gba:justify-between gba:text-sm gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded-md gba:transition-colors gba:duration-200"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        data-testid={testId}
      >
        <span className="gba:text-gray-700 gba:font-medium">{label}</span>
        <CaretRightIcon size={16} className="gba:h-4 gba:w-4 gba:text-gray-400" />
      </div>
    )
  }

  return (
    <Card
      className="gba:group gba:transition-all gba:duration-300 gba:h-full gba:bg-background/95 gba:backdrop-blur-md gba:border gba:border-background/20 gba:hover:shadow-xl gba:hover:shadow-black/10 gba:hover:border-background/40 gba:hover:bg-background gba:rounded-xl gba:overflow-hidden"
      data-testid={`navigation-card-${area.id}`}
    >
      <CardHeader className="gba:pb-4 gba:px-6 gba:pt-6">
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
          <IconAvatar
            icon={IconComponent}
            variant={iconVariant}
            size="lg"
            data-testid={`navigation-card-icon-${area.id}`}
          />
          <div className="gba:text-right">
            <div className="gba:text-xl gba:font-bold gba:text-gray-900">{areaStats.number}</div>
            <div className="gba:text-xs gba:text-gray-500 gba:uppercase gba:tracking-wide gba:font-medium">
              {areaStats.label}
            </div>
          </div>
        </div>

        <CardTitle className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-2 gba:leading-tight">
          {area.title}
        </CardTitle>
        <CardDescription className="gba:text-sm gba:text-gray-600 gba:leading-relaxed gba:line-clamp-2">
          {area.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="gba:pt-0 gba:px-6 gba:pb-6 gba:flex gba:flex-col gba:h-full">
        {/* Manager and Finance-specific links or regular action items */}
        <div className="gba:space-y-1 gba:mb-6 gba:mt-auto">
          {(showManagerView || showFinanceView) && area.links ? (
            // Manager and Finance links
            area.links.map((link, index) => (
              <InteractiveLink
                key={index}
                onClick={e => handleLinkClick(link.action, e)}
                testId={`navigation-link-${link.action}`}
                label={link.label}
              />
            ))
          ) : (
            // Regular action items for non-manager users
            <>
              {area.id === 'expense-items' && (
                <>
                  <InteractiveLink
                    onClick={e => handleQuickLinkClick('assigned-items', 'Assigned', e)}
                    testId="quick-link-assigned-items"
                    label="Assigned Items"
                  />
                  <InteractiveLink
                    onClick={e => handleQuickLinkClick('unassigned-items', 'Draft', e)}
                    testId="quick-link-unassigned-items"
                    label="Unassigned Items"
                  />
                </>
              )}

              {area.id === 'plans' && (
                <>
                  <InteractiveLink
                    onClick={e => handleQuickLinkClick('pending-plans', 'inApproval', e)}
                    testId="quick-link-pending-plans"
                    label="Pending Plans"
                  />
                  <InteractiveLink
                    onClick={e => handleQuickLinkClick('approved-plans', 'Approved', e)}
                    testId="quick-link-approved-plans"
                    label="Approved Plans"
                  />
                </>
              )}

              {area.id === 'advance-payments' && (
                <>
                  <InteractiveLink
                    onClick={e => handleQuickLinkClick('pending-advances', 'Prepared', e)}
                    testId="quick-link-pending-advances"
                    label="Pending Advances"
                  />
                  <InteractiveLink
                    onClick={e => handleQuickLinkClick('approved-advances', 'inTransit', e)}
                    testId="quick-link-approved-advances"
                    label="Approved Advances"
                  />
                </>
              )}

              {area.id === 'requests' && (
                <>
                  <InteractiveLink
                    onClick={e => handleQuickLinkClick('pending-approval', 'inApproval', e)}
                    testId="quick-link-pending-approval"
                    label="Pending Approval"
                  />
                  <InteractiveLink
                    onClick={e => handleQuickLinkClick('draft-requests', 'Draft', e)}
                    testId="quick-link-draft-requests"
                    label="Draft Requests"
                  />
                </>
              )}

              {area.id === 'analytics' && (
                <>
                  <InteractiveLink
                    onClick={e => handleQuickLinkClick('spending-trends', 'Trends', e)}
                    testId="quick-link-spending-trends"
                    label="Spending Trends"
                  />
                  <InteractiveLink
                    onClick={e => handleQuickLinkClick('budget-analysis', 'Budget', e)}
                    testId="quick-link-budget-analysis"
                    label="Budget Analysis"
                  />
                </>
              )}
            </>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          className={`gba:w-full gba:py-3 gba:px-4 ${styles.statsText} gba:text-sm gba:font-semibold gba:rounded-lg gba:hover:opacity-90 gba:transition-all gba:duration-200 gba:hover:scale-[1.02] gba:shadow-sm`}
          style={{ backgroundColor: buttonColor }}
          onClick={handleButtonClick}
          data-testid={`navigation-button-${area.id}`}
        >
          {area.buttonLabel ||
            (() => {
              switch (area.id) {
                case 'expense-items':
                  return 'View All Items'
                case 'plans':
                  return 'View All Plans'
                case 'advance-payments':
                  return 'View All Advances'
                case 'requests':
                  return 'View All Requests'
                case 'calendar':
                  return 'View Calendar'
                case 'analytics':
                  return 'View Analytics'
                default:
                  return 'View Details'
              }
            })()}
        </button>
      </CardContent>
    </Card>
  )
}

export default NavigationCard
