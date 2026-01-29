/**
 * GenerateDocumentDialog
 *
 * Lets the user pick a template and generate a document with {{entity.field}}
 * placeholders filled from entity data (e.g. job candidate). Creates a new
 * document and optionally navigates to it.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Spinner,
  Badge
} from '@newwork/nw-design-system'
import { FileText, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { toast } from 'sonner'
import { DocumentApiService } from '../services/DocumentApiService'
import { resolvePlaceholders } from '../utils/templatePlaceholders'
import type { TemplateSummary } from '../types'

export interface GenerateDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Map of entity key -> data for resolving placeholders (e.g. job_candidate, company, company_address).
   * All {{entityKey.fieldPath}} placeholders are replaced when the entity is in this map.
   */
  entityDataMap: Record<string, Record<string, unknown>>
  /** Document title for the generated document */
  defaultTitle?: string
  /** Called after document is created (e.g. to navigate to document) */
  onSuccess?: (documentId: string) => void
  'data-testid'?: string
}

export const GenerateDocumentDialog: React.FC<GenerateDocumentDialogProps> = ({
  open,
  onOpenChange,
  entityDataMap,
  defaultTitle = 'Generated Document',
  onSuccess,
  'data-testid': testId = 'generate-document-dialog'
}) => {
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  /** Show whether each entity has data (to check if empty DB is the reason placeholders are not replaced) */
  const entityDataStatus = useMemo(() => {
    return Object.entries(entityDataMap).map(([key, data]) => {
      const keys = Object.keys(data)
      const hasData = keys.length > 0
      const emptyReason =
        key === 'company_address' && !hasData
          ? 'This company has no addresses in the database.'
          : !hasData
            ? 'No data provided for this entity.'
            : null
      return { key, hasData, emptyReason, fieldCount: keys.length }
    })
  }, [entityDataMap])

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
      const resolvedContent = resolvePlaceholders(template.content, entityDataMap)
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
  }, [selectedTemplateId, entityDataMap, defaultTitle, onOpenChange, onSuccess])

  return (
    <Dialog open={open} onOpenChange={onOpenChange} data-testid={testId}>
      <DialogContent className="gba:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate document</DialogTitle>
          <DialogDescription>
            Choose a template. Placeholders like {`{{job_candidate.firstName}}`}, {`{{company.name}}`},{' '}
            {`{{company_address.locality}}`} will be replaced with the linked entity data.
          </DialogDescription>
        </DialogHeader>
        <div className="gba:space-y-4 gba:py-2">
          {/* Placeholder data status: check if empty DB is the reason placeholders are not replaced */}
          {entityDataStatus.length > 0 && (
            <div
              className="gba:rounded-lg gba:border gba:bg-muted/30 gba:px-3 gba:py-2"
              data-testid={`${testId}-entity-data-status`}
            >
              <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Placeholder data status</p>
              <ul className="gba:space-y-1.5">
                {entityDataStatus.map(({ key, hasData, emptyReason, fieldCount }) => (
                  <li
                    key={key}
                    className="gba:flex gba:items-start gba:gap-2 gba:text-sm"
                    data-testid={`${testId}-entity-status-${key}`}
                  >
                    {hasData ? (
                      <CheckCircle className="gba:w-4 gba:h-4 gba:text-success gba:flex-shrink-0 gba:mt-0.5" />
                    ) : (
                      <Info className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0 gba:mt-0.5" />
                    )}
                    <span className="gba:min-w-0">
                      <Badge variant={hasData ? 'secondary' : 'outline'} className="gba:font-mono gba:text-[10px]">
                        {key}
                      </Badge>
                      {hasData ? (
                        <span className="gba:ml-1.5 gba:text-muted-foreground">
                          {fieldCount} field{fieldCount !== 1 ? 's' : ''} available
                        </span>
                      ) : emptyReason ? (
                        <span className="gba:ml-1.5 gba:text-muted-foreground gba:italic">{emptyReason}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
