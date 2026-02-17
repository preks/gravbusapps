import React from 'react'
import { Task, TaskDocument } from '../types'
import { useEnvelopeStatusCache } from '@/common/components/docusign/hooks/useEnvelopeStatusCache'
import { getDocuSignButtonState } from '@/common/components/docusign/utils/docuSignTaskUtils'
import { useDocuSign } from '@/common/integrations/docusign/useDocuSign'

export interface DocumentWithStatus extends TaskDocument {
  envelopeId?: string
  envelopeStatus?: string
}

/**
 * useDocuSignIntegration - Custom hook for managing DocuSign integration
 * Handles envelope status tracking, document status mapping, modal state, and authentication
 *
 * @param task - Task object with documents
 * @param accessToken - Access token for API calls
 * @param isAssignee - Whether current user is the task assignee
 * @returns DocuSign integration state and handlers
 */
export const useDocuSignIntegration = (task: Task, accessToken?: string, isAssignee?: boolean) => {
  const { statusMap, ensureStatus, statusVersion } = useEnvelopeStatusCache(accessToken)
  const { checkAuth } = useDocuSign(accessToken)

  const [isDocuSignOpen, setIsDocuSignOpen] = React.useState(false)
  const [focusReferral, setFocusReferral] = React.useState(false)
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null)

  // Map documents with their envelope status
  const documentsWithStatus = React.useMemo(() => {
    return (task.documents || []).map(doc => {
      const envelopeId = (doc.fileInfo as any)?.docusignEnvelopeId
      const envelopeStatus = envelopeId ? statusMap[envelopeId]?.status?.toLowerCase() : undefined
      return {
        ...doc,
        envelopeId,
        envelopeStatus
      }
    })
  }, [task.documents, statusMap, statusVersion])

  // Check DocuSign authentication status
  React.useEffect(() => {
    checkAuth()
      .then(result => {
        setIsAuthenticated(result.authenticated)
      })
      .catch(() => {
        setIsAuthenticated(false)
      })
  }, [checkAuth])

  // Ensure all envelope statuses are loaded
  React.useEffect(() => {
    documentsWithStatus.forEach(doc => {
      if (doc.envelopeId) {
        ensureStatus(doc.envelopeId)
      }
    })
  }, [documentsWithStatus, ensureStatus])

  // Compute button state
  const { hasSignableDocs, label: docuSignButtonLabel } = React.useMemo(
    () => getDocuSignButtonState(documentsWithStatus, isAssignee),
    [documentsWithStatus, isAssignee]
  )

  // Check envelope status helper
  const checkEnvelopeStatus = async (envelopeId: string) => {
    try {
      await ensureStatus(envelopeId)
    } catch {
      // Ignore errors
    }
  }

  // Open modal helper
  const openDocuSignModal = React.useCallback((options?: { focusReferral?: boolean }) => {
    setFocusReferral(Boolean(options?.focusReferral))
    setIsDocuSignOpen(true)
  }, [])

  return {
    documentsWithStatus,
    isDocuSignOpen,
    setIsDocuSignOpen,
    focusReferral,
    setFocusReferral,
    hasSignableDocs,
    docuSignButtonLabel,
    checkEnvelopeStatus,
    openDocuSignModal,
    statusMap,
    isDocuSignAuthenticated: isAuthenticated,
    isCheckingAuth: isAuthenticated === null
  }
}
