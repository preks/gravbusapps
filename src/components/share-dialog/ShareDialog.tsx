import React from 'react'
import { message } from 'antd'
import {
  QuickTaskModal,
  QuickTaskFormData,
  QuickTaskFlowService
} from '@/business-apps/flow/common/components/flow-quick-task'
import { env } from '@/common/env/EnvUtils'

export interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  currentUserId: string
  // Entity being shared
  entityType: 'news-article' | 'knowledge-article' | 'document' | 'question'
  entityId: string
  entityName: string
  entityDisplayUrl: string
  entityMetadata?: Record<string, any>
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  currentUserId,
  entityType,
  entityId,
  entityName,
  entityDisplayUrl,
  entityMetadata
}) => {
  const handleShare = async (data: QuickTaskFormData) => {
    try {
      // Add entity reference to form data
      const formDataWithEntity: QuickTaskFormData = {
        ...data,
        entityType,
        entityId,
        entityName,
        entityDisplayUrl,
        entityMetadata
      }

      const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine'

      // Execute the quick task with entity reference
      await QuickTaskFlowService.executeQuickTask({
        formData: formDataWithEntity,
        uploadResults: [],
        accessToken,
        initiatorId: currentUserId,
        apiBaseUrl: baseUrl
      })

      message.success(`Shared "${entityName}" successfully!`)
    } catch (error) {
      message.error(`Failed to share: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  return (
    <QuickTaskModal
      open={open}
      onOpenChange={onOpenChange}
      accessToken={accessToken}
      onSubmit={handleShare}
      title="Share via Blink"
      description="Share this content with employees instantly"
      employeeId={currentUserId}
      config={{
        assigneeSelector: { mode: 'employee-search', required: true },
        enableFileUpload: false,
        enableDueDate: true,
        maxFiles: 0
      }}
    />
  )
}
