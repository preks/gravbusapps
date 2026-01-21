import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, PageLayout, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { createConductorWorkflowEngine } from '../../services'
import type { FlowTemplate, WorkflowEngine } from '../../types'
import { transformTemplate } from '../../utils/templateTransformUtils'
import { WarrantyServiceRequestForm } from './components/WarrantyServiceRequestForm'

export interface WarrantyServiceProps extends BusinessAppContextProps {
  workflowEngine?: WorkflowEngine
}

const TEMPLATE_ID = 'flow_serviceiq'

export const WarrantyService: React.FC<WarrantyServiceProps> = ({ workflowEngine, ...contextProps }) => {
  const accessToken = contextProps.accessToken
  const userInfo = contextProps.userInfo

  // Guard against render loops / dynamic loader re-renders.
  // We only want to fetch the template once per (templateId, accessToken) unless forced via "Retry".
  const loadedKeyRef = useRef<string | null>(null)

  const activeWorkflowEngine = useMemo<WorkflowEngine>(() => {
    if (workflowEngine) return workflowEngine
    // Avoid dependency loops: only re-create when auth/user changes (not on every render).
    return createConductorWorkflowEngine({ accessToken, userInfo })
  }, [workflowEngine, accessToken, userInfo?.id])

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [flowTemplate, setFlowTemplate] = useState<FlowTemplate | null>(null)
  const [createdFlowId, setCreatedFlowId] = useState<string | null>(null)

  const loadTemplate = useCallback(async (force?: boolean): Promise<void> => {
    if (!accessToken) {
      setIsLoading(false)
      setError('Access token missing. Please sign in again.')
      return
    }

    const key = `${TEMPLATE_ID}:${accessToken}`
    if (!force && loadedKeyRef.current === key) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const engineWithTemplates = activeWorkflowEngine as WorkflowEngine & {
        getTemplateById?: (templateId: string) => Promise<any>
      }

      if (typeof engineWithTemplates.getTemplateById !== 'function') {
        setError('Workflow engine does not support loading templates.')
        return
      }

      const template = await engineWithTemplates.getTemplateById(TEMPLATE_ID)
      const transformed = transformTemplate(template)
      setFlowTemplate(transformed)
      loadedKeyRef.current = key
    } catch (e) {
      console.error('[WarrantyService] Failed to load template', e)
      setError('Failed to load the warranty service template.')
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkflowEngine, accessToken])

  useEffect(() => {
    loadTemplate(false)
  }, [loadTemplate])

  const handleSuccess = useCallback((flowId: string) => {
    setCreatedFlowId(flowId)
  }, [])

  const handleRestart = useCallback(() => {
    setCreatedFlowId(null)
  }, [])

  return (
    <div data-testid="warranty-service-container" className="gba:p-4 gba:bg-background">
      <PageLayout
        headerTitle="Warranty Service"
        headerDescription="Submit a repair order and start the warranty workflow."
        sectionTitle="Submit Repair Order"
        sectionDescription="Fill out the required details and submit to start the workflow."
      >
        {isLoading && (
          <div className="gba:flex gba:items-center gba:justify-center gba:min-h-60">
            <Spinner size="lg" />
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="destructive" className="gba:mb-4" data-testid="warranty-service-error">
            <div className="gba:flex gba:flex-col gba:gap-2">
              <div className="gba:font-semibold">Something went wrong</div>
              <div className="gba:text-sm">{error}</div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => loadTemplate(true)}
                  data-testid="warranty-service-retry"
                >
                  Retry
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {!isLoading && !error && createdFlowId && (
          <Card className="gba:p-6" data-testid="warranty-service-success">
            <div className="gba:flex gba:flex-col gba:gap-4">
              <div className="gba:text-lg gba:font-semibold">Success</div>
              <div className="gba:text-sm gba:text-muted-foreground">
                Your warranty workflow was started successfully.
              </div>
              <div className="gba:text-sm">
                <span className="gba:font-semibold">Flow ID:</span> {createdFlowId}
              </div>
              <div className="gba:flex gba:gap-3">
                <Button type="button" onClick={handleRestart} data-testid="warranty-service-new-request">
                  Create another request
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!isLoading && !error && !createdFlowId && flowTemplate && (
          <WarrantyServiceRequestForm
            flowTemplate={flowTemplate}
            workflowEngine={activeWorkflowEngine}
            templateId={TEMPLATE_ID}
            onSuccess={handleSuccess}
            {...contextProps}
          />
        )}
      </PageLayout>
    </div>
  )
}

