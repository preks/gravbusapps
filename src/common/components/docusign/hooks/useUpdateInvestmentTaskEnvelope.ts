import { useCallback } from 'react'
import { env } from '@/common/env/EnvUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildInvestmentTaskPayload,
  InvestmentTaskFormData
} from '@/common/data/investment/payloads/investmentRelationPayloads'
import { getPlatformContext } from '@/common/utils/windowUtils'

export interface UpdateInvestmentTaskEnvelopeArgs {
  taskId: string
  task: InvestmentTaskFormData
  documentId: string
  envelopeId: string
  envelopeMode?: 'embedded' | 'email'
}

export const useUpdateInvestmentTaskEnvelope = (context?: BusinessAppContextProps) => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const getProcessContext = () => {
    const platformContext = getPlatformContext()
    const employeeId = context?.userInfo?.employeeDetails?.employeeId || platformContext.employeeId || ''
    const managerId =
      context?.userInfo?.employeeDetails?.supervisor?.id ||
      platformContext.managerId ||
      platformContext.employeeDetails?.managerId ||
      ''
    const structureId = platformContext.structureId || ''
    const locationId = platformContext.locationId || ''
    const organizationalUnitId =
      context?.userInfo?.employeeDetails?.organizationalUnit?.id || platformContext.organizationalUnitId || ''
    const userId = context?.userInfo?.id || platformContext.userId || ''

    return {
      employeeId,
      managerId,
      structureId,
      locationId,
      organizationalUnitId,
      employeeDetails: {
        userId
      },
      userId
    }
  }

  const saveEnvelopeId = useCallback(
    async ({ taskId, task, documentId, envelopeId, envelopeMode = 'embedded' }: UpdateInvestmentTaskEnvelopeArgs) => {
      if (!context?.accessToken) {
        throw new Error('Missing access token')
      }

      const payload = buildInvestmentTaskPayload(task, context, { isUpdate: true })
      payload.investmentTask.id = taskId

      const processContext = getProcessContext()

      const requestBody = {
        ...processContext,
        opportunityId: task.opportunity?.id || (context?.additionalData as any)?.opportunityId || '',
        taskId,
        investmentTask: {
          ...payload.investmentTask,
          documents: (payload.investmentTask.documents || []).map((doc: any) =>
            doc.id === documentId
              ? {
                  ...doc,
                  fileInfo: {
                    ...(doc.fileInfo || {}),
                    docusignEnvelopeId: envelopeId,
                    docusignEnvelopeMode: envelopeMode
                  }
                }
              : doc
          )
        }
      }

      await restClient.post('/investment-relations/updateInvestmentTask', requestBody, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      })
    },
    [context, restClient]
  )

  return { saveEnvelopeId }
}

export default useUpdateInvestmentTaskEnvelope
