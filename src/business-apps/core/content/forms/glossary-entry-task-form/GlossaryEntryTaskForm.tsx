import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  useTranslation
} from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { ContentGroup } from '@/common/data/content/constants/contentConstants'
import { ErrorAlert } from '@/components/error-alert'
import { useEmployeeAvatar } from '@/business-apps/core/every/apps/every-box/hooks/useEmployeeAvatar'
import { Book, User, Info } from 'lucide-react'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import translations from './_i18n'

const GlossaryEntryTaskForm: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData }) => {
  const { t } = useTranslation(translations)

  // Extract task data from additionalData (from workflow)
  const taskPayload = additionalData?.psi_taskPayload || {}
  const term = taskPayload.term || taskPayload.psi_initialParameters?.term || ''
  const context = taskPayload.context || taskPayload.psi_initialParameters?.context || ''
  const requesterUserId = additionalData?.psi_processMetadata?.flowInitiatedBy || taskPayload.requesterUserId

  // Listen for process completion (when glossary entry is created)
  useProcessCompletion({
    onSuccess: () => {
      // Optionally complete the task automatically when glossary entry is created
      // Or let user complete manually
    }
  })

  // Fetch requester employee data
  const { employeeData: requesterData, isLoading: isLoadingRequester } = useEmployeeAvatar(
    accessToken || '',
    requesterUserId
  )

  const requesterName = useMemo(() => {
    if (requesterData?.displayName) return requesterData.displayName
    if (requesterData?.firstName && requesterData?.lastName) {
      return `${requesterData.firstName} ${requesterData.lastName}`
    }
    return additionalData?.psi_processMetadata?.flowInitiatedByName || 'Unknown'
  }, [requesterData, additionalData])

  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }

  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="glossary-entry-task-form" />
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="glossary-entry-task-form">
      <Card className="gba:flex-1 gba:flex gba:flex-col gba:min-h-0">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Book className="gba:w-5 gba:h-5" />
            {t('glossary-task-title') || 'Glossary Term Request'}
          </CardTitle>
        </CardHeader>

        <CardContent className="gba:flex-1 gba:overflow-y-auto gba:space-y-6">
          {/* Requester Info */}
          <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <User className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {t('glossary-requested-by') || 'Requested by'}
              </span>
            </div>
            {isLoadingRequester ? (
              <div className="gba:text-sm gba:text-muted-foreground">Loading...</div>
            ) : (
              <div className="gba:text-base gba:font-medium gba:text-foreground">{requesterName}</div>
            )}
          </div>

          {/* Requested Term */}
          <div className="gba:space-y-2">
            <label className="gba:text-sm gba:font-medium gba:text-foreground">
              {t('glossary-requested-term') || 'Requested Term'}
            </label>
            <div className="gba:p-3 gba:bg-muted/30 gba:rounded-lg gba:border">
              <p className="gba:text-lg gba:font-semibold gba:text-foreground">{term || '-'}</p>
            </div>
          </div>

          {/* Context */}
          {context && (
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium gba:text-foreground">
                {t('glossary-context') || 'Context'}
              </label>
              <div className="gba:p-3 gba:bg-muted/30 gba:rounded-lg gba:border">
                <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{context}</p>
              </div>
            </div>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="gba:h-4 gba:w-4" />
            <AlertDescription className="gba:text-sm">
              {t('glossary-task-info') ||
                'Please create a glossary entry for this term. Use the button below to open the glossary entry form.'}
            </AlertDescription>
          </Alert>

          {/* AppAction Button to create glossary entry */}
          <div className="gba:pt-4 gba:border-t">
            <AppAction
              variant="create-primary"
              contexts={[
                {
                  context: FlowContextName.contentEntryCreate,
                  contextData: {
                    contentGroup: ContentGroup.GLOSSARY,
                    // Pre-fill the term from the request
                    initialTitle: term,
                    initialPreview: context
                  }
                }
              ]}
              accessToken={accessToken || ''}
              data-testid="glossary-task-create-entry-button"
            >
              {t('glossary-create-entry') || 'Create Glossary Entry'}
            </AppAction>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GlossaryEntryTaskForm
