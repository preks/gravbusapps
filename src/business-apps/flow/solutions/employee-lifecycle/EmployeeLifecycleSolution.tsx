import React, { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Button,
  PageLayout,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@newwork/nw-design-system'
import { Users, Plus, FileText, BarChart3, FileSearch } from 'lucide-react'
import { EmployeeLifecycleFlowService } from './services/EmployeeLifecycleFlowService'
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { DashboardTab } from './components/DashboardTab'
import { EmployeeLifecycleTemplatesTab } from './components/EmployeeLifecycleTemplatesTab'
import { AnalyticsTab } from './components/AnalyticsTab'
import { AuditTab } from './components/AuditTab'

export interface EmployeeLifecycleSolutionProps extends BusinessAppContextProps {}

export const EmployeeLifecycleSolution: React.FC<EmployeeLifecycleSolutionProps> = context => {
  // View options configuration
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <Users className="gba:w-4 gba:h-4" />,
      label: 'Dashboard'
    },
    {
      key: 'templates',
      icon: <FileText className="gba:w-4 gba:h-4" />,
      label: 'Lifecycle Templates'
    },
    {
      key: 'analytics',
      icon: <BarChart3 className="gba:w-4 gba:h-4" />,
      label: 'Analytics'
    },
    {
      key: 'audit',
      icon: <FileSearch className="gba:w-4 gba:h-4" />,
      label: 'Audit'
    }
  ]

  // Get initial view from URL or default to first view
  const getInitialView = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('view')

    if (viewFromUrl && viewOptions.some(option => option.key === viewFromUrl)) {
      return viewFromUrl
    }

    return viewOptions[0].key
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialView())
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false)
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    if (!context.accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const { templates } = await EmployeeLifecycleFlowService.listTemplates(context.accessToken, {
        limit: 50,
        offset: 0
      })
      setTemplates(templates)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  // Update URL when view changes
  const updateUrl = (view: string) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('view', view)
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }

  const handleTabChange = (key: string) => {
    if (!key) return
    setActiveTab(key)
    updateUrl(key)
  }

  // Ensure URL always has view parameter on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('view')) {
      updateUrl(activeTab)
    }
  }, [])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView()
      setActiveTab(newView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleLaunch = async (template: FlowTemplate) => {
    try {
      await EmployeeLifecycleFlowService.executeTemplate(context.accessToken, template.id!, {
        initiator: context.userInfo?.id || 'unknown'
      })
      setIsLaunchModalOpen(false)
      showToast(`Flow "${template.name}" started successfully`, 'success', 'Flow Started')
    } catch (e) {
      showToast(`Error starting flow: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error', 'Start Failed')
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab {...context} onRefetchTemplates={loadTemplates} />
      case 'templates':
        return <EmployeeLifecycleTemplatesTab {...context} />
      case 'analytics':
        return <AnalyticsTab {...context} />
      case 'audit':
        return <AuditTab {...context} />
      default:
        return null
    }
  }

  return (
    <div data-testid="employee-lifecycle-solution-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: Users,
          variant: 'default',
          size: 'lg',
          label: 'Employee Lifecycle'
        }}
        headerTitle="Employee Lifecycle"
        headerDescription="Manage employee lifecycle workflows such as onboarding, changes and offboarding"
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map(option => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        headerContent={
          <Dialog open={isLaunchModalOpen} onOpenChange={setIsLaunchModalOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" data-testid="employee-lifecycle-launch-button">
                <Plus className="gba:w-4 gba:h-4" />
                Start Lifecycle Flow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a Lifecycle Flow</DialogTitle>
              </DialogHeader>
              <div data-testid="employee-lifecycle-launch-list">
                {isLoading && <div data-testid="employee-lifecycle-launch-loading">Loading...</div>}
                {error && <div data-testid="employee-lifecycle-launch-error">{error}</div>}
                {!isLoading && !error && templates.length === 0 && (
                  <div data-testid="employee-lifecycle-launch-empty">No flows available</div>
                )}
                {!isLoading && !error && templates.length > 0 && (
                  <div>
                    {templates.map(tpl => (
                      <div key={tpl.id} data-testid={`employee-lifecycle-launch-item-${tpl.id}`}>
                        <div>{tpl.name}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLaunch(tpl)}
                          data-testid={`employee-lifecycle-launch-start-${tpl.id}`}
                        >
                          Start
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        }
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">{renderTabContent()}</div>
      </PageLayout>
    </div>
  )
}

export default EmployeeLifecycleSolution
