import React from 'react'
import { Label, Badge, useTranslation } from '@newwork/nw-design-system'
import {
  Calendar,
  User,
  ExternalLink,
  FileText,
  Flag,
  Clock,
  Tag,
  AlignLeft,
  Briefcase,
  UserCircle
} from 'lucide-react'
import { formatDateTime } from '@/common/utils/dateFormatter'
import { handleDocumentClick as handleDocumentClickUtil } from '@/common/utils/documentClickHandler'
import type { TaskApprovalData } from '../hooks/useTaskApprovalData'
import translations from '../_i18n'

interface TaskDetailsDisplayProps {
  taskData: TaskApprovalData
  moduleType?: 'irm' | 'crm'
  accessToken?: string
}

export const TaskDetailsDisplay: React.FC<TaskDetailsDisplayProps> = ({
  taskData,
  moduleType = 'crm',
  accessToken
}) => {
  const { t } = useTranslation(translations)

  const getPriorityVariant = (priority?: string) => {
    if (!priority) return 'secondary'
    // Extract priority type from catalog reference (e.g., "NORMAL" from "InvestmentTaskPriority:v1:NORMAL")
    const priorityType = priority.split(':').pop()?.toLowerCase() || ''

    switch (priorityType) {
      case 'urgent':
        return 'destructive'
      case 'high':
        return 'warning'
      case 'medium':
        return 'info'
      case 'low':
        return 'secondary'
      case 'normal':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const formatCatalogValue = (ref?: string) => {
    if (!ref) return ''
    return ref.split(':').pop()?.replace(/_/g, ' ') || ref
  }

  return (
    <div className="gba:space-y-6">
      {/* Task Overview */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-lg gba:font-semibold">{t('task-information-heading')}</h3>

        {/* Title */}
        <div>
          <Label className="gba:text-muted-foreground">{t('task-title-label')}</Label>
          <div className="gba:text-sm gba:font-medium gba:mt-1">
            {taskData.name || t('task-title-untitled-fallback')}
          </div>
        </div>

        {/* Related Entity - Dynamic based on module */}
        {moduleType === 'irm' && taskData.investmentName && (
          <div>
            <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
              <Briefcase className="gba:h-3 gba:w-3" />
              {t('task-investment-label')}
            </Label>
            <div className="gba:text-sm gba:font-medium gba:mt-1">{taskData.investmentName}</div>
          </div>
        )}

        {moduleType === 'crm' && (
          <>
            {taskData.accountName && (
              <div>
                <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                  <Briefcase className="gba:h-3 gba:w-3" />
                  {t('task-account-label')}
                </Label>
                <div className="gba:text-sm gba:font-medium gba:mt-1">{taskData.accountName}</div>
              </div>
            )}
            {taskData.contactName && (
              <div>
                <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                  <UserCircle className="gba:h-3 gba:w-3" />
                  {t('task-contact-label')}
                </Label>
                <div className="gba:text-sm gba:font-medium gba:mt-1">{taskData.contactName}</div>
              </div>
            )}
            {taskData.leadName && (
              <div>
                <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                  <UserCircle className="gba:h-3 gba:w-3" />
                  {t('task-lead-label')}
                </Label>
                <div className="gba:text-sm gba:font-medium gba:mt-1">{taskData.leadName}</div>
              </div>
            )}
            {taskData.opportunityName && (
              <div>
                <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                  <Briefcase className="gba:h-3 gba:w-3" />
                  {t('task-opportunity-label')}
                </Label>
                <div className="gba:text-sm gba:font-medium gba:mt-1">{taskData.opportunityName}</div>
              </div>
            )}
          </>
        )}

        {/* Priority */}
        {taskData.taskPriorityRef && (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
              <Flag className="gba:h-3 gba:w-3" />
              {t('task-priority-label')}
            </Label>
            <Badge variant={getPriorityVariant(taskData.taskPriorityRef)}>
              {formatCatalogValue(taskData.taskPriorityRef)}
            </Badge>
          </div>
        )}

        {/* Due Date & Timing */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {taskData.dueDate && (
            <div>
              <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                <Calendar className="gba:h-3 gba:w-3" />
                {t('task-due-date-label')}
              </Label>
              <div className="gba:text-sm gba:mt-1">{formatDateTime(taskData.dueDate)}</div>
            </div>
          )}
          {taskData.taskTiming && (
            <div>
              <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                <Clock className="gba:h-3 gba:w-3" />
                {t('task-timing-label')}
              </Label>
              <div className="gba:text-sm gba:mt-1">{taskData.taskTiming}</div>
            </div>
          )}
        </div>

        {/* Type */}
        {taskData.taskTypeRef && (
          <div>
            <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
              <Tag className="gba:h-3 gba:w-3" />
              {t('task-type-label')}
            </Label>
            <div className="gba:text-sm gba:mt-1">{formatCatalogValue(taskData.taskTypeRef)}</div>
          </div>
        )}

        {/* Creator */}
        {taskData.creatorName && (
          <div>
            <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
              <User className="gba:h-3 gba:w-3" />
              {t('task-created-by-label')}
            </Label>
            <div className="gba:text-sm gba:mt-1">{taskData.creatorName}</div>
          </div>
        )}

        {/* Description */}
        {taskData.description && (
          <div>
            <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
              <AlignLeft className="gba:h-3 gba:w-3" />
              {t('task-description-label')}
            </Label>
            <div className="gba:text-sm gba:mt-1 gba:p-3 gba:bg-muted gba:rounded-md gba:whitespace-pre-wrap">
              {taskData.description}
            </div>
          </div>
        )}

        {/* Documents */}
        {taskData.documents && taskData.documents.length > 0 && (
          <div>
            <Label className="gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
              <FileText className="gba:h-3 gba:w-3" />
              {t('task-documents-count', { count: taskData.documents.length })}
            </Label>
            <div className="gba:space-y-2 gba:mt-2">
              {taskData.documents.map(doc => {
                const handleDocumentClick = async (e: React.MouseEvent) => {
                  e.stopPropagation()
                  await handleDocumentClickUtil(doc, accessToken, { showToast: true })
                }

                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={handleDocumentClick}
                    className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:text-left gba:bg-muted gba:rounded-lg gba:hover:bg-accent gba:transition-colors gba:group"
                    data-testid={`task-approval-document-${doc.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:bg-background gba:rounded gba:shrink-0">
                      <FileText size={14} />
                    </div>
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:text-sm gba:font-medium gba:truncate">
                        {doc.name || t('task-document-unnamed-fallback')}
                      </div>
                      {doc.mimeType && (
                        <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{doc.mimeType}</div>
                      )}
                    </div>
                    <ExternalLink
                      size={16}
                      className="gba:text-muted-foreground gba:shrink-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
