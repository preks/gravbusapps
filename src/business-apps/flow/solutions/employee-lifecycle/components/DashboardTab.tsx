import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Button } from '@newwork/nw-design-system'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { Users, FileText, Clock, Play, UserPlus, UserMinus } from 'lucide-react'
import { EmployeeLifecycleFlowService } from '../services/EmployeeLifecycleFlowService'
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface DashboardTabProps extends BusinessAppContextProps {
  onRefetchTemplates?: () => void
}

export const DashboardTab: React.FC<DashboardTabProps> = context => {
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch employee lifecycle templates
      const { templates } = await EmployeeLifecycleFlowService.listTemplates(context.accessToken, {
        limit: 20,
        offset: 0
      })
      setTemplates(templates)
    } catch (err) {
      console.error('Error loading employee lifecycle data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load employee lifecycle data')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken])

  // Load templates on mount and when notified of new template
  useEffect(() => {
    loadData()
    const handler = () => loadData()
    window.addEventListener('employee-lifecycle-template-created', handler)
    return () => window.removeEventListener('employee-lifecycle-template-created', handler)
  }, [context.accessToken, loadData])

  // Calculate statistics from templates
  const totalTemplates = templates.length
  const onboardingTemplates = templates.filter(
    t => t.name.toLowerCase().includes('onboarding') || t.description?.toLowerCase().includes('onboarding')
  ).length
  const offboardingTemplates = templates.filter(
    t => t.name.toLowerCase().includes('offboarding') || t.description?.toLowerCase().includes('offboarding')
  ).length
  const otherTemplates = totalTemplates - onboardingTemplates - offboardingTemplates

  // Widget configuration for statistics - offboarding placed last
  const widgets: WidgetItem[] = [
    {
      key: 'total-lifecycle-flows',
      title: 'Total Lifecycle Flows',
      value: totalTemplates,
      prefix: <Users className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#3b82f6',
      description: 'All employee lifecycle processes'
    },
    {
      key: 'onboarding-flows',
      title: 'Onboarding Flows',
      value: onboardingTemplates,
      prefix: <UserPlus className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#16a34a',
      description: 'New employee onboarding'
    },
    {
      key: 'other-flows',
      title: 'Other Flows',
      value: otherTemplates,
      prefix: <FileText className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#9333ea',
      description: 'Career changes & updates'
    },
    {
      key: 'offboarding-flows',
      title: 'Offboarding Flows',
      value: offboardingTemplates,
      prefix: <UserMinus className="gba:h-5 gba:w-5 gba:text-orange-600" />,
      color: '#ea580c',
      description: 'Employee departure process'
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="employee-lifecycle-dashboard-tab">
      {/* Page Header */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
        <Users className="gba:h-8 gba:w-8 gba:text-blue-600" />
        <div>
          <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Employee Lifecycle Dashboard</h1>
          <p className="gba:text-gray-600">Manage employee journey from hiring to departure</p>
        </div>
      </div>

      {/* Statistics Widgets */}
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={loadData}
        skeletonCount={4}
        emptyText="No employee lifecycle statistics available."
        data-testid="employee-lifecycle-statistics"
      />

      {/* Available Templates */}
      <div>
        <h3 className="gba:text-base gba:font-medium gba:mb-3">Employee Lifecycle Flows</h3>
        {isLoading ? (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="gba:h-32 gba:rounded-lg gba:animate-pulse gba:bg-gray-200 gba:border gba:shadow-sm"
                data-testid={`employee-lifecycle-template-skeleton-${i}`}
              />
            ))}
          </div>
        ) : templates.length > 0 ? (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                className="gba:p-4 gba:rounded-lg gba:border gba:shadow-sm gba:bg-white hover:gba:shadow-md gba:transition-shadow"
                data-testid={`employee-lifecycle-template-card-${template.id}`}
              >
                <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <FileText className="gba:h-5 gba:w-5 gba:text-blue-600" />
                    <h4 className="gba:font-medium gba:text-gray-900">{template.name}</h4>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gba:flex gba:items-center gba:gap-1"
                    data-testid={`launch-template-${template.id}`}
                  >
                    <Play className="gba:h-3 gba:w-3" />
                    Launch
                  </Button>
                </div>
                {template.description && (
                  <p className="gba:text-sm gba:text-gray-600 gba:mb-3">{template.description}</p>
                )}
                <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-gray-500">
                  <span>Steps: {template.steps?.length || 0}</span>
                  {template.tags && (
                    <span className="gba:px-2 gba:py-1 gba:bg-blue-100 gba:text-blue-700 gba:rounded">
                      Employee Lifecycle
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="gba:text-center gba:py-8" style={{ color: 'var(--color-muted-foreground)' }}>
            <Users
              className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4"
              style={{ color: 'var(--color-muted-foreground)' }}
            />
            <p>No employee lifecycle flows found</p>
            <p className="gba:text-sm">Flow templates with 'solution: employeeLifecycle' tag will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardTab
