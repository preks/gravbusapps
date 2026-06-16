'use client'

import React from 'react'
import { ScrollArea } from '@newwork/nw-design-system'
import { Task, TaskReference, TaskDocument } from './types'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import { handleDocumentClick as handleDocumentClickUtil } from '@/common/utils/documentClickHandler'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocuSignSignatureModal } from '@/common/components/docusign/DocuSignSignatureModal'
import { DigitalReferralBanner } from '@/common/components/docusign/DigitalReferralBanner'
import { buildInvestmentTaskFormDataFromTask } from '@/common/components/docusign/utils/investmentTaskMapper'
import { useDocuSignIntegration } from './hooks/useDocuSignIntegration'
import { TaskDetailsCard } from './components/TaskDetailsCard'
import { TaskDocumentsCard } from './components/TaskDocumentsCard'
import { TaskInstancesCard } from './components/TaskInstancesCard'
import { TaskAssigneesCard } from './components/TaskAssigneesCard'

const DATA_TEST_ID_PREFIX = 'TaskDetailSheet'

export interface TaskDetailContentProps {
  task: Task
  buildReferenceUrl?: (reference: TaskReference) => string
  'data-testid'?: string
  accessToken?: string
  assignedUserId?: string
  currentUserId?: string
  businessAppContext?: BusinessAppContextProps
  /** When true, DocuSign signing UI is shown (set by CRM/IRM parents from FeatureHub). */
  docuSignEnabled?: boolean
}

/**
 * TaskDetailContent - Orchestrates the display of task details, documents, and instances
 * Contains the main scrollable content area with all task information cards
 */
export const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  task,
  buildReferenceUrl,
  'data-testid': dataTestId,
  accessToken,
  assignedUserId,
  currentUserId,
  businessAppContext,
  docuSignEnabled = false
}) => {
  // Extract catalog entries for task metadata
  const taskStatus = (task as any).taskStatus as CatalogEntry
  const taskPriority = (task as any).taskPriority as CatalogEntry
  const taskType = (task as any).taskType as CatalogEntry

  // Use accessToken from props or fallback to businessAppContext
  const effectiveAccessToken = accessToken || businessAppContext?.accessToken

  // Check if current user is assignee
  const isAssignee = React.useMemo(() => {
    return Boolean(assignedUserId && currentUserId && assignedUserId === currentUserId)
  }, [assignedUserId, currentUserId])

  // DocuSign integration
  const {
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
    isDocuSignAuthenticated
  } = useDocuSignIntegration(task, accessToken, isAssignee, docuSignEnabled)

  // Build task context for DocuSign modal
  const investmentTaskFormData = React.useMemo(() => buildInvestmentTaskFormDataFromTask(task), [task])
  const docuSignTaskContext = React.useMemo(
    () =>
      investmentTaskFormData
        ? {
            taskId: task.id,
            taskFormData: investmentTaskFormData
          }
        : undefined,
    [investmentTaskFormData, task.id]
  )

  // Handle document click
  const handleDocumentClick = async (document: TaskDocument, e: React.MouseEvent) => {
    e.stopPropagation()
    await handleDocumentClickUtil(document, effectiveAccessToken, { showToast: true })
  }

  // Safety check for task data
  if (!task) {
    return (
      <div
        className="gba:p-4 gba:text-center gba:text-muted-foreground"
        data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-no-data`}
      >
        No task data available
      </div>
    )
  }

  return (
    <ScrollArea className="gba:h-full gba:w-full" data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-scroll-area`}>
      <div className="gba:space-y-4 gba:p-1" data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-container`}>
        <TaskDetailsCard
          task={task}
          taskStatus={taskStatus}
          taskPriority={taskPriority}
          taskType={taskType}
          buildReferenceUrl={buildReferenceUrl}
          dataTestId={dataTestId || DATA_TEST_ID_PREFIX}
          hasSignableDocs={hasSignableDocs}
          docuSignButtonLabel={docuSignButtonLabel}
          onOpenDocuSignModal={() => openDocuSignModal()}
        />

        {docuSignEnabled && isDocuSignAuthenticated === false && (
          <DigitalReferralBanner
            onStartReferral={() => openDocuSignModal({ focusReferral: true })}
            className="gba:bg-background"
          />
        )}

        <TaskAssigneesCard task={task} dataTestId={dataTestId || DATA_TEST_ID_PREFIX} />

        <TaskDocumentsCard
          documents={documentsWithStatus}
          statusMap={statusMap}
          dataTestId={dataTestId || DATA_TEST_ID_PREFIX}
          onDocumentClick={handleDocumentClick}
          onCheckEnvelopeStatus={checkEnvelopeStatus}
          showDocuSignEnvelopeStatus={docuSignEnabled}
        />

        <TaskInstancesCard
          task={task}
          taskType={taskType}
          currentUserId={currentUserId}
          dataTestId={dataTestId || DATA_TEST_ID_PREFIX}
        />

        <div className="gba:h-4" />
      </div>

      {docuSignEnabled && (
        <DocuSignSignatureModal
          isOpen={isDocuSignOpen}
          onClose={() => {
            setIsDocuSignOpen(false)
            setFocusReferral(false)
          }}
          accessToken={accessToken}
          assignedUserId={assignedUserId}
          emailOnly={!isAssignee}
          businessAppContext={businessAppContext}
          taskContext={docuSignTaskContext}
          documents={documentsWithStatus.map(d => ({
            id: d.id,
            name: d.name,
            mimeType: d.mimeType,
            version: d.version,
            envelopeStatus: d.envelopeStatus,
            fileInfo: d.fileInfo
          }))}
          focusReferral={focusReferral}
        />
      )}
    </ScrollArea>
  )
}
