import React, { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Input } from '@newwork/nw-design-system'
import { Label } from '@newwork/nw-design-system'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { Upload, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface GeneratedFile {
  path: string
  content: string
  changeType: 'create' | 'modify' | 'delete'
}

interface PublishDialogProps {
  files: GeneratedFile[]
  onClose: () => void
  onPublish: (targetPath: string, resourceUrl: string) => Promise<void>
}

export const PublishDialog: React.FC<PublishDialogProps> = ({ files, onClose, onPublish }) => {
  const [targetPath, setTargetPath] = useState('')
  const [resourceUrl, setResourceUrl] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-detect target path from generated files
  React.useEffect(() => {
    const mainFile = files.find(f => f.path.includes('/apps/') && f.path.endsWith('.tsx'))
    if (mainFile && !targetPath) {
      // Extract path like: crm/customers/apps/my-screen
      const match = mainFile.path.match(/business-apps\/(.+?)\/[^/]+\.tsx$/)
      if (match) {
        setTargetPath(match[1])
      }
    }
  }, [files, targetPath])

  const handlePublish = async () => {
    if (!targetPath || !resourceUrl) {
      setError(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:ai_builder.publish_dialog.fill_required',
          'Please fill in all required fields'
        )
      )
      return
    }

    setPublishing(true)
    setError(null)

    try {
      await onPublish(targetPath, resourceUrl)
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : getTranslationFromI18nKeyAndLabel(
              'lowcoder:ai_builder.publish_dialog.publish_failed',
              'Failed to publish screen'
            )
      )
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div
      className="gba:fixed gba:inset-0 gba:bg-background/80 gba:backdrop-blur-sm gba:flex gba:items-center gba:justify-center gba:z-50 gba:p-4"
      data-testid="ai-builder-publish-dialog"
    >
      <Card className="gba:w-full gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Upload className="gba:w-5 gba:h-5" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.publish_dialog.title',
                'Publish to NEWWORK Platform'
              )}
            </CardTitle>
            <button
              onClick={onClose}
              className="gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors"
              data-testid="ai-builder-publish-dialog-close"
            >
              <X className="gba:w-5 gba:h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="gba:space-y-6">
          {/* Files Summary */}
          <div>
            <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.publish_dialog.files_to_publish',
                'Files to Publish'
              )}{' '}
              ({files.length})
            </h4>
            <div className="gba:space-y-1 gba:max-h-40 gba:overflow-y-auto gba:bg-muted gba:rounded-lg gba:p-3">
              {files.map((file, idx) => (
                <div key={idx} className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                  <CheckCircle className="gba:w-3 gba:h-3 gba:text-success gba:flex-shrink-0" />
                  <span className="gba:text-muted-foreground gba:truncate">{file.path}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Target Path */}
          <div className="gba:space-y-2">
            <Label htmlFor="target-path">
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publish_dialog.target_path', 'Target Path *')}
            </Label>
            <Input
              id="target-path"
              value={targetPath}
              onChange={e => setTargetPath(e.target.value)}
              placeholder="crm/customers/apps/my-screen"
              data-testid="ai-builder-publish-target-path"
            />
            <p className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.publish_dialog.target_path_format',
                'The path relative to the configured publish base path'
              )}
            </p>
          </div>

          {/* Resource URL */}
          <div className="gba:space-y-2">
            <Label htmlFor="resource-url">
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publish_dialog.resource_url', 'Resource URL *')}
            </Label>
            <Input
              id="resource-url"
              value={resourceUrl}
              onChange={e => setResourceUrl(e.target.value)}
              placeholder="/apps/crm/my-screen"
              data-testid="ai-builder-publish-resource-url"
            />
            <p className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.publish_dialog.resource_url_help',
                'The URL path where the screen will be accessible in the platform'
              )}
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="gba:w-4 gba:h-4" />
            <AlertDescription className="gba:text-xs">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.publish_dialog.info',
                'This will build the screen, upload it to Azure, and register it in the NEWWORK platform. The screen will be immediately available at the specified URL.'
              )}
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="gba:w-4 gba:h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4 gba:border-t">
            <Button variant="outline" onClick={onClose} disabled={publishing} data-testid="ai-builder-publish-cancel">
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publish_dialog.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing || !targetPath || !resourceUrl}
              className="gba:gap-2"
              data-testid="ai-builder-publish-confirm"
            >
              {publishing ? (
                <>
                  <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.publish_dialog.publishing', 'Publishing...')}
                </>
              ) : (
                <>
                  <Upload className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.publish_dialog.publish_screen',
                    'Publish Screen'
                  )}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
