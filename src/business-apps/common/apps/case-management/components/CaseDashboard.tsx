/**
 * Case Dashboard Component
 *
 * Dashboard view with analytics KPIs and quick actions
 */

import React, { useMemo } from 'react'
import {
  LauncherLayout,
  type LauncherSectionConfig,
  type KpiData,
  type NavigationCardData,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button
} from '@newwork/nw-design-system'
import { Plus, FolderOpen } from 'lucide-react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { useCaseAnalytics } from '../hooks'
import { CaseStatusBadge } from './CaseStatusBadge'
import { Case } from '../types'
import { formatDate } from '../utils'

interface CaseDashboardProps {
  context: BusinessAppContextProps
  appTag: string
  appName: string
  appDescription?: string
  onCreateCase: () => void
  onViewAllCases: () => void
  onViewCase: (caseId: string) => void
  recentCases: Case[]
  showAnalytics?: boolean
}

export const CaseDashboard: React.FC<CaseDashboardProps> = ({
  context,
  appTag,
  appName,
  appDescription,
  onCreateCase,
  onViewAllCases,
  onViewCase,
  recentCases,
  showAnalytics = true
}) => {
  const { analytics, isLoading: analyticsLoading } = useCaseAnalytics(appTag, context)

  // Generate KPIs for the header
  const headerKpis = useMemo((): KpiData[] => {
    if (!showAnalytics || !analytics) return []

    return [
      {
        id: 'total',
        label: 'Total Cases',
        value: analytics.totalCases.toString()
      },
      {
        id: 'active',
        label: 'Active Cases',
        value: analytics.activeCases.toString()
      },
      {
        id: 'attention',
        label: 'Requiring Attention',
        value: analytics.casesRequiringAttention.toString()
      },
      {
        id: 'completed',
        label: 'Completed',
        value: analytics.completedCases.toString()
      }
    ]
  }, [showAnalytics, analytics])

  // Generate sections for LauncherLayout
  const sections = useMemo((): LauncherSectionConfig[] => {
    const cards: NavigationCardData[] = [
      {
        id: 'create-case',
        title: 'Create New Case',
        description: 'Start a new case with flows',
        icon: Plus,
        stats: {
          value: '+',
          label: 'New'
        },
        primaryAction: {
          label: 'Create Case',
          onClick: onCreateCase
        },
        variant: 'ext2'
      },
      {
        id: 'view-all',
        title: 'View All Cases',
        description: 'Browse and filter cases',
        icon: FolderOpen,
        stats: {
          value: analytics?.totalCases?.toString() || '0',
          label: 'Total Cases'
        },
        actions: [
          {
            label: 'Open Cases',
            onClick: onViewAllCases
          },
          {
            label: 'Active Cases',
            onClick: onViewAllCases
          }
        ],
        primaryAction: {
          label: 'View Cases',
          onClick: onViewAllCases
        },
        variant: 'ext4'
      }
    ]

    return [
      {
        id: 'case-management',
        title: 'Case Management',
        description: 'Manage cases and their associated flows',
        cards
      }
    ]
  }, [onCreateCase, onViewAllCases, analytics])

  return (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <LauncherLayout
        title={appName}
        description={appDescription}
        icon={FolderOpen}
        headerKpis={headerKpis}
        sections={sections}
        isLoading={analyticsLoading}
      />

      {/* Recent Cases Section */}
      {recentCases.length > 0 && (
        <div className="gba:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-3">
                {recentCases.slice(0, 5).map(caseItem => (
                  <div
                    key={caseItem.caseId}
                    className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg hover:gba:bg-muted/50 gba:cursor-pointer gba:transition-colors"
                    onClick={() => onViewCase(caseItem.caseId)}
                  >
                    <div className="gba:flex-1">
                      <p className="gba:font-medium gba:text-sm">{caseItem.state.metadata?.title || 'Untitled'}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">{formatDate(caseItem.createdAt)}</p>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      {caseItem.state.metadata?.status && <CaseStatusBadge status={caseItem.state.metadata.status} />}
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {caseItem.state.linkedFlows.filter(f => !f.removedAt).length} flows
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="gba:w-full gba:mt-4" onClick={onViewAllCases}>
                View All Cases
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
