import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import {
  createConductorWorkflowEngine,
  employeeOnboardingServiceTemplate,
  employeeOnboardingTemplateMetadata
} from '../../../services'
import type { WorkflowEngine } from '../../../packages/services-plus-core/src'
import { serviceCategories } from '../../../packages/services-plus-seed/src'

// UI Components - TODO: Replace with @newwork/nw-design-system when migrated
import { Card, Button, Badge, Alert, Input, Tabs } from 'antd'
import {
  UserIcon,
  LaptopIcon,
  ClockIcon,
  CheckCircleIcon,
  CaretRightIcon
} from '@phosphor-icons/react'

const { Search } = Input
const { TabPane } = Tabs

export interface EnhancedServiceCatalogProps extends BusinessAppContextProps {
  onServiceSelect?: (templateKey: string) => void
  onMyRequestsClick?: () => void
  onServiceDeskClick?: () => void
}

/**
 * Enhanced Service Catalog with Real Workflow Integration
 *
 * This component provides an enhanced service catalog that integrates with the
 * Custom Flow Engine for real workflow execution. It includes the employee
 * onboarding service template and demonstrates end-to-end integration.
 */
export const EnhancedServiceCatalog: React.FC<EnhancedServiceCatalogProps> = ({
  onServiceSelect,
  onMyRequestsClick,
  onServiceDeskClick,
  ...contextProps
}) => {
  // Feature flag check - Services module enabled
  const servicesFeature = useFeature(Feature.Services.Enabled.Key)
  const isEnabled = servicesFeature !== false // true if undefined (development) or true

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isStartingRequest, setIsStartingRequest] = useState(false)
  const [workflowEngine, setWorkflowEngine] = useState<WorkflowEngine | null>(null)
  const [recentRequests, setRecentRequests] = useState<any[]>([])

  // Initialize workflow engine
  useEffect(() => {
    if (contextProps.accessToken) {
      try {
        const engine = createConductorWorkflowEngine(contextProps)
        setWorkflowEngine(engine)
        console.log('[EnhancedServiceCatalog] Conductor workflow engine initialized')
      } catch (error) {
        console.error('[EnhancedServiceCatalog] Error initializing workflow engine:', error)
      }
    }
  }, [contextProps.accessToken])

  // Load recent requests
  useEffect(() => {
    const loadRecentRequests = async () => {
      if (workflowEngine) {
        try {
          const requests = await workflowEngine.getMyRequests()
          setRecentRequests(requests.slice(0, 3)) // Show last 3 requests
        } catch (error) {
          console.error('[EnhancedServiceCatalog] Error loading recent requests:', error)
        }
      }
    }

    loadRecentRequests()
  }, [workflowEngine])

  // Handle service request initiation
  const handleStartOnboardingRequest = async () => {
    if (!workflowEngine) {
      console.error('[EnhancedServiceCatalog] Workflow engine not initialized')
      return
    }

    setIsStartingRequest(true)

    try {
      console.log('[EnhancedServiceCatalog] Starting employee onboarding request...')

      // Start the workflow with sample data (using real IDs from organizational structure)
      const requestId = await workflowEngine.startRequest('employee-onboarding-request', {
        employeeName: 'John Doe',
        employeeEmail: 'john.doe@example.com',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        department: 'dept-003', // Engineering department (real ID)
        position: 'role-004', // Engineering Manager (real role ID)
        reportingManager: 'user-006', // Ethan Rodriguez (real manager ID)
        employmentType: 'full-time', // Will be loaded from catalog in real form
        workLocation: 'hybrid',
        laptopType: 'macbook-pro',
        accessories: ['external-monitor', 'keyboard'],
        urgency: 'standard',
        specialRequirements: 'Developer workspace setup required'
      })

      console.log(`[EnhancedServiceCatalog] Request started successfully: ${requestId}`)

      // Navigate to My Requests to show the new request
      if (onMyRequestsClick) {
        onMyRequestsClick()
      }
    } catch (error) {
      console.error('[EnhancedServiceCatalog] Error starting request:', error)
    } finally {
      setIsStartingRequest(false)
    }
  }

  // Handle custom service selection
  const handleServiceSelect = (templateKey: string) => {
    if (onServiceSelect) {
      onServiceSelect(templateKey)
    }
  }

  // Filter categories based on search
  const filteredCategories = serviceCategories.filter(category => {
    const matchesSearch =
      !searchTerm ||
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || category.id === selectedCategory

    return matchesSearch && matchesCategory
  })

  if (!isEnabled) {
    return (
      <div data-testid="services-disabled" className="gba:p-6 gba:text-center">
        <Alert
          message="Services+ Not Available"
          description="The Services+ platform is not enabled for your organization."
          type="info"
          showIcon
          className="gba:max-w-md gba:mx-auto"
        />
      </div>
    )
  }

  return (
    <div data-testid="enhanced-service-catalog" className="gba:p-6 gba:max-w-7xl gba:mx-auto">
      {/* Header */}
      <div className="gba:mb-8">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <div>
            <h1 className="gba:text-3xl gba:font-bold gba:text-gray-900 gba:mb-2">Service Catalog</h1>
            <p className="gba:text-gray-600">
              Request services and track progress through our integrated workflow platform
            </p>
          </div>
          <div className="gba:flex gba:gap-3">
            <Button
              type="default"
              icon={<ClockIcon size={16} />}
              onClick={onMyRequestsClick}
              data-testid="my-requests-button"
            >
              My Requests
            </Button>
            <Button type="default" onClick={onServiceDeskClick} data-testid="service-desk-button">
              Service Desk
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="gba:flex gba:gap-4 gba:mb-6">
          <Search
            placeholder="Search services..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="gba:flex-1"
            data-testid="service-search"
          />
          <Tabs activeKey={selectedCategory} onChange={setSelectedCategory} className="gba:min-w-0">
            <TabPane tab="All" key="all" />
            <TabPane tab="HR" key="hr" />
            <TabPane tab="IT" key="it" />
            <TabPane tab="Facilities" key="facilities" />
          </Tabs>
        </div>
      </div>

      {/* Featured Service: Employee Onboarding */}
      <div className="gba:mb-8">
        <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-4">
          🌟 Featured Service: Real Workflow Integration
        </h2>
        <Card
          className="gba:bg-gradient-to-r gba:from-blue-50 gba:to-indigo-50 gba:border-blue-200"
          data-testid="employee-onboarding-featured"
        >
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3">
                <UserIcon size={24} className="gba:text-2xl gba:text-blue-600" />
                <div>
                  <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
                    {employeeOnboardingServiceTemplate.title}
                  </h3>
                  <Badge status="processing" text="Integrated with Custom Flow Engine" />
                </div>
              </div>

              <p className="gba:text-gray-600 gba:mb-4">{employeeOnboardingServiceTemplate.description}</p>

              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:mb-4">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <ClockIcon size={16} className="gba:text-blue-600" />
                  <span className="gba:text-sm gba:text-gray-600">
                    {employeeOnboardingTemplateMetadata.estimatedDuration}
                  </span>
                </div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <CheckCircleIcon size={16} className="gba:text-green-600" />
                  <span className="gba:text-sm gba:text-gray-600">
                    {employeeOnboardingServiceTemplate.steps.length} automated steps
                  </span>
                </div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <LaptopIcon size={16} className="gba:text-purple-600" />
                  <span className="gba:text-sm gba:text-gray-600">Multi-department coordination</span>
                </div>
              </div>

              <div className="gba:mb-4">
                <h4 className="gba:font-medium gba:text-gray-900 gba:mb-2">What you get:</h4>
                <ul className="gba:text-sm gba:text-gray-600 gba:list-disc gba:list-inside gba:space-y-1">
                  {employeeOnboardingTemplateMetadata.description.whatYouGet.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="gba:ml-6 gba:flex-shrink-0">
              <Button
                type="primary"
                size="large"
                loading={isStartingRequest}
                onClick={handleStartOnboardingRequest}
                disabled={!workflowEngine}
                data-testid="start-onboarding-request"
              >
                {isStartingRequest ? 'Starting Request...' : 'Start Onboarding Request'}
              </Button>
              {!workflowEngine && (
                <p className="gba:text-xs gba:text-gray-500 gba:mt-2 gba:text-center">
                  Connecting to workflow engine...
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Requests */}
      {recentRequests.length > 0 && (
        <div className="gba:mb-8">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-4">Recent Requests</h2>
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
            {recentRequests.map((request, index) => (
              <Card
                key={request.id}
                size="small"
                className="gba:hover:shadow-md gba:transition-shadow"
                data-testid={`recent-request-${index}`}
              >
                <div>
                  <h4 className="gba:font-medium gba:text-gray-900 gba:mb-1">{request.titleSnapshot}</h4>
                  <p className="gba:text-sm gba:text-gray-600 gba:mb-2">
                    Status: <Badge status="processing" text={request.status} />
                  </p>
                  <p className="gba:text-xs gba:text-gray-500">
                    Created: {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Service Categories */}
      <div>
        <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-4">Service Categories</h2>
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
          {filteredCategories.map(category => (
            <Card
              key={category.id}
              hoverable
              className="gba:h-full gba:transition-shadow gba:hover:shadow-lg"
              onClick={() => handleServiceSelect(category.id)}
              data-testid={`service-category-${category.id}`}
            >
              <div className="gba:flex gba:items-start gba:justify-between gba:h-full">
                <div className="gba:flex-1">
                  <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3">
                    <div className="gba:text-2xl">
                      {category.id === 'hr' && '👥'}
                      {category.id === 'it' && '💻'}
                      {category.id === 'facilities' && '🏢'}
                      {category.id === 'finance' && '💰'}
                      {category.id === 'procurement' && '🛒'}
                      {category.id === 'legal' && '⚖️'}
                      {!['hr', 'it', 'facilities', 'finance', 'procurement', 'legal'].includes(category.id) && '📋'}
                    </div>
                    <h3 className="gba:font-semibold gba:text-gray-900">{category.name}</h3>
                  </div>

                  <p className="gba:text-sm gba:text-gray-600 gba:mb-4">{category.description}</p>

                  {category.id === 'hr' && <Badge status="processing" text="Employee Onboarding Available" />}
                </div>
                <CaretRightIcon size={16} className="gba:text-gray-400 gba:ml-2" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Integration Status */}
      <div className="gba:mt-8 gba:p-4 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <CheckCircleIcon size={16} className="gba:text-green-600" />
          <h4 className="gba:font-medium gba:text-green-900">Integration Status</h4>
        </div>
        <div className="gba:text-sm gba:text-green-700 gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
          <div>✅ Custom Flow Engine: {workflowEngine ? 'Connected' : 'Connecting...'}</div>
          <div>✅ Employee Onboarding Template: Ready</div>
          <div>✅ Service Desk Integration: Active</div>
        </div>
      </div>
    </div>
  )
}
