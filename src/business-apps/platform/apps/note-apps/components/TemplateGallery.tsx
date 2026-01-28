/**
 * TemplateGallery Component
 *
 * A dialog for browsing and selecting note templates.
 */

import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Card,
  Badge,
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { Search, FileText, Sparkles } from 'lucide-react'
import type { NoteTemplate, NoteColor } from '../types'
import { builtInTemplates, getTemplateCategories } from '../utils/noteTemplates'

export interface TemplateGalleryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: NoteTemplate) => void
  'data-testid'?: string
}

// Color mapping for template cards
const colorClasses: Record<NoteColor, string> = {
  default: 'gba:bg-card',
  red: 'gba:bg-destructive-secondary/20',
  orange: 'gba:bg-warning-secondary/20',
  yellow: 'gba:bg-warning-secondary/10',
  green: 'gba:bg-success-secondary/20',
  teal: 'gba:bg-success-secondary/10',
  blue: 'gba:bg-info-secondary/20',
  purple: 'gba:bg-primary/10',
  pink: 'gba:bg-destructive-secondary/10',
  gray: 'gba:bg-muted/50'
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  open,
  onOpenChange,
  onSelectTemplate,
  'data-testid': testId = 'template-gallery'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = getTemplateCategories()

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = builtInTemplates

    // Filter by category
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      templates = templates.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      )
    }

    return templates
  }, [selectedCategory, searchQuery])

  const handleSelect = (template: NoteTemplate) => {
    onSelectTemplate(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-3xl gba:h-[80vh] gba:flex gba:flex-col" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Sparkles className="gba:w-5 gba:h-5 gba:text-primary" />
            Choose a Template
          </DialogTitle>
          <DialogDescription>Start with a pre-built template to save time</DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="gba:relative">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="gba:flex-1 gba:flex gba:flex-col gba:min-h-0">
          <TabsList className="gba:w-full gba:justify-start gba:flex-wrap gba:h-auto gba:gap-1">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map(cat => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="gba:flex-1 gba:mt-4 gba:min-h-0">
            <ScrollArea className="gba:h-full gba:pr-4">
              {filteredTemplates.length === 0 ? (
                <div className="gba:py-12 gba:text-center gba:text-muted-foreground">
                  <FileText className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-3 gba:opacity-50" />
                  <p>No templates found</p>
                  {searchQuery && <p className="gba:text-sm gba:mt-1">Try a different search term</p>}
                </div>
              ) : (
                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  {filteredTemplates.map(template => (
                    <Card
                      key={template.id}
                      className={`gba:p-4 gba:cursor-pointer gba:transition-all hover:gba:shadow-md hover:gba:scale-[1.02] gba:group ${
                        colorClasses[template.color || 'default']
                      }`}
                      onClick={() => handleSelect(template)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleSelect(template)
                        }
                      }}
                    >
                      <div className="gba:flex gba:items-start gba:gap-3">
                        <div className="gba:text-2xl gba:flex-shrink-0">{template.icon}</div>
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <h3 className="gba:font-semibold gba:text-foreground group-hover:gba:text-primary gba:transition-colors">
                              {template.name}
                            </h3>
                            {template.isBuiltIn && (
                              <Badge variant="secondary" className="gba:text-xs">
                                Built-in
                              </Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <Badge variant="outline" className="gba:mt-2 gba:text-xs gba:capitalize">
                            {template.category}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              handleSelect({
                id: 'blank',
                name: 'Blank Note',
                content: '<p></p>',
                category: 'other',
                isBuiltIn: true
              })
            }
          >
            <FileText className="gba:w-4 gba:h-4 gba:mr-2" />
            Start Blank
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TemplateGallery
