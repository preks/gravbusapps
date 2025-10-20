import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { KPISection } from './KPISection'
import { ChartsSection } from './ChartsSection'
import { UrgentTicketsSummaryCard } from './UrgentTicketsSummaryCard'

/**
 * Service Desk Dashboard - USER-FOCUSED dashboard providing personal workload overview
 * Features: Personal KPIs (clickable), Urgent tickets summary, Performance charts, Activity feed
 * Focus: Individual user productivity and actionable insights, not organization-wide metrics
 */
export interface DashboardProps extends BusinessAppContextProps {
  onTaskSelect?: (taskId: string, deskKey: string) => void
}

export const Dashboard: React.FC<DashboardProps> = ({ accessToken, userInfo, onTaskSelect }) => {
  // Handle navigation to tickets tab with optional filter
  const handleNavigateToTickets = (filter?: 'overdue' | 'dueToday' | 'inProgress') => {
    console.log(`[Dashboard] Navigate to tickets with filter: ${filter || 'all'}`)
    const url = new URL(window.location.href)
    url.searchParams.set('subview', 'tickets')
    if (filter) {
      url.searchParams.set('filter', filter)
    }
    window.history.pushState({}, '', url.toString())
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
  }
  return (
    <div className="gba:p-6 gba:min-h-screen gba:bg-background" data-testid="service-desk-dashboard">
      {/* Main Dashboard Grid Layout */}
      <div className="gba:space-y-6">
        {/* KPI Metrics Section (Full Width) */}
        <KPISection accessToken={accessToken} userInfo={userInfo} />

        {/* Urgent Tickets Summary Card (Full Width) */}
        <UrgentTicketsSummaryCard
          accessToken={accessToken}
          userInfo={userInfo}
          onNavigateToTickets={handleNavigateToTickets}
        />

        {/* Performance Charts Section (includes Activity Feed in right column) */}
        <ChartsSection accessToken={accessToken} userInfo={userInfo} onTaskSelect={onTaskSelect} />
      </div>
    </div>
  )
}
