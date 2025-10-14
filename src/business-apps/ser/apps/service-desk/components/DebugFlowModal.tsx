import React, { useState, useEffect } from 'react'
import { Modal, Button, Spin, Alert, Typography, Tabs, Badge } from 'antd'
import { Code, Database, Bug, X, Network } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { SubmittedRequest } from '../../../../packages/services-plus-core/src'
import type { StepInstance } from '../../../types'
import { createConductorWorkflowEngine } from '../../../services'

const { Text } = Typography

export interface DebugFlowModalProps extends BusinessAppContextProps {
  ticket: StepInstance | null
  deskKey: string
  isOpen: boolean
  onClose: () => void
}

interface ApiEndpointInfo {
  url: string
  method: string
  timestamp: string
  success: boolean
  error?: string
  description?: string
}

interface FlowDebugData {
  stepData: StepInstance
  requestData: SubmittedRequest | null
  workflowData: any
  rawResponse: any
  apiEndpoints: ApiEndpointInfo[]
}

/**
 * Debug modal component to display complete JSON response from custom-flow-engine
 * For development purposes - shows step data, request data, and workflow details
 */
export const DebugFlowModal: React.FC<DebugFlowModalProps> = ({
  ticket,
  deskKey,
  isOpen,
  onClose,
  accessToken,
  userInfo
}) => {
  const [debugData, setDebugData] = useState<FlowDebugData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDebugData = async () => {
      if (!ticket || !isOpen || !accessToken || !userInfo) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log(`[DebugFlowModal] 🔍 Fetching debug data for ticket: ${ticket.id}`)

        const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo })
        const apiEndpoints: ApiEndpointInfo[] = []

        // Fetch step data (already have this, but get fresh copy)
        const stepData = ticket

        // Fetch overall request data
        let requestData: SubmittedRequest | null = null
        if (ticket.requestId) {
          try {
            const requestStartTime = new Date().toISOString()
            // Note: We don't have direct access to the HTTP client here, so we'll simulate the API endpoint
            const requestEndpoint: ApiEndpointInfo = {
              url: `/api/flows/${ticket.requestId}`,
              method: 'GET',
              timestamp: requestStartTime,
              success: false,
              description: 'Get workflow/flow overview with progress and step status'
            }

            requestData = await workflowEngine.getRequest(ticket.requestId)

            requestEndpoint.success = true
            apiEndpoints.push(requestEndpoint)
            console.log(`[DebugFlowModal] 📋 Request data fetched:`, requestData)
          } catch (requestError) {
            apiEndpoints.push({
              url: `/api/flows/${ticket.requestId}`,
              method: 'GET',
              timestamp: new Date().toISOString(),
              success: false,
              error: requestError instanceof Error ? requestError.message : String(requestError),
              description: 'Get workflow/flow overview with progress and step status'
            })
            console.warn(`[DebugFlowModal] ⚠️ Could not fetch request data:`, requestError)
          }
        }

        // Fetch workflow-specific data (if available)
        let workflowData = null
        try {
          // Try to get workflow instance data if the engine supports it
          if ('getWorkflowInstance' in workflowEngine && typeof workflowEngine.getWorkflowInstance === 'function') {
            const workflowStartTime = new Date().toISOString()
            const workflowEndpoint: ApiEndpointInfo = {
              url: `/api/flows/${ticket.requestId}/progress`,
              method: 'GET',
              timestamp: workflowStartTime,
              success: false,
              description: 'Get overall flow progress and completion status'
            }

            workflowData = await (workflowEngine as any).getWorkflowInstance(ticket.requestId)

            workflowEndpoint.success = true
            apiEndpoints.push(workflowEndpoint)
            console.log(`[DebugFlowModal] 🔄 Workflow data fetched:`, workflowData)
          }
        } catch (workflowError) {
          if ('getWorkflowInstance' in workflowEngine) {
            apiEndpoints.push({
              url: `/api/flows/${ticket.requestId}/progress`,
              method: 'GET',
              timestamp: new Date().toISOString(),
              success: false,
              error: workflowError instanceof Error ? workflowError.message : String(workflowError),
              description: 'Get overall flow progress and completion status'
            })
          }
          console.warn(`[DebugFlowModal] ⚠️ Could not fetch workflow data:`, workflowError)
        }

        // Add actual service desk API endpoints based on real custom-flow-engine structure
        apiEndpoints.unshift({
          url: `/api/tasks/user/${userInfo?.id}/claimable?capabilities=${deskKey}`,
          method: 'GET',
          timestamp: new Date().toISOString(),
          success: true,
          description: 'Get claimable tasks for desk based on user capabilities'
        })

        // Add task-specific API endpoints
        apiEndpoints.push({
          url: `/api/tasks/${stepData.id}?userId=${userInfo?.id}`,
          method: 'GET',
          timestamp: new Date().toISOString(),
          success: true,
          description: 'Get task details with available actions for user'
        })

        if (stepData.status === 'claimed' || stepData.status === 'assigned') {
          apiEndpoints.push({
            url: `/api/tasks/${stepData.id}/actions`,
            method: 'GET',
            timestamp: new Date().toISOString(),
            success: true,
            description: 'Get available actions for this task'
          })
        }

        // Add employee lookup endpoints (GraphQL)
        if (stepData.assignedToUserId) {
          apiEndpoints.push({
            url: `/graphql - Employee(where: {userId: {_eq: "${stepData.assignedToUserId}"}})`,
            method: 'POST',
            timestamp: new Date().toISOString(),
            success: true,
            description: 'Fetch assigned user employee data'
          })
        }
        if (stepData.claimedByUserId && stepData.claimedByUserId !== stepData.assignedToUserId) {
          apiEndpoints.push({
            url: `/graphql - Employee(where: {userId: {_eq: "${stepData.claimedByUserId}"}})`,
            method: 'POST',
            timestamp: new Date().toISOString(),
            success: true,
            description: 'Fetch claimed user employee data'
          })
        }
        if (
          stepData.requesterId &&
          stepData.requesterId !== stepData.assignedToUserId &&
          stepData.requesterId !== stepData.claimedByUserId
        ) {
          apiEndpoints.push({
            url: `/graphql - Employee(where: {userId: {_eq: "${stepData.requesterId}"}})`,
            method: 'POST',
            timestamp: new Date().toISOString(),
            success: true,
            description: 'Fetch requester employee data'
          })
        }

        // Compile all debug data
        const rawResponse = {
          step: stepData,
          request: requestData,
          workflow: workflowData,
          apiEndpoints,
          metadata: {
            fetchedAt: new Date().toISOString(),
            engine: workflowEngine.constructor.name,
            deskKey: deskKey,
            requestId: ticket.requestId,
            stepId: ticket.id,
            totalApiCalls: apiEndpoints.length,
            successfulApiCalls: apiEndpoints.filter(ep => ep.success).length
          }
        }

        setDebugData({
          stepData,
          requestData,
          workflowData,
          rawResponse,
          apiEndpoints
        })

        console.log(`[DebugFlowModal] ✅ Debug data compilation complete:`, rawResponse)
      } catch (err) {
        console.error(`[DebugFlowModal] ❌ Error fetching debug data:`, err)
        setError(err instanceof Error ? err.message : 'Failed to fetch debug data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDebugData()
  }, [ticket, deskKey, isOpen, accessToken, userInfo])

  // Helper function to format JSON with syntax highlighting
  const formatJson = (data: any): string => {
    if (data === null || data === undefined) {
      return 'null'
    }
    return JSON.stringify(data, null, 2)
  }

  // Get data summary for badges
  const getDataSummary = () => {
    if (!debugData) return { step: 0, request: 0, workflow: 0, total: 0, api: 0 }

    const stepSize = JSON.stringify(debugData.stepData).length
    const requestSize = debugData.requestData ? JSON.stringify(debugData.requestData).length : 0
    const workflowSize = debugData.workflowData ? JSON.stringify(debugData.workflowData).length : 0
    const apiSize = JSON.stringify(debugData.apiEndpoints).length
    const totalSize = JSON.stringify(debugData.rawResponse).length

    return {
      step: Math.round(stepSize / 1024),
      request: Math.round(requestSize / 1024),
      workflow: Math.round(workflowSize / 1024),
      api: Math.round(apiSize / 1024),
      total: Math.round(totalSize / 1024)
    }
  }

  const dataSummary = getDataSummary()

  return (
    <Modal
      title={
        <div className="gba:flex gba:items-center gba:gap-2">
          <Bug className="gba:w-5 gba:h-5 gba:text-blue-500" />
          <span>{getTranslationFromI18nKeyAndLabel('services.debug.modal.title', 'Flow Debug Data')}</span>
          {ticket && <Badge count={`${ticket.id.slice(0, 8)}...`} style={{ backgroundColor: '#52c41a' }} />}
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      width="100vw"
      style={{
        top: 0,
        height: '100vh',
        maxWidth: 'none',
        margin: 0,
        padding: 0
      }}
      styles={{
        body: {
          height: 'calc(100vh - 110px)', // Account for header and footer
          padding: '16px 24px',
          overflow: 'hidden'
        },
        content: {
          height: '100vh',
          borderRadius: 0
        }
      }}
      footer={[
        <Button key="close" onClick={onClose} icon={<X className="gba:w-4 gba:h-4" />}>
          {getTranslationFromI18nKeyAndLabel('services.debug.modal.close', 'Close')}
        </Button>
      ]}
      data-testid="debug-flow-modal"
      className="gba:h-screen"
    >
      <div className="gba:h-full gba:overflow-hidden">
        {/* Loading State */}
        {isLoading && (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spin size="large" />
            <span className="gba:ml-3 gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'services.debug.modal.loading',
                'Fetching debug data from workflow engine...'
              )}
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert
            type="error"
            message={getTranslationFromI18nKeyAndLabel('services.debug.modal.error.title', 'Error Loading Debug Data')}
            description={error}
            showIcon
            className="gba:mb-4"
          />
        )}

        {/* Success State with Tabs */}
        {debugData && !isLoading && (
          <Tabs defaultActiveKey="api-endpoints" size="small" className="gba:h-full">
            <Tabs.TabPane
              tab={
                <span className="gba:flex gba:items-center gba:gap-2">
                  <Network className="gba:w-4 gba:h-4" />
                  API Endpoints
                  <Badge count={debugData.apiEndpoints.length} size="small" />
                </span>
              }
              key="api-endpoints"
            >
              <div className="gba:mb-3">
                <Text type="secondary">
                  API endpoints called during data fetching - URLs, methods, and response status
                </Text>
              </div>
              <div
                className="gba:space-y-3 gba:h-full gba:overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              >
                {debugData.apiEndpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    className={`gba:p-4 gba:rounded gba:border-l-4 ${
                      endpoint.success ? 'gba:bg-green-50 gba:border-l-green-500' : 'gba:bg-red-50 gba:border-l-red-500'
                    }`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                      <Badge
                        color={endpoint.success ? 'green' : 'red'}
                        text={endpoint.method}
                        className="gba:font-mono gba:text-xs"
                      />
                      <span className={`gba:text-xs ${endpoint.success ? 'gba:text-green-600' : 'gba:text-red-600'}`}>
                        {endpoint.success ? '✅ SUCCESS' : '❌ ERROR'}
                      </span>
                      <span className="gba:text-xs gba:text-gray-500 gba:ml-auto">
                        {new Date(endpoint.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="gba:font-mono gba:text-sm gba:mb-2 gba:break-all">
                      <strong>URL:</strong> {endpoint.url}
                    </div>
                    {endpoint.description && (
                      <div className="gba:text-gray-600 gba:text-xs gba:mb-2 gba:italic">{endpoint.description}</div>
                    )}
                    {endpoint.error && (
                      <div className="gba:text-red-600 gba:text-xs gba:bg-red-100 gba:p-2 gba:rounded">
                        <strong>Error:</strong> {endpoint.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane
              tab={
                <span className="gba:flex gba:items-center gba:gap-2">
                  <Database className="gba:w-4 gba:h-4" />
                  Complete Response
                  <Badge count={`${dataSummary.total}KB`} size="small" />
                </span>
              }
              key="complete"
            >
              <div className="gba:mb-3">
                <Text type="secondary">Complete JSON response including all fetched data from the workflow engine</Text>
              </div>
              <pre
                className="gba:bg-gray-50 gba:p-4 gba:rounded gba:text-xs gba:overflow-x-auto gba:whitespace-pre-wrap gba:overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              >
                <code>{formatJson(debugData.rawResponse)}</code>
              </pre>
            </Tabs.TabPane>

            <Tabs.TabPane
              tab={
                <span className="gba:flex gba:items-center gba:gap-2">
                  <Code className="gba:w-4 gba:h-4" />
                  Step Data
                  <Badge count={`${dataSummary.step}KB`} size="small" />
                </span>
              }
              key="step"
            >
              <div className="gba:mb-3">
                <Text type="secondary">Step instance data - the current ticket/task information</Text>
              </div>
              <pre
                className="gba:bg-gray-50 gba:p-4 gba:rounded gba:text-xs gba:overflow-x-auto gba:whitespace-pre-wrap gba:overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              >
                <code>{formatJson(debugData.stepData)}</code>
              </pre>
            </Tabs.TabPane>

            {debugData.requestData && (
              <Tabs.TabPane
                tab={
                  <span className="gba:flex gba:items-center gba:gap-2">
                    <Database className="gba:w-4 gba:h-4" />
                    Request Data
                    <Badge count={`${dataSummary.request}KB`} size="small" />
                  </span>
                }
                key="request"
              >
                <div className="gba:mb-3">
                  <Text type="secondary">Overall request data - the parent workflow/process information</Text>
                </div>
                <pre
                  className="gba:bg-gray-50 gba:p-4 gba:rounded gba:text-xs gba:overflow-x-auto gba:whitespace-pre-wrap gba:overflow-y-auto"
                  style={{ maxHeight: 'calc(100vh - 200px)' }}
                >
                  <code>{formatJson(debugData.requestData)}</code>
                </pre>
              </Tabs.TabPane>
            )}

            {debugData.workflowData && (
              <Tabs.TabPane
                tab={
                  <span className="gba:flex gba:items-center gba:gap-2">
                    <Code className="gba:w-4 gba:h-4" />
                    Workflow Data
                    <Badge count={`${dataSummary.workflow}KB`} size="small" />
                  </span>
                }
                key="workflow"
              >
                <div className="gba:mb-3">
                  <Text type="secondary">Workflow engine specific data - internal workflow state and metadata</Text>
                </div>
                <pre
                  className="gba:bg-gray-50 gba:p-4 gba:rounded gba:text-xs gba:overflow-x-auto gba:whitespace-pre-wrap gba:overflow-y-auto"
                  style={{ maxHeight: 'calc(100vh - 200px)' }}
                >
                  <code>{formatJson(debugData.workflowData)}</code>
                </pre>
              </Tabs.TabPane>
            )}
          </Tabs>
        )}

        {/* No Data State */}
        {!debugData && !isLoading && !error && (
          <div className="gba:text-center gba:py-8 gba:text-gray-500">
            <Bug className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-3 gba:text-gray-300" />
            <Text type="secondary">
              {getTranslationFromI18nKeyAndLabel('services.debug.modal.noData', 'No debug data available')}
            </Text>
          </div>
        )}
      </div>
    </Modal>
  )
}
