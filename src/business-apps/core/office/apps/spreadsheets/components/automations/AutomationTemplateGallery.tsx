/**
 * AutomationTemplateGallery Component
 *
 * Browse and select pre-built automation templates.
 * Provides a visual gallery with filtering and preview capabilities.
 */

import React, { useState, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ScrollArea,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Search,
  Star,
  ClipboardCheck,
  DollarSign,
  Users,
  Settings,
  FileText,
  Briefcase,
  ChevronRight,
  Check,
  Zap
} from 'lucide-react'
import type { AutomationTemplate, AutomationTemplateCategory, SpreadsheetAutomation } from '../../types/automation'
import {
  automationTemplates,
  getFeaturedTemplates,
  getTemplatesByCategory,
  createAutomationFromTemplate
} from '../../data/automationTemplates'
import translations from '../../_i18n'

export interface AutomationTemplateGalleryProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback to close the dialog */
  onClose: () => void
  /** Callback when a template is selected */
  onSelectTemplate: (automation: Omit<SpreadsheetAutomation, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>) => void
  /** Data test ID */
  'data-testid'?: string
}

interface CategoryConfig {
  id: AutomationTemplateCategory | 'all' | 'featured'
  label: string
  icon: React.FC<{ className?: string }>
  description: string
}

const CATEGORIES: CategoryConfig[] = [
  { id: 'featured', label: 'Featured', icon: Star, description: 'Popular templates' },
  { id: 'all', label: 'All', icon: Zap, description: 'All templates' },
  { id: 'approval', label: 'Approvals', icon: ClipboardCheck, description: 'Approval workflows' },
  { id: 'finance', label: 'Finance', icon: DollarSign, description: 'Financial processes' },
  { id: 'hr', label: 'HR', icon: Users, description: 'Human resources' },
  { id: 'operations', label: 'Operations', icon: Settings, description: 'Operational tasks' },
  { id: 'compliance', label: 'Compliance', icon: FileText, description: 'Compliance checks' }
]

/**
 * Get icon for template category
 */
function getCategoryIcon(category: AutomationTemplateCategory) {
  switch (category) {
    case 'approval':
      return ClipboardCheck
    case 'finance':
      return DollarSign
    case 'hr':
      return Users
    case 'operations':
      return Settings
    case 'compliance':
      return FileText
    case 'collection':
    case 'review':
    default:
      return Briefcase
  }
}

/**
 * TemplateCard Component
 */
