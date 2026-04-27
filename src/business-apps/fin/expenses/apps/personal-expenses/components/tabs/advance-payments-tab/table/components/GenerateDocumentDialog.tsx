import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GenerateDocumentDialog as OfficeGenerateDocumentDialog } from '@/business-apps/core/office/apps/documents/components'
import { DocumentApiService } from '@/business-apps/core/office/apps/documents/services/DocumentApiService'
import { exportToWord } from '@/business-apps/core/office/apps/documents/utils/exportUtils'
import { toast } from 'sonner'
import type { AdvancePayment } from '../../../../../hooks/useGetAdvancePayments'
import { ADVANCE_PAYMENTS_TABLE_DATA_TEST_ID } from '../columns/advancePaymentColumns'
import {
  buildAdvancePaymentDocumentEntityMap,
  type AdvancePaymentApproverContext
} from '../../utils/advancePaymentDocumentEntityMap'

export interface AdvancePaymentGenerateDocumentDialogProps {
  open: boolean
  record: AdvancePayment | null
  accessToken: string | undefined
  onOpenChange: (open: boolean) => void
}

export function AdvancePaymentGenerateDocumentDialog({
  open,
  record,
  accessToken,
  onOpenChange
}: Readonly<AdvancePaymentGenerateDocumentDialogProps>) {
  const graphqlClient = useGraphQLClient(accessToken)

  const [approverData, setApproverData] = useState<AdvancePaymentApproverContext>({})
  const [supervisorName, setSupervisorName] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (accessToken) {
      DocumentApiService.setAccessToken(accessToken)
    }
  }, [accessToken])

  const fetchApprovalComment = useCallback(
    async (
      entityId: string,
      entityType: 'ExpensePlan' | 'AdvancePayment'
    ): Promise<{
      approver?: string
      date?: string
    }> => {
      const commentEntity = `${entityType}Comment`
      const idField = entityType === 'ExpensePlan' ? 'expensePlanId' : 'advancePaymentId'

      try {
        const approveQuery = `
          query Get${commentEntity}Approval($entityId: uuid!) {
            ${commentEntity}(
              where: { 
                ${idField}: { _eq: $entityId }
                commentType: { _eq: "APPROVE_COMMENT" }
              }
              orderBy: { commentDate: DESC }
              limit: 1
            ) {
              authorEmployee {
                fullName
                firstName
                lastName
              }
              commentDate
            }
          }
        `
        const approveResult = await graphqlClient.request<{
          [key: string]: Array<{
            authorEmployee: { fullName?: string; firstName?: string; lastName?: string }
            commentDate?: string
          }>
        }>(approveQuery, { entityId })

        let comment = approveResult?.[commentEntity]?.[0]

        if (!comment && entityType === 'ExpensePlan') {
          const systemQuery = `
            query Get${commentEntity}System($entityId: uuid!) {
              ${commentEntity}(
                where: { 
                  ${idField}: { _eq: $entityId }
                  commentType: { _eq: "SYSTEM_COMMENT" }
                  comment: { _ilike: "%to: APPROVED%" }
                }
                orderBy: { commentDate: DESC }
                limit: 1
              ) {
                authorEmployee {
                  fullName
                  firstName
                  lastName
                }
                commentDate
              }
            }
          `
          const systemResult = await graphqlClient.request<{
            [key: string]: Array<{
              authorEmployee: { fullName?: string; firstName?: string; lastName?: string }
              commentDate?: string
            }>
          }>(systemQuery, { entityId })

          comment = systemResult?.[commentEntity]?.[0]
        }

        if (comment) {
          const author = comment.authorEmployee
          const approver = author
            ? author.fullName || `${author.firstName || ''} ${author.lastName || ''}`.trim()
            : undefined
          return { approver, date: comment.commentDate }
        }
      } catch (error) {
        console.error(`Error fetching ${entityType} approval:`, error)
      }

      return {}
    },
    [graphqlClient]
  )

  useEffect(() => {
    if (!open || !record || !accessToken) {
      setApproverData({})
      setSupervisorName(undefined)
      return
    }

    const fetchApprovalData = async () => {
      try {
        const plan = record.expensePlan
        const planId = plan?.id
        const advPaymentId = record.id
        const employeeId = plan?.employee?.id

        const expensePlanApproval = planId ? await fetchApprovalComment(planId, 'ExpensePlan') : {}

        let advancePaymentApproval = advPaymentId ? await fetchApprovalComment(advPaymentId, 'AdvancePayment') : {}

        if (!advancePaymentApproval.approver) {
          advancePaymentApproval = expensePlanApproval
        }

        setApproverData({
          expensePlanApprover: expensePlanApproval.approver,
          advancePaymentApprover: advancePaymentApproval.approver,
          expensePlanApprovalDate: expensePlanApproval.date,
          advancePaymentApprovalDate: advancePaymentApproval.date
        })

        if (employeeId) {
          const employeeQuery = `
            query GetEmployeeSupervisor($employeeId: uuid!) {
              Employee(where: { id: { _eq: $employeeId } }) {
                employeePosition {
                  supervisorEmployeeId
                }
              }
            }
          `
          const employeeResult = await graphqlClient.request<{
            Employee: Array<{ employeePosition?: { supervisorEmployeeId?: string } }>
          }>(employeeQuery, { employeeId })

          const supervisorId = employeeResult?.Employee?.[0]?.employeePosition?.supervisorEmployeeId
          if (supervisorId) {
            const supervisorQuery = `
              query GetSupervisor($supervisorId: uuid!) {
                Employee(where: { id: { _eq: $supervisorId } }) {
                  fullName
                  firstName
                  lastName
                }
              }
            `
            const supervisorResult = await graphqlClient.request<{
              Employee: Array<{ fullName?: string; firstName?: string; lastName?: string }>
            }>(supervisorQuery, { supervisorId })

            const supervisor = supervisorResult?.Employee?.[0]
            if (supervisor) {
              const name = supervisor.fullName || `${supervisor.firstName || ''} ${supervisor.lastName || ''}`.trim()
              setSupervisorName(name)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching approval data:', error)
        setApproverData({})
        setSupervisorName(undefined)
      }
    }

    fetchApprovalData()
  }, [open, record, accessToken, graphqlClient, fetchApprovalComment])

  const entityDataMap = useMemo(() => {
    if (!record) return {}
    return buildAdvancePaymentDocumentEntityMap(record, approverData, supervisorName)
  }, [record, approverData, supervisorName])

  const defaultTitle = record?.expensePlan?.title || record?.expensePlan?.code || record?.code || 'Advance payment'

  const handleSuccess = async (documentId: string) => {
    if (!accessToken) return
    DocumentApiService.setAccessToken(accessToken)
    try {
      const doc = await DocumentApiService.getDocument(documentId, accessToken)
      if (doc?.content != null) {
        await exportToWord(doc.title || 'Document', doc.content)
        toast.success('Document downloaded')
      }
    } catch (err) {
      console.error('Failed to download document:', err)
      toast.error('Failed to download document')
    }
  }

  return (
    <OfficeGenerateDocumentDialog
      open={open}
      accessToken={accessToken}
      onOpenChange={onOpenChange}
      entityDataMap={entityDataMap}
      defaultTitle={defaultTitle}
      onSuccess={handleSuccess}
      data-testid={`${ADVANCE_PAYMENTS_TABLE_DATA_TEST_ID}-generate-document-dialog`}
    />
  )
}
