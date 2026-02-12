import React from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label
} from '@newwork/nw-design-system'
import { Upload, Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface PublishDialogFileSummary {
  totalUniqueFiles: number
  created: number
  modified: number
  deleted: number
  files: Array<{
    path: string
    type: 'create' | 'modify' | 'delete'
  }>
}

export interface PublishDialogProps {
  uniqueFileSummary: PublishDialogFileSummary | null
  detectedTargetPath: string | null
  targetPath: string
  resourceUrl: string
  publishError: string | null
  isPublishing: boolean
  onClose: () => void
  onTargetPathChange: (value: string) => void
  onResourceUrlChange: (value: string) => void
  onPublish: () => void
}

export const PublishDialog: React.FC<PublishDialogProps> = ({
  uniqueFileSummary,
  detectedTargetPath,
  targetPath,
  resourceUrl,
  publishError,
  isPublishing,
  onClose,
  onTargetPathChange,
  onResourceUrlChange,
  onPublish
}) => {
  const getFileTypeDotClass = (type: 'create' | 'modify' | 'delete'): string => {
    if (type === 'create') return 'gba:bg-success'
    if (type === 'delete') return 'gba:bg-destructive'
    return 'gba:bg-warning'
  }

  return (
    <div className="gba:fixed gba:inset-0 gba:bg-background/80 gba:backdrop-blur-sm gba:flex gba:items-center gba:justify-center gba:z-50 gba:p-4">
      <Card className="gba:w-full gba:max-w-2xl">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Upload className="gba:w-5 gba:h-5" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.publish_dialog_title',
                'Publish to NEWWORK Platform'
              )}
            </CardTitle>
            <button onClick={onClose} className="gba:text-muted-foreground hover:gba:text-foreground">
              <X className="gba:w-5 gba:h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="gba:space-y-6">
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.files_to_publish', 'Files to Publish')} (
              {uniqueFileSummary?.totalUniqueFiles || 0})
            </h4>
            <div className="gba:bg-muted gba:rounded-lg gba:p-3 gba:space-y-2">
              <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
                {uniqueFileSummary && uniqueFileSummary.created > 0 && (
                  <span className="gba:flex gba:items-center gba:gap-1">
                    <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success" />
                    {uniqueFileSummary.created}{' '}
                    {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.created', 'created')}
                  </span>
                )}
                {uniqueFileSummary && uniqueFileSummary.modified > 0 && (
                  <span className="gba:flex gba:items-center gba:gap-1">
                    <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-warning" />
                    {uniqueFileSummary.modified}{' '}
                    {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.modified', 'modified')}
                  </span>
                )}
                {uniqueFileSummary && uniqueFileSummary.deleted > 0 && (
                  <span className="gba:flex gba:items-center gba:gap-1">
                    <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-destructive" />
                    {uniqueFileSummary.deleted}{' '}
                    {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.deleted', 'deleted')}
                  </span>
                )}
              </div>
              {uniqueFileSummary && uniqueFileSummary.files.length > 0 && (
                <div className="gba:mt-2 gba:space-y-1 gba:max-h-32 gba:overflow-y-auto gba:text-xs">
                  {uniqueFileSummary.files.map(file => (
                    <div key={file.path} className="gba:flex gba:items-center gba:gap-2 gba:py-0.5">
                      <span
                        className={`gba:w-1 gba:h-1 gba:rounded-full gba:flex-shrink-0 ${getFileTypeDotClass(file.type)}`}
                      />
                      <span className="gba:font-mono gba:text-muted-foreground gba:truncate" title={file.path}>
                        {file.path}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {detectedTargetPath ? (
            <Alert className="gba:bg-success-secondary gba:border-success">
              <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-success" />
              <AlertDescription>
                <div className="gba:text-sm gba:space-y-2">
                  <div>
                    <strong className="gba:text-success">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.ready_to_publish_status',
                        'Ready to publish!'
                      )}
                    </strong>
                    <p className="gba:text-xs gba:mt-1 gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.auto_configured_message',
                        'Everything is configured automatically. Just click "Publish" below!'
                      )}
                    </p>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                    <span className="gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.target_path_label', 'Target path:')}
                    </span>
                    <code className="gba:bg-background gba:px-2 gba:py-1 gba:rounded">{detectedTargetPath}</code>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                    <span className="gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.resource_url_label', 'Resource URL:')}
                    </span>
                    <code className="gba:bg-background gba:px-2 gba:py-1 gba:rounded">{resourceUrl}</code>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="gba:w-4 gba:h-4" />
              <AlertDescription className="gba:text-sm">
                <strong>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.waiting_for_files', 'Waiting for files...')}
                </strong>
                <p className="gba:text-xs gba:mt-1">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.waiting_for_files_description',
                    'Ask the AI to create a screen and paths will be detected automatically.'
                  )}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {!detectedTargetPath && (
            <>
              <div className="gba:space-y-2">
                <Label htmlFor="publish-dialog-target-path">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.target_path_field', 'Target Path *')}
                </Label>
                <Input
                  id="publish-dialog-target-path"
                  value={targetPath}
                  onChange={e => onTargetPathChange(e.target.value)}
                  placeholder="platform/examples/apps/my-screen"
                />
                <p className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.target_path_format',
                    'The path relative to the configured publish base path'
                  )}
                </p>
              </div>

              <div className="gba:space-y-2">
                <Label htmlFor="publish-dialog-resource-url">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.resource_url_field', 'Resource URL *')}
                </Label>
                <Input
                  id="publish-dialog-resource-url"
                  value={resourceUrl}
                  onChange={e => onResourceUrlChange(e.target.value)}
                  placeholder="/platform/my-screen"
                />
                <p className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.resource_url_help',
                    'The URL path where the screen will be accessible (e.g., /lead-list)'
                  )}
                </p>
              </div>
            </>
          )}

          <Alert>
            <AlertCircle className="gba:w-4 gba:h-4" />
            <AlertDescription className="gba:text-xs">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.publish_info',
                'This will build the screen, upload to Azure, and automatically register it in the platform with the resource URL.'
              )}
            </AlertDescription>
          </Alert>

          {publishError && (
            <Alert variant="destructive">
              <AlertCircle className="gba:w-4 gba:h-4" />
              <AlertDescription className="gba:text-xs gba:max-h-40 gba:overflow-y-auto gba:whitespace-pre-wrap">
                {publishError}
              </AlertDescription>
            </Alert>
          )}

          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4 gba:border-t">
            <Button variant="outline" onClick={onClose} disabled={isPublishing}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.cancel', 'Cancel')}
            </Button>
            <Button onClick={onPublish} disabled={isPublishing || !targetPath || !resourceUrl} className="gba:gap-2">
              {isPublishing ? (
                <>
                  <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publishing', 'Publishing...')}
                </>
              ) : (
                <>
                  <Upload className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publish_screen', 'Publish Screen')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