interface TemplateCardProps {
  template: AutomationTemplate
  isSelected: boolean
  onSelect: () => void
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, isSelected, onSelect }) => {
  const CategoryIcon = getCategoryIcon(template.category)

  return (
    <Card
      className={`gba:cursor-pointer gba:transition-all gba:h-full ${
        isSelected ? 'gba:border-primary gba:ring-2 gba:ring-primary/20' : 'gba:hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:items-start gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div
              className={`gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center ${
                isSelected ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-muted'
              }`}
            >
              <CategoryIcon className="gba:w-5 gba:h-5" />
            </div>
            <div>
              <CardTitle className="gba:text-base">{template.name}</CardTitle>
              <Badge variant="outline" className="gba:text-xs gba:mt-1">
                {template.category}
              </Badge>
            </div>
          </div>
          {template.isFeatured && <Star className="gba:w-4 gba:h-4 gba:text-warning gba:fill-warning" />}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="gba:text-sm gba:line-clamp-2 gba:mb-3">{template.description}</CardDescription>

        {template.useCases && template.useCases.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-1">
            {template.useCases.slice(0, 3).map(useCase => (
              <Badge key={useCase} variant="outline" className="gba:text-xs">
                {useCase}
              </Badge>
            ))}
          </div>
        )}

        <div className="gba:flex gba:items-center gba:justify-between gba:mt-3 gba:pt-3 gba:border-t">
          <span className="gba:text-xs gba:text-muted-foreground">
            {template.automationConfig.type.replace('_', ' ')}
          </span>
          {isSelected ? (
            <Check className="gba:w-5 gba:h-5 gba:text-primary" />
          ) : (
            <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * AutomationTemplateGallery Component
 */
export const AutomationTemplateGallery: React.FC<AutomationTemplateGalleryProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  'data-testid': testId = 'automation-template-gallery'
}) => {
  const { t } = useTranslation(translations)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryConfig['id']>('featured')
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null)

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates: AutomationTemplate[]

    // Get templates by category
    if (activeCategory === 'featured') {
      templates = getFeaturedTemplates()
    } else if (activeCategory === 'all') {
      templates = automationTemplates
    } else {
      templates = getTemplatesByCategory(activeCategory as AutomationTemplateCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      templates = templates.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.useCases?.some(u => u.toLowerCase().includes(query))
      )
    }

    return templates
  }, [activeCategory, searchQuery])

  // Handle template selection
  const handleSelectTemplate = useCallback((template: AutomationTemplate) => {
    setSelectedTemplate(template)
  }, [])

  // Handle use template
  const handleUseTemplate = useCallback(() => {
    if (selectedTemplate) {
      const automation = createAutomationFromTemplate(selectedTemplate)
      onSelectTemplate(automation)
      onClose()
    }
  }, [selectedTemplate, onSelectTemplate, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="gba:max-w-4xl gba:max-h-[85vh] gba:flex gba:flex-col" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Zap className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('templates-title')}
          </DialogTitle>
          <DialogDescription>{t('templates-description')}</DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="gba:relative">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <Input
            placeholder={t('templates-search-placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:pl-10"
          />
        </div>

        {/* Categories */}
        <Tabs
          value={activeCategory}
          onValueChange={v => setActiveCategory(v as CategoryConfig['id'])}
          className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden"
        >
          <TabsList className="gba:w-full gba:justify-start gba:overflow-x-auto">
            {CATEGORIES.map(category => {
              const Icon = category.icon
              return (
                <TabsTrigger key={category.id} value={category.id} className="gba:gap-1">
                  <Icon className="gba:w-4 gba:h-4" />
                  {category.label}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* Template Grid */}
          <TabsContent value={activeCategory} className="gba:flex-1 gba:overflow-hidden gba:mt-4">
            <ScrollArea className="gba:h-[400px]">
              {filteredTemplates.length === 0 ? (
                <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
                  <Zap className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
                  <p className="gba:text-lg gba:font-medium">{t('templates-empty-title')}</p>
                  <p className="gba:text-sm gba:mt-1">
                    {searchQuery ? t('templates-empty-search') : t('templates-empty-category')}
                  </p>
                </div>
              ) : (
                <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:pr-4">
                  {filteredTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isSelected={selectedTemplate?.id === template.id}
                      onSelect={() => handleSelectTemplate(template)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Selected Template Preview */}
        {selectedTemplate && (
          <div className="gba:border-t gba:pt-4 gba:mt-2">
            <div className="gba:flex gba:items-start gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:font-semibold">{selectedTemplate.name}</h3>
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{selectedTemplate.description}</p>
                {selectedTemplate.requiredColumns && selectedTemplate.requiredColumns.length > 0 && (
                  <div className="gba:mt-2">
                    <span className="gba:text-xs gba:text-muted-foreground">{t('templates-required-columns')} </span>
                    {selectedTemplate.requiredColumns.map((col, i) => (
                      <React.Fragment key={col}>
                        <code className="gba:text-xs gba:bg-muted gba:px-1 gba:rounded">{col}</code>
                        {i < selectedTemplate.requiredColumns!.length - 1 && ', '}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
              <div className="gba:text-right">
                <Badge variant="outline" className="gba:mb-1">
                  {selectedTemplate.automationConfig.type.replace('_', ' ')}
                </Badge>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {t('templates-trigger')}: {selectedTemplate.automationConfig.trigger}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('checkpoint-cancel')}
          </Button>
          <Button onClick={handleUseTemplate} disabled={!selectedTemplate}>
            <Check className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('templates-use-template')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AutomationTemplateGallery
