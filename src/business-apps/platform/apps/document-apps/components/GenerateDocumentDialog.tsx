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
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import { toast } from 'sonner'
import { DocumentApiService } from '../services/DocumentApiService'
import { resolvePlaceholders, extractEntityKeysFromContent } from '../utils/templatePlaceholders'
import type { TemplateSummary } from '../types'
import translations from '../_i18n'

export interface GenerateDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Map of entity key -> data for resolving placeholders (e.g. job_candidate, company, company_address).
   * All {{entityKey.fieldPath}} placeholders are replaced when the entity is in this map.
   */
  entityDataMap: Record<string, Record<string, unknown>>
  /** When true, candidate and related data (job_request, company, etc.) are still loading – show loading state and disable generate */
  entityDataLoading?: boolean
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
  entityDataLoading = false,
  defaultTitle,
  onSuccess,
  'data-testid': testId = 'generate-document-dialog'
}) => {
  const { t } = useTranslation(translations)
  const defaultTitleResolved = defaultTitle ?? t('generate-document-default-title')
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  /** Content of the selected template; used to derive placeholder data status for that template. */
  const [selectedTemplateContent, setSelectedTemplateContent] = useState<string | null>(null)
  const [loadingTemplateContent, setLoadingTemplateContent] = useState(false)
  const [generating, setGenerating] = useState(false)

  /** Find entity data for a key (case-insensitive match on entityDataMap keys). */
  const getEntityDataByKey = useCallback(
    (entityKey: string): Record<string, unknown> | undefined => {
      const lower = entityKey.toLowerCase()
      const entry = Object.entries(entityDataMap).find(([k]) => k.toLowerCase() === lower)
      return entry?.[1]
    },
    [entityDataMap]
  )

  /** When user selects a template, fetch its content so we can show placeholder status for that template. */
  useEffect(() => {
    if (!selectedTemplateId || !open) {
      setSelectedTemplateContent(null)
      return
    }
    let cancelled = false
    setLoadingTemplateContent(true)
    DocumentApiService.getTemplate(selectedTemplateId)
      .then(t => {
        if (!cancelled && t?.content) setSelectedTemplateContent(t.content)
        else if (!cancelled) setSelectedTemplateContent(null)
      })
      .catch(() => {
        if (!cancelled) setSelectedTemplateContent(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplateContent(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedTemplateId, open])

  /**
   * Placeholder data status: when a template is selected, show only entities referenced in that template;
   * otherwise show all entities we have data for.
   */
  const entityDataStatus = useMemo(() => {
    const buildStatus = (key: string) => {
      const data = getEntityDataByKey(key)
      const keys = data ? Object.keys(data) : []
      const hasData = keys.length > 0
      let emptyReason: string | null = null
      if (!hasData) {
        emptyReason =
          key === 'company_address' ? t('generate-document-no-company-address') : t('generate-document-no-data')
      }
      return { key, hasData, emptyReason, fieldCount: keys.length }
    }
    if (selectedTemplateContent) {
      const entityKeys = extractEntityKeysFromContent(selectedTemplateContent).filter(
        key => key.toLowerCase() !== 'today'
      )
      return entityKeys.map(buildStatus)
    }
    return Object.entries(entityDataMap).map(([key]) => buildStatus(key))
  }, [entityDataMap, selectedTemplateContent, getEntityDataByKey, t])

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
      setError(err instanceof Error ? err.message : t('generate-document-load-failed'))
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [selectedTemplateId, t])

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open, loadTemplates])

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplateId) {
      toast.error(t('generate-document-select-template'))
      return
    }
    setGenerating(true)
    try {
      const template = await DocumentApiService.getTemplate(selectedTemplateId)
      if (!template?.content) {
        toast.error(t('generate-document-no-content'))
        setGenerating(false)
        return
      }
      const resolvedContent = resolvePlaceholders(template.content, entityDataMap)
      const title = template.name ? `${template.name} - ${defaultTitleResolved}` : defaultTitleResolved
      const doc = await DocumentApiService.createDocumentFromTemplate(selectedTemplateId, title)
      if (doc?.id) {
        await DocumentApiService.updateDocument(doc.id, {
          content: resolvedContent,
          ...({ contentJson: {} } as { contentJson?: unknown })
        })
        toast.success(t('generate-document-created'))
        onOpenChange(false)
        onSuccess?.(doc.id)
      } else {
        toast.error(t('generate-document-create-failed'))
      }
    } catch (err) {
      console.error('Generate document failed:', err)
      toast.error(err instanceof Error ? err.message : t('generate-document-failed'))
    } finally {
      setGenerating(false)
    }
  }, [selectedTemplateId, entityDataMap, defaultTitleResolved, onOpenChange, onSuccess, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange} data-testid={testId}>
      <DialogContent className="gba:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('generate-document-title')}</DialogTitle>
          <DialogDescription>{t('generate-document-description')}</DialogDescription>
        </DialogHeader>
        <div className="gba:space-y-4 gba:py-2">
          {/* Placeholder data status: check if empty DB is the reason placeholders are not replaced */}
          {entityDataStatus.length > 0 && (
            <div
              className="gba:rounded-lg gba:border gba:bg-muted/30 gba:px-3 gba:py-2"
              data-testid={`${testId}-entity-data-status`}
            >
              <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
                {t('generate-document-placeholder-status')}
              </p>
              {loadingTemplateContent && selectedTemplateId && (
                <p className="gba:text-xs gba:text-muted-foreground gba:italic gba:mb-2">
                  {t('generate-document-loading-placeholders')}
                </p>
              )}
              {entityDataLoading && (
                <p className="gba:text-xs gba:text-muted-foreground gba:italic gba:mb-2">
                  {t('generate-document-loading-data')}
                </p>
              )}
              <ul className="gba:space-y-1.5">
                {entityDataStatus.map(({ key, hasData, emptyReason, fieldCount }) => {
                  const showLoading = entityDataLoading && !hasData
                  let statusIcon: React.ReactNode
                  if (hasData) {
                    statusIcon = (
                      <CheckCircle className="gba:w-4 gba:h-4 gba:text-success gba:flex-shrink-0 gba:mt-0.5" />
                    )
                  } else if (showLoading) {
                    statusIcon = <Spinner size="sm" className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:mt-0.5" />
                  } else {
                    statusIcon = (
                      <Info className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0 gba:mt-0.5" />
                    )
                  }
                  let statusText: React.ReactNode = null
                  if (hasData) {
                    statusText = (
                      <span className="gba:ml-1.5 gba:text-muted-foreground">
                        {t('generate-document-fields-available', { count: fieldCount })}
                      </span>
                    )
                  } else if (showLoading) {
                    statusText = (
                      <span className="gba:ml-1.5 gba:text-muted-foreground gba:italic">
                        {t('generate-document-loading')}
                      </span>
                    )
                  } else if (emptyReason) {
                    statusText = <span className="gba:ml-1.5 gba:text-muted-foreground gba:italic">{emptyReason}</span>
                  }
                  return (
                    <li
                      key={key}
                      className="gba:flex gba:items-start gba:gap-2 gba:text-sm"
                      data-testid={`${testId}-entity-status-${key}`}
                    >
                      {statusIcon}
                      <span className="gba:min-w-0">
                        <Badge variant={hasData ? 'secondary' : 'outline'} className="gba:font-mono gba:text-[10px]">
                          {key}
                        </Badge>
                        {statusText}
                      </span>
                    </li>
                  )
                })}
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
            <p className="gba:text-sm gba:text-muted-foreground">{t('generate-document-no-templates')}</p>
          )}
          {!loading && !error && templates.length > 0 && (
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium" htmlFor={`${testId}-template-select`}>
                {t('generate-document-template-label')}
              </label>
              <Select
                value={selectedTemplateId ?? ''}
                onValueChange={val => setSelectedTemplateId(val || null)}
                disabled={loadingTemplateContent}
              >
                <SelectTrigger id={`${testId}-template-select`} data-testid={`${testId}-template-select`}>
                  <SelectValue placeholder={t('generate-document-select-placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id} data-testid={`${testId}-template-${t.id}`}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            {t('common-cancel')}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedTemplateId || generating || loading || entityDataLoading}
            data-testid={`${testId}-generate`}
          >
            {generating ? (
              <>
                <Spinner size="sm" className="gba:mr-2" />
                {t('generate-document-generating')}
              </>
            ) : (
              t('generate-document-generate-button')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GenerateDocumentDialog
