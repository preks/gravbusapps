import React, { useEffect, useState } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge
} from '@newwork/nw-design-system'
import { FileText, Layers } from 'lucide-react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface FlowTemplateListProps {
  templates: FlowTemplate[]
  onCreateNew: () => void
  onEdit: (template: FlowTemplate) => void
  onDelete?: (template: FlowTemplate) => Promise<void>
  onTemplateSelect?: (template: FlowTemplate | null) => void
  selectedTemplate?: FlowTemplate | null
  accessToken?: string
  searchTerm?: string
  'data-testid'?: string
}

/**
 * Component displaying a list of flow templates with options to create new, edit, or delete existing ones
 */
export const FlowTemplateList: React.FC<FlowTemplateListProps> = ({
  templates,
  onEdit,
  onTemplateSelect,
  selectedTemplate,
  searchTerm = '',
  accessToken = '',
  'data-testid': testId = 'flow-template-list'
}) => {
  const catalogClient = useCatalogManagerClient(accessToken)
  const [catalogMap, setCatalogMap] = useState<Record<string, string>>({})

  // Parse catalog reference to extract identifier, version, and code
  const parseCatalogReference = (
    catalogRef: string
  ): { catalogIdentifier: string; version: string; code: string } | null => {
    const parts = catalogRef.split(':')
    if (parts.length !== 3) return null
    return {
      catalogIdentifier: parts[0],
      version: parts[1],
      code: parts[2]
    }
  }

  // Load all catalog entries based on templates (apps and service categories)
  useEffect(() => {
    const loadCatalogs = async () => {
      if (!accessToken || templates.length === 0) return

      // Collect unique catalog references from all templates
      const catalogRefsSet = new Set<string>()
      for (const template of templates) {
        // Add app catalog references
        if (template.tags?.app) {
          const parsed = parseCatalogReference(template.tags.app)
          if (parsed) {
            catalogRefsSet.add(`${parsed.catalogIdentifier}:${parsed.version}`)
          }
        }
        // Add service category catalog references
        const serviceCategory = template.tags?.serviceCategory
        if (serviceCategory) {
          const categoryValue = Array.isArray(serviceCategory) ? serviceCategory[0] : serviceCategory
          const parsed = parseCatalogReference(categoryValue)
          if (parsed) {
            catalogRefsSet.add(`${parsed.catalogIdentifier}:${parsed.version}`)
          }
        }
      }

      // Load catalog entries for each unique catalog reference
      const allCatalogMap: Record<string, string> = {}

      for (const catalogRef of catalogRefsSet) {
        try {
          const [catalogIdentifier, version] = catalogRef.split(':')
          const response = await catalogClient.getCatalogEntriesList(
            { catalogIdentifier, version },
            {
              limit: 100,
              includeChildCatalogEntries: true,
              returnTotalRecords: true
            }
          )

          // Map each entry using the full catalog reference format
          for (const entry of response.data || []) {
            const catalogValue = `${catalogIdentifier}:${version}:${entry.code}`
            allCatalogMap[catalogValue] = entry.value || entry.code || entry.id
          }
        } catch (err) {
          console.error(`Error loading catalog ${catalogRef}:`, err)
        }
      }

      setCatalogMap(allCatalogMap)
    }

    loadCatalogs()
  }, [accessToken, templates, catalogClient])

  // Resolve catalog entry name from catalog value
  const resolveCatalogName = (catalogValue: string): string => {
    return catalogMap[catalogValue] || catalogValue
  }

  if (templates.length === 0) {
    return (
      <div className="gba:text-center gba:py-16" data-testid={`${testId}-empty`}>
        <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
          <FileText className="gba:h-8 gba:w-8 gba:text-muted-foreground" />
        </div>
        {searchTerm ? (
          <div className="gba:space-y-2">
            <h3 className="gba:font-medium gba:text-foreground">No results found</h3>
            <p className="gba:text-sm gba:text-muted-foreground">
              No templates match "{searchTerm}". Try a different search term.
            </p>
          </div>
        ) : (
          <div className="gba:space-y-2">
            <h3 className="gba:font-medium gba:text-foreground">No flows yet</h3>
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('flow.creator.noTemplates', 'Create your first flow to get started.')}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="gba:border-border gba:overflow-hidden" data-testid={testId}>
      <CardContent className="gba:p-0" data-testid={`${testId}-content`}>
        <Table className="gba:table-fixed gba:w-full" data-testid={`${testId}-table`}>
          <TableHeader>
            <TableRow className="gba:border-border gba:hover:bg-transparent">
              <TableHead
                className="gba:text-muted-foreground gba:font-medium gba:w-[55%]"
                data-testid={`${testId}-header-name`}
              >
                {getTranslationFromI18nKeyAndLabel('flow.creator.templateName', 'Name')}
              </TableHead>
              <TableHead
                className="gba:text-muted-foreground gba:font-medium gba:w-[35%]"
                data-testid={`${testId}-header-service-category`}
              >
                {getTranslationFromI18nKeyAndLabel('flow.creator.serviceCategory', 'Category')}
              </TableHead>
              <TableHead
                className="gba:text-muted-foreground gba:font-medium gba:w-[10%] gba:text-center"
                data-testid={`${testId}-header-steps`}
              >
                {getTranslationFromI18nKeyAndLabel('flow.creator.templateSteps', 'Steps')}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {templates.map((template, index) => {
              const isSelected = selectedTemplate?.id === template.id
              return (
                <TableRow
                  key={template.id || index}
                  data-testid={`${testId}-row-${index}`}
                  className={`gba:border-border gba:cursor-pointer gba:transition-colors ${
                    isSelected ? 'gba:bg-primary/5' : 'gba:hover:bg-muted/50'
                  }`}
                  onClick={() => onEdit(template)}
                >
                  <TableCell data-testid={`${testId}-title-${index}`} className="gba:overflow-hidden">
                    <div className="gba:space-y-1 gba:min-w-0">
                      <div className="gba:font-medium gba:text-card-foreground gba:truncate">
                        {template.name || 'Untitled Flow'}
                      </div>
                      {template.description && (
                        <div className="gba:text-sm gba:text-muted-foreground gba:truncate">{template.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`${testId}-service-category-${index}`} className="gba:overflow-hidden">
                    <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:min-w-0">
                      {template.tags?.serviceCategory && (
                        <Badge variant="secondary" className="gba:truncate gba:max-w-full">
                          {resolveCatalogName(
                            Array.isArray(template.tags.serviceCategory)
                              ? template.tags.serviceCategory[0]
                              : template.tags.serviceCategory
                          )}
                        </Badge>
                      )}
                      {template.tags?.app && (
                        <Badge variant="outline" className="gba:text-muted-foreground gba:truncate gba:max-w-full">
                          {resolveCatalogName(template.tags.app)}
                        </Badge>
                      )}
                      {!template.tags?.serviceCategory && !template.tags?.app && (
                        <span className="gba:text-muted-foreground gba:text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`${testId}-steps-${index}`} className="gba:text-center">
                    <Badge
                      variant="outline"
                      className="gba:cursor-pointer"
                      onClick={e => {
                        e.stopPropagation()
                        onTemplateSelect?.(template)
                      }}
                    >
                      <Layers className="gba:h-3 gba:w-3 gba:mr-1" />
                      {template.steps?.length || 0}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
