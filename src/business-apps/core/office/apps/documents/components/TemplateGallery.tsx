/**
 * TemplateGallery Component
 *
 * Displays document templates organized by category
 * for creating new documents.
 */

import React, { useState, useMemo, useCallback } from 'react'
import { Card, Badge, Input, Tabs, TabsContent, TabsList, TabsTrigger, useTranslation } from '@newwork/nw-design-system'
import {
  FileText,
  Search,
  Briefcase,
  FileSignature,
  Mail,
  ClipboardList,
  FileCheck,
  ScrollText,
  BookOpen,
  LayoutTemplate,
  Star,
  Clock,
  Users
} from 'lucide-react'
import type { TemplateSummary, DocumentTemplate, TemplateCategory } from '../types'
import { TEMPLATE_CATEGORY_API_VALUES } from '../types'
import translations from '../_i18n'

export interface TemplateGalleryProps {
  templates: TemplateSummary[]
  onSelectTemplate: (template: DocumentTemplate) => void
  onEditTemplate?: (template: TemplateSummary) => void
  'data-testid'?: string
}

/** Category icon mapping (labels/descriptions come from i18n) */
const CATEGORY_ICONS: Record<TemplateCategory, React.ReactNode> = {
  contracts: <FileSignature className="gba:w-4 gba:h-4" />,
  agreements: <FileCheck className="gba:w-4 gba:h-4" />,
  letters: <Mail className="gba:w-4 gba:h-4" />,
  reports: <ClipboardList className="gba:w-4 gba:h-4" />,
  proposals: <Briefcase className="gba:w-4 gba:h-4" />,
  policies: <ScrollText className="gba:w-4 gba:h-4" />,
  procedures: <BookOpen className="gba:w-4 gba:h-4" />,
  forms: <FileText className="gba:w-4 gba:h-4" />,
  other: <LayoutTemplate className="gba:w-4 gba:h-4" />
}

const CATEGORY_LABEL_KEYS: Record<TemplateCategory, string> = {
  contracts: 'templates-category-contracts',
  agreements: 'templates-category-agreements',
  letters: 'templates-category-letters',
  reports: 'templates-category-reports',
  proposals: 'templates-category-proposals',
  policies: 'templates-category-policies',
  procedures: 'templates-category-procedures',
  forms: 'templates-category-forms',
  other: 'templates-category-other'
}

const CATEGORY_DESC_KEYS: Record<TemplateCategory, string> = {
  contracts: 'templates-category-contracts-desc',
  agreements: 'templates-category-agreements-desc',
  letters: 'templates-category-letters-desc',
  reports: 'templates-category-reports-desc',
  proposals: 'templates-category-proposals-desc',
  policies: 'templates-category-policies-desc',
  procedures: 'templates-category-procedures-desc',
  forms: 'templates-category-forms-desc',
  other: 'templates-category-other-desc'
}

/**
 * TemplateCard Component
 * Clean card layout: header (icon + title), description, tags, usage footer.
 */
