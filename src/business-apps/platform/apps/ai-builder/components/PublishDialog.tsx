import React, { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Input } from '@newwork/nw-design-system'
import { Label } from '@newwork/nw-design-system'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { Upload, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'

interface GeneratedFile {
  path: string
  content: string
  changeType: 'create' | 'modify' | 'delete'
}

interface PublishDialogProps {
  files: GeneratedFile[]
  onClose: () => void
  onPublish: (screenPath: string, resourceUrl: string) => Promise<void>
}

export const PublishDialog: React.FC<PublishDialogProps> = ({ files, onClose, onPublish }) => {
  const [screenPath, setScreenPath] = useState('')
  const [resourceUrl, setResourceUrl] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-detect screen path from generated files
  React.useEffect(() => {
    const mainFile = files.find(f => f.path.includes('/apps/') && f.path.endsWith('.tsx'))
    if (mainFile && !screenPath) {
      // Extract path like: crm/customers/apps/my-screen
      const match = mainFile.path.match(/business-apps\/(.+?)\/[^/]+\.tsx$/)
      if (match) {
        setScreenPath(match[1])
      }
    }
  }, [files, screenPath])

  const handlePublish = async () => {
    if (!screenPath || !resourceUrl) {
      setError('Please fill in all required fields')
      return
    }

    setPublishing(true)
    setError(null)

    try {
      await onPublish(screenPath, resourceUrl)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish screen')
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
              Publish to NEWWORK Platform
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
              Files to Publish ({files.length})
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

          {/* Screen Path */}
          <div className="gba:space-y-2">
            <Label htmlFor="screen-path">Screen Path *</Label>
            <Input
              id="screen-path"
              value={screenPath}
              onChange={e => setScreenPath(e.target.value)}
              placeholder="crm/customers/apps/my-screen"
              data-testid="ai-builder-publish-screen-path"
            />
            <p className="gba:text-xs gba:text-muted-foreground">
              Format: {'<module>/<sub-module>/apps/<screen-name>'}
            </p>
          </div>

          {/* Resource URL */}
          <div className="gba:space-y-2">
            <Label htmlFor="resource-url">Resource URL *</Label>
            <Input
              id="resource-url"
              value={resourceUrl}
              onChange={e => setResourceUrl(e.target.value)}
              placeholder="/apps/crm/my-screen"
              data-testid="ai-builder-publish-resource-url"
            />
            <p className="gba:text-xs gba:text-muted-foreground">
              The URL path where the screen will be accessible in the platform
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="gba:w-4 gba:h-4" />
            <AlertDescription className="gba:text-xs">
              This will build the screen, upload it to Azure, and register it in the NEWWORK platform. The screen will
              be immediately available at the specified URL.
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
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing || !screenPath || !resourceUrl}
              className="gba:gap-2"
              data-testid="ai-builder-publish-confirm"
            >
              {publishing ? (
                <>
                  <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="gba:w-4 gba:h-4" />
                  Publish Screen
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
