/**
 * TemplateGallery Component
 *
 * Displays document templates organized by category
 * for creating new documents.
 */

import React, { useState, useMemo } from 'react'
import { Card, Badge, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
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

export interface TemplateGalleryProps {
  templates: TemplateSummary[]
  onSelectTemplate: (template: DocumentTemplate) => void
  onEditTemplate?: (template: TemplateSummary) => void
  'data-testid'?: string
}

/**
 * Category configuration with icons and labels
 */
const CATEGORY_CONFIG: Record<TemplateCategory, { icon: React.ReactNode; label: string; description: string }> = {
  contracts: {
    icon: <FileSignature className="gba:w-4 gba:h-4" />,
    label: 'Contracts',
    description: 'Legal agreements and contracts'
  },
  agreements: {
    icon: <FileCheck className="gba:w-4 gba:h-4" />,
    label: 'Agreements',
    description: 'Business agreements'
  },
  letters: {
    icon: <Mail className="gba:w-4 gba:h-4" />,
    label: 'Letters',
    description: 'Business correspondence'
  },
  reports: {
    icon: <ClipboardList className="gba:w-4 gba:h-4" />,
    label: 'Reports',
    description: 'Reports and summaries'
  },
  proposals: {
    icon: <Briefcase className="gba:w-4 gba:h-4" />,
    label: 'Proposals',
    description: 'Business proposals'
  },
  policies: {
    icon: <ScrollText className="gba:w-4 gba:h-4" />,
    label: 'Policies',
    description: 'Company policies'
  },
  procedures: {
    icon: <BookOpen className="gba:w-4 gba:h-4" />,
    label: 'Procedures',
    description: 'Standard procedures'
  },
  forms: {
    icon: <FileText className="gba:w-4 gba:h-4" />,
    label: 'Forms',
    description: 'Form templates'
  },
  other: {
    icon: <LayoutTemplate className="gba:w-4 gba:h-4" />,
    label: 'Other',
    description: 'Other templates'
  }
}

/**
 * TemplateCard Component
 * Clean card layout: header (icon + title), description, tags, usage footer.
 */
const TemplateCard: React.FC<{
  template: TemplateSummary
  onEdit?: (template: TemplateSummary) => void
  testId: string
}> = ({ template, onEdit, testId }) => {
  const categoryConfig = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.other
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
            {categoryConfig.icon}
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
            {categoryConfig.label}
          </Badge>
          {isBuiltIn && (
            <Badge variant="secondary" className="gba:text-xs gba:gap-1">
              <Star className="gba:w-3 gba:h-3" />
              Built-in
            </Badge>
          )}
          {template.isPublic && !isBuiltIn && (
            <Badge variant="secondary" className="gba:text-xs gba:gap-1">
              <Users className="gba:w-3 gba:h-3" />
              Public
            </Badge>
          )}
        </div>

        {/* Footer: usage */}
        {template.usageCount !== undefined && template.usageCount > 0 && (
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground gba:pt-1 gba:border-t gba:border-border/50">
            <Clock className="gba:w-3.5 gba:h-3.5" />
            <span>Used {template.usageCount} times</span>
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
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | TemplateCategory>('all')

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
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">Template Gallery</h2>
        <p className="gba:text-sm gba:text-muted-foreground">Start with a template to save time</p>
      </div>

      {/* Search */}
      <div className="gba:relative gba:max-w-md">
        <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="gba:pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={v => setActiveCategory(v as 'all' | TemplateCategory)}>
        <TabsList className="gba:flex-wrap gba:h-auto gba:gap-1">
          <TabsTrigger value="all" startIcon={<LayoutTemplate className="gba:w-4 gba:h-4" />}>
            All Templates
          </TabsTrigger>
          {availableCategories.map(category => {
            const config = CATEGORY_CONFIG[category]
            return (
              <TabsTrigger key={category} value={category} startIcon={config.icon}>
                {config.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* All templates view */}
        <TabsContent value="all" className="gba:mt-6">
          {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => {
            const config = CATEGORY_CONFIG[category as TemplateCategory] || CATEGORY_CONFIG.other
            return (
              <div key={category} className="gba:mb-8">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                  <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                    {config.icon}
                  </div>
                  <div>
                    <h3 className="gba:font-semibold gba:text-foreground">{config.label}</h3>
                    <p className="gba:text-xs gba:text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-4">
                  {categoryTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={onEditTemplate}
                      testId={`${testId}-${template.id}`}
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
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">No templates found</h3>
              <p className="gba:text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'No templates available in this category'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default TemplateGallery
