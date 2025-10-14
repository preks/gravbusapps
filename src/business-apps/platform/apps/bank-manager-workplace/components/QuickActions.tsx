/**
 * Quick Actions Panel
 * One-click access to common banking manager tasks
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge
} from '@newwork/nw-design-system'
import {
  CheckCircle,
  FileText,
  CalendarBlank,
  ChartBar,
  Envelope,
  Bell,
  Users,
  CurrencyDollar
} from '@phosphor-icons/react'
import { QuickAction } from '../types/banking.types'

export interface QuickActionsProps extends BusinessAppContextProps {
  pendingApprovalsCount?: number
  pendingMessagesCount?: number
  complianceAlertsCount?: number
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  pendingApprovalsCount = 0,
  pendingMessagesCount = 0,
  complianceAlertsCount = 0
}) => {
  const quickActions: QuickAction[] = [
    {
      id: 'approve-expenses',
      label: 'Spesen genehmigen',
      icon: 'check-circle',
      count: 5,
      onClick: () => console.log('Navigate to expense approvals'),
      color: 'success'
    },
    {
      id: 'review-loans',
      label: 'Kredite prüfen',
      icon: 'file-text',
      count: pendingApprovalsCount || 3,
      onClick: () => console.log('Navigate to loan approvals'),
      color: 'warning'
    },
    {
      id: 'team-calendar',
      label: 'Team-Kalender',
      icon: 'calendar',
      onClick: () => console.log('Navigate to team calendar'),
      color: 'info'
    },
    {
      id: 'branch-analytics',
      label: 'Filial-Dashboard',
      icon: 'chart',
      onClick: () => console.log('Navigate to branch analytics'),
      color: 'primary'
    },
    {
      id: 'customer-messages',
      label: 'Kundennachrichten',
      icon: 'envelope',
      count: pendingMessagesCount || 8,
      onClick: () => console.log('Navigate to messages'),
      color: 'info'
    },
    {
      id: 'compliance',
      label: 'Compliance-Alerts',
      icon: 'bell',
      count: complianceAlertsCount || 2,
      onClick: () => console.log('Navigate to compliance'),
      color: 'warning'
    },
    {
      id: 'team-performance',
      label: 'Team-Performance',
      icon: 'users',
      onClick: () => console.log('Navigate to team performance'),
      color: 'success'
    },
    {
      id: 'vip-customers',
      label: 'VIP-Kunden',
      icon: 'dollar',
      onClick: () => console.log('Navigate to VIP customers'),
      color: 'primary'
    }
  ]

  const getActionIcon = (iconName: string) => {
    const iconClass = "gba:h-5 gba:w-5"
    
    switch (iconName) {
      case 'check-circle':
        return <CheckCircle className={iconClass} />
      case 'file-text':
        return <FileText className={iconClass} />
      case 'calendar':
        return <CalendarBlank className={iconClass} />
      case 'chart':
        return <ChartBar className={iconClass} />
      case 'envelope':
        return <Envelope className={iconClass} />
      case 'bell':
        return <Bell className={iconClass} />
      case 'users':
        return <Users className={iconClass} />
      case 'dollar':
        return <CurrencyDollar className={iconClass} />
      default:
        return <FileText className={iconClass} />
    }
  }

  return (
    <Card data-testid="quick-actions-panel">
      <CardHeader>
        <CardTitle>⚡ Schnellaktionen</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
          {quickActions.map(action => (
            <Button
              key={action.id}
              variant="outline"
              className="gba:h-auto gba:p-4 gba:flex gba:flex-col gba:items-start gba:gap-2"
              onClick={action.onClick}
              data-testid={`quick-action-${action.id}`}
            >
              <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
                {getActionIcon(action.icon)}
                {action.count && action.count > 0 && (
                  <Badge variant="destructive" className="gba:text-xs">
                    {action.count}
                  </Badge>
                )}
              </div>
              <span className="gba:text-sm gba:font-medium gba:text-left">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

