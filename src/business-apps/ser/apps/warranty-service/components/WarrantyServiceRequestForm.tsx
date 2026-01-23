import React, { useCallback, useState } from 'react'
import { Alert, Card } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { DynamicFormField, FlowTemplate, WorkflowEngine } from '../../../types'
import WebcamUserIdScanner from '@/business-apps/ser/apps/service-desk/components/webcam-scanner/WebcamUserIdScanner'

export interface WarrantyServiceRequestFormProps extends BusinessAppContextProps {
  flowTemplate: FlowTemplate
  workflowEngine: WorkflowEngine
  templateId: string
  onSuccess: (flowId: string) => void
}

type FormValues = Record<string, string>

// legacy no-op (removed)
// const isEmpty = (_value: unknown): boolean => false

const getInitialValues = (fields: DynamicFormField[] | undefined): FormValues => {
  const initial: FormValues = {}
  ;(fields || []).forEach(field => {
    if (typeof field.name === 'string' && field.name.length > 0) {
      initial[field.name] = ''
    }
  })
  return initial
}

export const WarrantyServiceRequestForm: React.FC<WarrantyServiceRequestFormProps> = ({
  flowTemplate,
  workflowEngine,
  templateId,
  onSuccess,
  ...contextProps
}) => {
  const fields = flowTemplate.formSchema || []

  const [values] = useState<FormValues>(() => getInitialValues(fields))
  const [error, setError] = useState<string | null>(null)

  // legacy values removed

  // Remove unused form handlers after switching to scanner UI

  // Scanner-driven UI; leverage the same submit path as handleSubmit
  const handleScannerSubmit = useCallback(
    async (formData: any) => {
      setError(null)

      if (!contextProps.accessToken) {
        setError('Access token missing. Please sign in again.')
        return
      }
      if (!contextProps.userInfo?.id) {
        setError('User information missing. Please sign in again.')
        return
      }

      const engineWithExecute = workflowEngine as WorkflowEngine & {
        executeTemplate?: (id: string, data: any) => Promise<string>
      }

      if (typeof engineWithExecute.executeTemplate !== 'function') {
        setError('Workflow engine does not support template execution.')
        return
      }

      try {
        const payload = {
          ...(values || {}),
          ...(formData || {}),
          clientId: '0408531617',
          stepAssignments: { step_0: contextProps.userInfo.id },
          step_0_assignmentMode: 'ASSIGN',
          step_0_allowReassignment: true
        }

        const flowId = await engineWithExecute.executeTemplate(templateId, payload)
        onSuccess(flowId)
      } catch (err) {
        console.error('[WarrantyServiceRequestForm] Scanner submit failed', err)
        setError('Failed to submit warranty request.')
      } finally {
        // no-op
      }
    },
    [contextProps.accessToken, contextProps.userInfo?.id, onSuccess, templateId, values, workflowEngine]
  )

  return (
    <Card className="gba:p-6" data-testid="warranty-service-form-card">
      {error && (
        <Alert variant="destructive" className="gba:mb-4" data-testid="warranty-service-form-error">
          {error}
        </Alert>
      )}
      <WebcamUserIdScanner
        userInfo={contextProps.userInfo}
        accessToken={contextProps.accessToken}
        onFormSubmitOverride={handleScannerSubmit}
      />
    </Card>
  )
}
