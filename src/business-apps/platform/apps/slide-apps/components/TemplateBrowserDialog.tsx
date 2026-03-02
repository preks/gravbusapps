/**
 * TemplateBrowserDialog Component
 *
 * Dialog for browsing and selecting slide templates.
 * Features search, category filtering, and template preview.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Separator,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { LayoutTemplate, Search, Briefcase, Palette, Minimize2, Folder, User, X } from 'lucide-react'
import type { SlideData } from './slideElements'
import type { SlideTemplateSummary, TemplateCategory } from '../types'
import { SlidesApiService } from '../services/SlidesApiService'
import { TemplateCard } from './TemplateCard'
import translations from '../_i18n'

export interface TemplateBrowserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyTemplate: (slides: SlideData[], themeId: string) => void
  'data-testid'?: string
}

type TabKey = 'all' | TemplateCategory | 'my-templates'

interface Tab {
  key: TabKey
  labelKey: string
  icon: React.ReactNode
}

const TABS: Tab[] = [
  { key: 'all', labelKey: 'template-tab-all', icon: <LayoutTemplate className="gba:w-4 gba:h-4" /> },
  { key: 'business', labelKey: 'template-category-business', icon: <Briefcase className="gba:w-4 gba:h-4" /> },
  { key: 'creative', labelKey: 'template-category-creative', icon: <Palette className="gba:w-4 gba:h-4" /> },
  { key: 'minimal', labelKey: 'template-category-minimal', icon: <Minimize2 className="gba:w-4 gba:h-4" /> },
  { key: 'custom', labelKey: 'template-category-custom', icon: <Folder className="gba:w-4 gba:h-4" /> },
  { key: 'my-templates', labelKey: 'template-tab-my-templates', icon: <User className="gba:w-4 gba:h-4" /> }
]

export const TemplateBrowserDialog: React.FC<TemplateBrowserDialogProps> = ({
  open,
  onOpenChange,
  onApplyTemplate,
  'data-testid': testId = 'template-browser-dialog'
}) => {
  const { t } = useTranslation(translations)

  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [templates, setTemplates] = useState<SlideTemplateSummary[]>([])
  const [templatePreviews, setTemplatePreviews] = useState<Record<string, SlideData>>({})
  const [selectedTemplate, setSelectedTemplate] = useState<SlideTemplateSummary | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)

    try {
      const filters: Record<string, unknown> = {}

      if (searchQuery.trim()) {
        filters.search = searchQuery.trim()
      }

      if (activeTab === 'my-templates') {
        filters.createdBy = 'me'
      } else if (activeTab !== 'all') {
        filters.category = activeTab as TemplateCategory
      }

      const result = await SlidesApiService.listTemplates(filters as any)
      setTemplates(result)

      // Fetch previews for templates that don't have thumbnails
      const previewPromises = result
        .filter(t => !templatePreviews[t.id])
        .slice(0, 12)
        .map(async template => {
          const full = await SlidesApiService.getTemplate(template.id)
          if (full?.contentJson?.slides?.[0]) {
            return { id: template.id, slide: full.contentJson.slides[0] }
          }
          return null
        })

      const previews = await Promise.all(previewPromises)
      const newPreviews: Record<string, SlideData> = { ...templatePreviews }
      previews.forEach(p => {
        if (p) newPreviews[p.id] = p.slide
      })
      setTemplatePreviews(newPreviews)
    } catch (error) {
      console.error('[TemplateBrowserDialog] Failed to fetch templates:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, activeTab, templatePreviews])

  useEffect(() => {
    if (open) {
      setSelectedTemplate(null)
      fetchTemplates()
    }
  }, [open, activeTab])

  useEffect(() => {
    if (!open) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchTemplates()
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  const handleSelectTemplate = (template: SlideTemplateSummary) => {
    setSelectedTemplate(prev => (prev?.id === template.id ? null : template))
  }

  const handleDeleteTemplate = async (template: SlideTemplateSummary) => {
    if (!window.confirm(t('template-delete-confirm') || `Delete template "${template.name}"?`)) {
      return
    }

    const success = await SlidesApiService.deleteTemplate(template.id)
    if (success) {
      setTemplates(prev => prev.filter(t => t.id !== template.id))
      if (selectedTemplate?.id === template.id) {
        setSelectedTemplate(null)
      }
    }
  }

  const handleApply = async () => {
    if (!selectedTemplate) return

    setIsApplying(true)
    try {
      const full = await SlidesApiService.getTemplate(selectedTemplate.id)
      if (full?.contentJson) {
        onApplyTemplate(full.contentJson.slides, full.contentJson.themeId)
        onOpenChange(false)
      }
    } catch (error) {
      console.error('[TemplateBrowserDialog] Failed to apply template:', error)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-4xl gba:h-[80vh] gba:p-0 gba:gap-0 gba:overflow-hidden gba:flex gba:flex-col"
        data-testid={testId}
      >
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4 gba:flex-shrink-0">
          <DialogTitle className="gba:text-xl gba:font-semibold gba:tracking-tight gba:flex gba:items-center gba:gap-2">
            <LayoutTemplate className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('template-browser-title') || 'Template Browser'}
          </DialogTitle>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            {t('template-browser-description') || 'Choose a template to start your presentation'}
          </p>
        </DialogHeader>

        <Separator />

        {/* Search and Tabs */}
        <div className="gba:px-6 gba:py-3 gba:border-b gba:flex-shrink-0">
          <div className="gba:flex gba:items-center gba:gap-4">
            {/* Search */}
            <div className="gba:relative gba:w-64">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('template-search-placeholder') || 'Search templates...'}
                className="gba:pl-9 gba:pr-8"
                data-testid={`${testId}-search-input`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="gba:absolute gba:right-2 gba:top-1/2 gba:-translate-y-1/2 gba:p-1 gba:rounded hover:gba:bg-muted"
                >
                  <X className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="gba:flex gba:items-center gba:gap-1 gba:flex-1 gba:overflow-x-auto">
              {TABS.map(tab => (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.key)}
                  className="gba:flex-shrink-0"
                  data-testid={`${testId}-tab-${tab.key}`}
                >
                  {tab.icon}
                  <span className="gba:ml-1.5">{t(tab.labelKey) || tab.key}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Template Grid */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-6">
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
              <div className="gba:text-center gba:space-y-3">
                <Spinner className="gba:w-8 gba:h-8 gba:mx-auto gba:text-primary" />
                <p className="gba:text-sm gba:text-muted-foreground">
                  {t('template-loading') || 'Loading templates...'}
                </p>
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
              <div className="gba:text-center gba:space-y-3">
                <LayoutTemplate className="gba:w-12 gba:h-12 gba:mx-auto gba:text-muted-foreground/30" />
                <div>
                  <p className="gba:font-medium">{t('template-empty-title') || 'No templates found'}</p>
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {searchQuery
                      ? t('template-empty-search') || 'Try a different search term'
                      : t('template-empty-description') || 'Create your first template to get started'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-3 lg:gba:grid-cols-4 gba:gap-4">
              {templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  previewSlide={templatePreviews[template.id]}
                  onSelect={handleSelectTemplate}
                  onDelete={template.isOwner ? handleDeleteTemplate : undefined}
                  isSelected={selectedTemplate?.id === template.id}
                  data-testid={`${testId}-template-${template.id}`}
                />
              ))}
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="gba:px-6 gba:py-4 gba:flex-shrink-0">
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
            <div className="gba:text-sm gba:text-muted-foreground">
              {selectedTemplate ? (
                <span>
                  {t('template-selected') || 'Selected'}:{' '}
                  <span className="gba:font-medium gba:text-foreground">{selectedTemplate.name}</span>
                </span>
              ) : (
                <span>{t('template-select-hint') || 'Select a template to continue'}</span>
              )}
            </div>
            <div className="gba:flex gba:gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel-btn`}>
                {t('template-cancel') || 'Cancel'}
              </Button>
              <Button
                onClick={handleApply}
                disabled={!selectedTemplate || isApplying}
                data-testid={`${testId}-apply-btn`}
              >
                {isApplying ? (
                  <>
                    <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('template-applying') || 'Applying...'}
                  </>
                ) : (
                  t('template-apply-btn') || 'Use Template'
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TemplateBrowserDialog
