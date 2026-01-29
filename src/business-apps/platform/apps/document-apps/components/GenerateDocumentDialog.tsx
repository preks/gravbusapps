/**
 * GenerateDocumentDialog
 *
 * Lets the user pick a template and generate a document with {{entity.field}}
 * placeholders filled from entity data (e.g. job candidate). Creates a new
 * document and optionally navigates to it.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Spinner
} from '@newwork/nw-design-system'
import { FileText, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { DocumentApiService } from '../services/DocumentApiService'
import { resolvePlaceholders } from '../utils/templatePlaceholders'
import type { TemplateSummary } from '../types'

export interface GenerateDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Entity type used in placeholders (e.g. "jobCandidate") */
  entityType: string
  /** Entity data for placeholder resolution (e.g. candidate record) */
  entityData: Record<string, unknown>
  /** Document title for the generated document */
  defaultTitle?: string
  /** Called after document is created (e.g. to navigate to document) */
  onSuccess?: (documentId: string) => void
  'data-testid'?: string
}

export const GenerateDocumentDialog: React.FC<GenerateDocumentDialogProps> = ({
  open,
  onOpenChange,
  entityType,
  entityData,
  defaultTitle = 'Generated Document',
  onSuccess,
  'data-testid': testId = 'generate-document-dialog'
}) => {
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await DocumentApiService.listTemplates({ includePublic: true })
      setTemplates(list)
      if (list.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(list[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [selectedTemplateId])

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open, loadTemplates])

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template')
      return
    }
    setGenerating(true)
    try {
      const template = await DocumentApiService.getTemplate(selectedTemplateId)
      if (!template?.content) {
        toast.error('Template has no content')
        setGenerating(false)
        return
      }
      const resolvedContent = resolvePlaceholders(template.content, entityType, entityData)
      const title = template.name ? `${template.name} - ${defaultTitle}` : defaultTitle
      const doc = await DocumentApiService.createDocumentFromTemplate(selectedTemplateId, title)
      if (doc?.id) {
        await DocumentApiService.updateDocument(doc.id, { content: resolvedContent })
        toast.success('Document created')
        onOpenChange(false)
        onSuccess?.(doc.id)
      } else {
        toast.error('Failed to create document')
      }
    } catch (err) {
      console.error('Generate document failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to generate document')
    } finally {
      setGenerating(false)
    }
  }, [selectedTemplateId, entityType, entityData, defaultTitle, onOpenChange, onSuccess])

  return (
    <Dialog open={open} onOpenChange={onOpenChange} data-testid={testId}>
      <DialogContent className="gba:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate document</DialogTitle>
          <DialogDescription>
            Choose a template. Placeholders like {`{{${entityType}.fieldName}}`} (e.g. {`{{job_candidate.firstName}}`})
            will be replaced with the current record data.
          </DialogDescription>
        </DialogHeader>
        <div className="gba:space-y-4 gba:py-2">
          {loading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <Spinner size="sm" />
            </div>
          )}
          {error && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-destructive gba:text-sm">
              <AlertCircle className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {!loading && !error && templates.length === 0 && (
            <p className="gba:text-sm gba:text-muted-foreground">No templates available.</p>
          )}
          {!loading && !error && templates.length > 0 && (
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium">Template</label>
              <div className="gba:border gba:rounded-lg gba:max-h-48 gba:overflow-y-auto gba:divide-y">
                {templates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:text-left gba:transition-colors hover:gba:bg-muted/60 ${
                      selectedTemplateId === t.id ? 'gba:bg-primary/10 gba:border-primary/30' : ''
                    }`}
                    data-testid={`${testId}-template-${t.id}`}
                  >
                    <FileText className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
                    <div className="gba:min-w-0">
                      <div className="gba:font-medium gba:truncate">{t.name}</div>
                      {t.description && (
                        <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{t.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedTemplateId || generating || loading}
            data-testid={`${testId}-generate`}
          >
            {generating ? (
              <>
                <Spinner size="sm" className="gba:mr-2" />
                Generating...
              </>
            ) : (
              'Generate document'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GenerateDocumentDialog
