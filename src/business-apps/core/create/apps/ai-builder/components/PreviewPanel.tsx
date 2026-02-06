import React, { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { Eye, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface GeneratedFile {
  path: string
  content: string
  changeType: 'create' | 'modify' | 'delete'
}

interface PreviewPanelProps {
  files: GeneratedFile[]
  sessionId: string
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ files }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartPreview = async () => {
    setLoading(true)
    setError(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setPreviewUrl('about:blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start preview')
    } finally {
      setLoading(false)
    }
  }

  if (files.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:p-6">
        <div className="gba:text-center gba:space-y-3">
          <Eye className="gba:w-12 gba:h-12 gba:mx-auto gba:text-muted-foreground" />
          <div>
            <h3 className="gba:text-lg gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.preview.no_preview', 'No Preview Available')}
            </h3>
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.preview.generate_first',
                'Generate files first to see a preview'
              )}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full">
      {/* Preview Controls */}
      <div className="gba:border-b gba:bg-card gba:p-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Eye className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
            <h3 className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.preview.mode', 'Preview Mode')}
            </h3>
            {previewUrl && <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-success gba:animate-pulse" />}
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            {previewUrl && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartPreview}
                  disabled={loading}
                  className="gba:gap-2"
                >
                  <RefreshCw className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.preview.reload', 'Reload')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => globalThis.window?.open(previewUrl, '_blank')}
                  className="gba:gap-2"
                >
                  <ExternalLink className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.preview.open_new_tab', 'Open in New Tab')}
                </Button>
              </>
            )}
            {!previewUrl && (
              <Button
                onClick={handleStartPreview}
                disabled={loading}
                className="gba:gap-2"
                data-testid="ai-builder-start-preview"
              >
                {loading ? (
                  <>
                    <RefreshCw className="gba:w-4 gba:h-4 gba:animate-spin" />
                    {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.preview.starting', 'Starting...')}
                  </>
                ) : (
                  <>
                    <Eye className="gba:w-4 gba:h-4" />
                    {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.preview.start', 'Start Preview')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="gba:mt-4">
            <AlertCircle className="gba:w-4 gba:h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Preview Content */}
      <div className="gba:flex-1 gba:bg-muted">
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="gba:w-full gba:h-full gba:border-0"
            title={getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.preview.iframe_title', 'Screen Preview')}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
            <div className="gba:text-center gba:space-y-4 gba:max-w-md">
              <div className="gba:w-16 gba:h-16 gba:mx-auto gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                <Eye className="gba:w-8 gba:h-8 gba:text-primary" />
              </div>
              <div>
                <h3 className="gba:text-lg gba:font-medium gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.preview.ready', 'Ready to Preview')}
                </h3>
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.preview.click_start',
                    'Click "Start Preview" to see your generated screen in action'
                  )}
                </p>
              </div>
              <Alert>
                <AlertCircle className="gba:w-4 gba:h-4" />
                <AlertDescription className="gba:text-xs">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.preview.sandbox_info',
                    'Preview will load the screen in a sandboxed environment'
                  )}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
