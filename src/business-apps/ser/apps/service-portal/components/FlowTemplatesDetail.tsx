import React, { useEffect } from 'react'
import { PageLayout, Card, Button, Badge, Alert, Spinner, type KpiCardData } from '@newwork/nw-design-system'
import { FlowTemplate } from '../../../types'
import { useSharedFlowTemplates } from '../../../hooks/useSharedFlowTemplates'
import { FlowTemplateCard } from './FlowTemplateCard'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ArrowLeft, Tree, Warning, CheckCircle } from '@phosphor-icons/react'

export interface FlowTemplatesDetailProps extends BusinessAppContextProps {
  onRequestFlowTemplate?: (template: FlowTemplate) => void
  onBack: () => void
}

export const FlowTemplatesDetail: React.FC<FlowTemplatesDetailProps> = ({
  onRequestFlowTemplate,
  onBack,
  ...contextProps
}) => {
  console.log('🎭 [FlowTemplatesDetail] Component mounted')

  // Fetch flow templates from custom-flow-engine using shared service
  const {
    templates: flowTemplates,
    isLoading: flowTemplatesLoading,
    error: flowTemplatesError,
    refetch: refetchFlowTemplates,
    totalCount: flowTemplatesCount
  } = useSharedFlowTemplates(contextProps, {
    enabled: true,
    limit: 100
  })

  // Debug effect for flow templates
  useEffect(() => {
    console.log('🎭 [FlowTemplatesDetail] Flow templates state changed:', {
      loading: flowTemplatesLoading,
      error: flowTemplatesError,
      count: flowTemplates.length,
      templates: flowTemplates.map(t => ({ id: t.id, name: t.name }))
    })
  }, [flowTemplates, flowTemplatesLoading, flowTemplatesError])

  // Calculate KPI cards for flow templates
  const kpiCards: KpiCardData[] = [
    {
      id: 'total-templates',
      title: 'Available Templates',
      value: flowTemplatesCount?.toString() || '0',
      description: 'Dynamic workflow templates'
    },
    {
      id: 'categories',
      title: 'Categories',
      value: 'All',
      description: 'Cross-functional workflows'
    },
    {
      id: 'avg-steps',
      title: 'Avg. Steps',
      value:
        flowTemplates.length > 0
          ? Math.round(flowTemplates.reduce((sum, t) => sum + t.stepCount, 0) / flowTemplates.length).toString()
          : '0',
      description: 'Per workflow template'
    },
    {
      id: 'response-time',
      title: 'Response Time',
      value: 'Real-time',
      description: 'Live from engine'
    }
  ]

  return (
    <div data-testid="flow-templates-detail-container" className="gba:bg-background gba:p-4">
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeft className="gba:mr-2" size={16} />
          <span>Back to Portal</span>
        </button>
      </div>

      <PageLayout
        headerPhosphorIcon={{
          icon: Tree,
          variant: 'strategy',
          size: 'lg',
          label: 'Flow Templates'
        }}
        headerTitle="Flow Templates"
        headerDescription="Dynamic workflow templates from custom-flow-engine with automatic form generation based on template definitions"
        sectionTitle="Available Templates"
        sectionDescription={`${flowTemplates.length} dynamic workflow template${flowTemplates.length !== 1 ? 's' : ''} loaded from the workflow engine`}
        kpiCardsData={kpiCards}
      >
        {/* Flow Templates Section */}
        <div className="gba:space-y-6">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Tree className="gba:w-5 gba:h-5 gba:text-indigo-600" />
                <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Dynamic Templates</h2>
              </div>
              <Badge
                variant="outline"
                className="gba:text-xs gba:bg-indigo-50 gba:text-indigo-700 gba:border-indigo-300"
              >
                Live Data
              </Badge>
              {flowTemplatesLoading && <Spinner className="gba:w-4 gba:h-4 gba:text-indigo-600" />}
            </div>

            <div className="gba:flex gba:gap-2">
              {flowTemplatesError && (
                <Button variant="outline" size="sm" onClick={refetchFlowTemplates} className="gba:text-xs">
                  Retry
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('🎭 [FlowTemplatesDetail] Manual refresh clicked')
                  refetchFlowTemplates()
                }}
                className="gba:text-xs"
              >
                Refresh Templates
              </Button>
            </div>
          </div>

          <p className="gba:text-sm gba:text-gray-600">
            These templates are dynamically loaded from the custom-flow-engine and automatically generate forms based on
            their step definitions.
          </p>

          {/* Flow Templates Loading State */}
          {flowTemplatesLoading && (
            <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2 gba:xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="gba:h-64 gba:animate-pulse">
                  <div className="gba:p-6 gba:space-y-4">
                    <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
                    <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-1/2"></div>
                    <div className="gba:space-y-2">
                      <div className="gba:h-3 gba:bg-gray-200 gba:rounded"></div>
                      <div className="gba:h-3 gba:bg-gray-200 gba:rounded gba:w-5/6"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Flow Templates Error State */}
          {flowTemplatesError && !flowTemplatesLoading && (
            <Alert variant="destructive">
              <Warning className="gba:h-4 gba:w-4" />
              <div>
                <p className="gba:font-semibold">Failed to Load Flow Templates</p>
                <p className="gba:text-sm">{flowTemplatesError}</p>
                <div className="gba:mt-2 gba:text-xs gba:space-y-1">
                  <div>
                    💡 <strong>Troubleshooting:</strong>
                  </div>
                  <div>1. Verify custom-flow-engine is running on localhost:3000</div>
                  <div>2. Check http://localhost:3000/api/templates responds</div>
                  <div>3. Look for console errors with tags "🎭" and "🎯"</div>
                </div>
              </div>
            </Alert>
          )}

          {/* Debug Information */}
          <div className="gba:p-4 gba:bg-gray-50 gba:rounded-lg gba:text-xs gba:text-gray-600">
            <div>
              <strong>Flow Templates Debug Info:</strong>
            </div>
            <div>• Loading: {flowTemplatesLoading ? 'Yes' : 'No'}</div>
            <div>• Error: {flowTemplatesError || 'None'}</div>
            <div>• Templates Count: {flowTemplates.length}</div>
            <div>• Total Count: {flowTemplatesCount}</div>
            <div>• Backend: localhost:3000</div>
            <div>
              • Console Tags: Look for "🎭 [FlowTemplatesDetail]", "🎭 [useSharedFlowTemplates]" and "🎯
              [TemplatesService]"
            </div>
          </div>

          {/* Flow Templates Grid */}
          {!flowTemplatesLoading && !flowTemplatesError && flowTemplates.length > 0 && (
            <>
              <Alert>
                <CheckCircle className="gba:h-4 gba:w-4" />
                <div>
                  <p className="gba:font-semibold">Templates Loaded Successfully</p>
                  <p className="gba:text-sm">
                    Found {flowTemplates.length} workflow template{flowTemplates.length !== 1 ? 's' : ''} from
                    custom-flow-engine. Click on any template to create a new request with dynamic form generation.
                  </p>
                </div>
              </Alert>

              <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:lg:grid-cols-2 gba:xl:grid-cols-3">
                {flowTemplates.map(template => (
                  <FlowTemplateCard
                    key={template.id || template.name}
                    template={template}
                    onRequest={() => onRequestFlowTemplate?.(template)}
                  />
                ))}
              </div>
            </>
          )}

          {/* No Flow Templates */}
          {!flowTemplatesLoading && !flowTemplatesError && flowTemplates.length === 0 && (
            <div className="gba:text-center gba:py-12 gba:border-2 gba:border-dashed gba:border-gray-200 gba:rounded-lg">
              <Tree className="gba:w-12 gba:h-12 gba:text-gray-400 gba:mx-auto gba:mb-4" />
              <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-2">No Templates Available</h3>
              <p className="gba:text-sm gba:text-gray-500 gba:mb-4">
                No workflow templates were found in the custom-flow-engine.
              </p>
              <div className="gba:text-xs gba:text-gray-400 gba:space-y-1">
                <div>Expected endpoint: http://localhost:3000/api/templates</div>
                <div>Make sure the custom-flow-engine is running and has templates loaded</div>
              </div>
            </div>
          )}
        </div>
      </PageLayout>
    </div>
  )
}
