import React, { useState, useEffect } from 'react'
import { Spinner, Tabs, TabsList, TabsTrigger, TabsContent, Button } from '@newwork/nw-design-system'
import { ArrowLeftOutlined, UserOutlined, FileOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useOpportunityData } from './hooks/useOpportunityData'
import { OpportunityHeader } from './components/OpportunityHeader'
import { CompanyInformation } from './components/CompanyInformation'
import { ContactInformation } from './components/ContactInformation'
import { OpportunityDetails } from './components/OpportunityDetails'
import { ActivityTimeline } from './components/ActivityTimeline'
import { TasksSection } from './components/TasksSection'
import { OpportunityStageProgression } from './components/OpportunityStageProgression'
import { OpportunityDocuments } from './components/OpportunityDocuments'

interface OpportunityRecordContentProps extends BusinessAppContextProps {
  opportunityId: string
  onBack: () => void
  getBackButtonText: () => string
  fromEntity?: string | null
}

const OpportunityRecordContent: React.FC<OpportunityRecordContentProps> = ({
  opportunityId,
  onBack,
  getBackButtonText,
  ...props
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const {
    opportunity,
    opportunityData,
    stageConditionStatuses,
    loading,
    error,
    opportunityStages,
    loadingStages,
    stagesError,
    refetchOpportunityData
  } = useOpportunityData(opportunityId, props.accessToken)

  // Listen for process completion events to refresh opportunity data (including stage condition updates)
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('OpportunityRecord: Process completion event received:', event)

        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('OpportunityRecord: Refreshing opportunity data after stage condition update...')
          refetchOpportunityData()
          return
        }

        // Also check for different event structure
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.opportunityStageConditionStatus) {
          console.log('OpportunityRecord: Refreshing opportunity data from response...')
          refetchOpportunityData()
        }
      } catch (err) {
        console.error('Error handling process completion in OpportunityRecord:', err)
      }
    }

    // Listen to multiple possible event names for stage condition updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener)
      })
    }
  }, [refetchOpportunityData])

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !opportunity) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">{error || 'Opportunity not found'}</p>
          <Button onClick={onBack} className="gba:mt-4" variant="default">
            {getBackButtonText()}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:opportunity-details-container gba:bg-background"
      data-testid="opportunity-record-detail"
      style={{ padding: '16px' }}
    >
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>{getBackButtonText()}</span>
        </button>
      </div>

      <OpportunityHeader
        opportunity={opportunity}
        opportunityData={opportunityData}
        opportunityId={opportunityId}
        additionalData={props}
        accessToken={props.accessToken}
      />

      {/* Stage Progression - Show filtered pipeline stages */}
      {!loadingStages && !stagesError && opportunityStages.length > 0 && opportunityData?.salesPipelineRef && (
        <OpportunityStageProgression
          currentStage={opportunityData?.salesPipelineStage?.code || 'Discovery'}
          stages={opportunityStages}
          opportunityId={opportunityId}
          opportunityVersion={parseInt(opportunity.version) || 0}
          accessToken={props.accessToken}
          stageConditionStatuses={stageConditionStatuses}
          onStageUpdate={refetchOpportunityData}
        />
      )}

      {/* Show stages loading */}
      {loadingStages && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spinner size="sm" />
          <span style={{ marginLeft: '8px' }}>Loading pipeline stages...</span>
        </div>
      )}

      {/* Show stages error */}
      {stagesError && (
        <div className="gba:text-destructive" style={{ textAlign: 'center', padding: '20px' }}>
          <p>Failed to load pipeline stages: {stagesError}</p>
        </div>
      )}

      {/* Show info when no salesPipelineRef */}
      {!opportunityData?.salesPipelineRef && !loadingStages && (
        <div className="gba:text-muted-foreground" style={{ textAlign: 'center', padding: '20px' }}>
          <p>No sales pipeline assigned to this opportunity</p>
        </div>
      )}

      <div className="gba:opportunity-details-content" data-testid="opportunity-details-content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
          <TabsList className="gba:bg-hsl(var(--background)) gba:border gba:mb-6">
            <TabsTrigger value="overview" data-testid="overview-tab">
              <UserOutlined className="gba:mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="documents-tab">
              <FileOutlined className="gba:mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" data-testid="overview-content">
            <div className="gba:grid gba:grid-cols-8 gba:gap-6 gba:mb-6">
              <div className="gba:col-span-4 gba:flex">
                <CompanyInformation opportunity={opportunity} opportunityData={opportunityData} />
              </div>

              <div className="gba:col-span-2 gba:flex">
                <ContactInformation opportunityData={opportunityData} opportunityId={opportunityId} context={props} />
              </div>

              <div className="gba:col-span-2 gba:flex">
                <OpportunityDetails
                  opportunityData={opportunityData}
                  stageConditionStatuses={stageConditionStatuses}
                  context={props}
                />
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-6">
              <div>
                <ActivityTimeline opportunityId={opportunityId} context={props} />
              </div>

              <div>
                <TasksSection opportunityId={opportunityId} context={props} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" data-testid="documents-content">
            <OpportunityDocuments opportunityId={opportunityId} context={props} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

interface OpportunityRecordProps extends BusinessAppContextProps {
  opportunityId?: string
  source?: string
  onBack?: () => void
}

const OpportunityRecord: React.FC<OpportunityRecordProps> = props => {
  const urlParams = new URLSearchParams(window.location.search)
  const opportunityId = props.opportunityId || urlParams.get('opportunityId') || urlParams.get('id')

  const source = props.source || urlParams.get('source')

  const fromEntity = urlParams.get('fromEntity')

  const getBackButtonText = () => {
    switch (fromEntity) {
      case 'leads':
        return 'Back to Leads'
      case 'accounts':
        return 'Back to Accounts'
      case 'contacts':
        return 'Back to Contacts'
      case 'salesPerformance':
        return 'Back to Sales Performance'
      default:
        return 'Back to Opportunities'
    }
  }

  const handleBack = () => {
    if (props.onBack) {
      props.onBack()
    } else {
      // Navigate back based on fromEntity first, then source
      switch (fromEntity) {
        case 'salesPerformance':
          // Check if there's an employee ID to navigate back to specific employee performance
          const employeeId = urlParams.get('employeeId')
          const salesPerformanceUrl = employeeId
            ? `/platform/crm/sales-performance?employeeId=${employeeId}`
            : '/platform/crm/sales-performance'
          navigateTo(salesPerformanceUrl)
          break
        default:
          // Default back navigation based on source
          switch (source) {
            case 'investments':
              navigateTo('/platform/irm/investment-relations?view=opportunities')
              break
            case 'customer-relations':
            default:
              navigateTo('/platform/crm/customer-relations?view=opportunities')
              break
          }
          break
      }
    }
  }

  if (!opportunityId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">No opportunity ID provided</p>
          <p className="gba:text-gray-500 gba:mb-4">Please provide an opportunity ID via props or URL parameter</p>
          <button
            onClick={handleBack}
            className="gba:mt-4 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-hsl(var(--background)) gba:rounded"
          >
            {getBackButtonText()}
          </button>
        </div>
      </div>
    )
  }

  return (
    <OpportunityRecordContent
      {...props}
      opportunityId={opportunityId}
      onBack={handleBack}
      getBackButtonText={getBackButtonText}
      fromEntity={fromEntity}
    />
  )
}

export { OpportunityRecord, OpportunityRecordContent }

export default OpportunityRecord