const TemplateCard: React.FC<{
  template: TemplateSummary
  onEdit?: (template: TemplateSummary) => void
  testId: string
  getCategoryLabel: (cat: TemplateCategory) => string
  t: (key: string, vars?: Record<string, unknown>) => string
}> = ({ template, onEdit, testId, getCategoryLabel, t }) => {
  const category = template.category || 'other'
  const label = getCategoryLabel(category)
  const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.other
  const isBuiltIn = template.createdBy === 'system'

  const handleCardClick = () => {
    if (onEdit) onEdit(template)
  }

  return (
    <Card
      className={`gba:group gba:relative gba:overflow-hidden gba:border gba:rounded-xl gba:transition-all gba:duration-200 hover:gba:shadow-lg hover:gba:border-primary/20 ${onEdit ? 'gba:cursor-pointer' : ''}`}
      onClick={onEdit ? handleCardClick : undefined}
      data-testid={`${testId}-card`}
    >
      <div className="gba:p-4 gba:flex gba:flex-col gba:gap-3">
        {/* Header: icon, title, edit (inside content so it doesn’t overlap edges) */}
        <div className="gba:flex gba:items-start gba:gap-3">
          <div className="gba:w-11 gba:h-11 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:text-primary">
            {icon}
          </div>
          <div className="gba:flex-1 gba:min-w-0">
            <h3 className="gba:font-semibold gba:text-foreground gba:truncate gba:leading-tight">{template.name}</h3>
            {template.description && (
              <p className="gba:text-sm gba:text-muted-foreground gba:truncate gba:mt-0.5">{template.description}</p>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
          <Badge variant="outline" className="gba:text-xs gba:font-medium">
            {label}
          </Badge>
          {isBuiltIn && (
            <Badge variant="secondary" className="gba:text-xs gba:gap-1">
              <Star className="gba:w-3 gba:h-3" />
              {t('templates-built-in')}
            </Badge>
          )}
          {template.isPublic && !isBuiltIn && (
            <Badge variant="secondary" className="gba:text-xs gba:gap-1">
              <Users className="gba:w-3 gba:h-3" />
              {t('templates-public')}
            </Badge>
          )}
        </div>

        {/* Footer: usage */}
        {template.usageCount !== undefined && template.usageCount > 0 && (
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground gba:pt-1 gba:border-t gba:border-border/50">
            <Clock className="gba:w-3.5 gba:h-3.5" />
            <span>{t('templates-used-times', { count: template.usageCount })}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

/**
 * TemplateGallery Component
 */
export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates,
  onEditTemplate,
  'data-testid': testId = 'template-gallery'
}) => {
  const { t } = useTranslation(translations)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | TemplateCategory>('all')

  const getCategoryLabel = useCallback(
    (cat: TemplateCategory) => t(CATEGORY_LABEL_KEYS[cat] || CATEGORY_LABEL_KEYS.other),
    [t]
  )
  const getCategoryDesc = useCallback(
    (cat: TemplateCategory) => t(CATEGORY_DESC_KEYS[cat] || CATEGORY_DESC_KEYS.other),
    [t]
  )

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let result = templates

    // Filter by category
    if (activeCategory !== 'all') {
      result = result.filter(t => t.category === activeCategory)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return result
  }, [templates, activeCategory, searchQuery])

  // Group templates by category for display
  const templatesByCategory = useMemo(() => {
    const groups: Record<string, TemplateSummary[]> = {}

    filteredTemplates.forEach(template => {
      const cat = template.category || 'other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(template)
    })

    return groups
  }, [filteredTemplates])

  // Only show category tabs for categories that have templates (from API)
  const availableCategories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category))
    return TEMPLATE_CATEGORY_API_VALUES.filter(c => cats.has(c))
  }, [templates])

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Header */}
      <div>
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{t('templates-gallery-title')}</h2>
        <p className="gba:text-sm gba:text-muted-foreground">{t('templates-gallery-subtitle')}</p>
      </div>

      {/* Search */}
      <div className="gba:relative gba:max-w-md">
        <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
        <Input
          placeholder={t('templates-search-placeholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="gba:pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={v => setActiveCategory(v as 'all' | TemplateCategory)}>
        <TabsList className="gba:flex-wrap gba:h-auto gba:gap-1">
          <TabsTrigger value="all" startIcon={<LayoutTemplate className="gba:w-4 gba:h-4" />}>
            {t('templates-all')}
          </TabsTrigger>
          {availableCategories.map(category => {
            const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.other
            const label = getCategoryLabel(category)
            return (
              <TabsTrigger key={category} value={category} startIcon={icon}>
                {label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* All templates view */}
        <TabsContent value="all" className="gba:mt-6">
          {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => {
            const cat = category as TemplateCategory
            return (
              <div key={category} className="gba:mb-8">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                  <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                    {CATEGORY_ICONS[cat] || CATEGORY_ICONS.other}
                  </div>
                  <div>
                    <h3 className="gba:font-semibold gba:text-foreground">{getCategoryLabel(cat)}</h3>
                    <p className="gba:text-xs gba:text-muted-foreground">{getCategoryDesc(cat)}</p>
                  </div>
                </div>
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-4">
                  {categoryTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={onEditTemplate}
                      testId={`${testId}-${template.id}`}
                      getCategoryLabel={getCategoryLabel}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </TabsContent>

        {/* Individual category views */}
        {availableCategories.map(category => (
          <TabsContent key={category} value={category} className="gba:mt-6">
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-4">
              {templatesByCategory[category]?.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={onEditTemplate}
                  testId={`${testId}-${template.id}`}
                  getCategoryLabel={getCategoryLabel}
                  t={t}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Empty state */}
      {filteredTemplates.length === 0 && (
        <Card className="gba:p-12 gba:text-center">
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
            <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-muted gba:flex gba:items-center gba:justify-center">
              <LayoutTemplate className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
            </div>
            <div className="gba:space-y-2">
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('templates-empty-title')}</h3>
              <p className="gba:text-muted-foreground">
                {searchQuery ? t('templates-empty-search') : t('templates-empty-category')}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default TemplateGallery
