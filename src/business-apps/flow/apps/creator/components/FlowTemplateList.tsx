import React, { useEffect, useState } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge
} from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
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
  onCreateNew,
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

  return (
    <Card className="gba:w-full" data-testid={testId}>
      <CardHeader
        className="gba:flex gba:flex-row gba:items-center gba:justify-between"
        data-testid={`${testId}-header`}
      >
        <div data-testid={`${testId}-header-title`}>
          <CardTitle>{getTranslationFromI18nKeyAndLabel('flow.creator.templatesList', 'Flow Definitions')}</CardTitle>
          <CardDescription>
            {getTranslationFromI18nKeyAndLabel(
              'flow.creator.templatesDescription',
              'Create and manage flow definitions'
            )}
          </CardDescription>
        </div>

        <Button
          onClick={onCreateNew}
          className="gba:bg-gradient-to-r gba:from-purple-600 gba:to-indigo-600 gba:hover:from-purple-700 gba:hover:to-indigo-700 gba:text-white gba:font-semibold gba:py-2 gba:px-4 gba:rounded-lg gba:shadow-lg gba:shadow-purple-500/25 gba:transition-all gba:duration-200 gba:hover:shadow-xl gba:hover:shadow-purple-500/40 gba:hover:scale-[1.02]"
          data-testid={`${testId}-create-button`}
        >
          <Plus className="gba:h-5 gba:w-5 gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel('flow.creator.createNew', 'Create New')}
        </Button>
      </CardHeader>

      <CardContent data-testid={`${testId}-content`}>
        {templates.length === 0 ? (
          <div className="gba:text-center gba:py-8 gba:text-gray-500" data-testid={`${testId}-empty`}>
            {searchTerm ? (
              <div className="gba:space-y-2">
                <p>No templates found for "{searchTerm}"</p>
                <p className="gba:text-sm gba:text-gray-400">
                  Try a different search term or clear the search to see all templates.
                </p>
              </div>
            ) : (
              getTranslationFromI18nKeyAndLabel(
                'flow.creator.noTemplates',
                'No flow definitions found. Create your first definition!'
              )
            )}
          </div>
        ) : (
          <Table data-testid={`${testId}-table`}>
            <TableHeader>
              <TableRow>
                <TableHead data-testid={`${testId}-header-name`}>
                  {getTranslationFromI18nKeyAndLabel('flow.creator.templateName', 'Name')}
                </TableHead>
                <TableHead data-testid={`${testId}-header-service-category`}>
                  {getTranslationFromI18nKeyAndLabel('flow.creator.serviceCategory', 'Category and App')}
                </TableHead>
                <TableHead data-testid={`${testId}-header-steps`}>
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
                    className={`hover:gba:bg-gray-50 gba:cursor-pointer ${isSelected ? 'gba:bg-blue-50' : ''}`}
                    onClick={() => onEdit(template)}
                  >
                    <TableCell data-testid={`${testId}-title-${index}`} className="gba:max-w-xl gba:w-full">
                      <div className="gba:space-y-1 gba:w-full">
                        {/* Template Name */}
                        <div className="gba:font-medium gba:break-words gba:whitespace-normal">
                          {template.name || 'Untitled Definition'}
                        </div>

                        {/* Description */}
                        {template.description && (
                          <div className="gba:text-xs gba:text-gray-600 gba:break-words gba:whitespace-normal">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`${testId}-service-category-${index}`}>
                      <div className="gba:space-y-1.5">
                        {/* Service Category */}
                        {template.tags?.serviceCategory && (
                          <div>
                            <Badge variant="secondary" className="gba:font-medium">
                              {resolveCatalogName(
                                Array.isArray(template.tags.serviceCategory)
                                  ? template.tags.serviceCategory[0]
                                  : template.tags.serviceCategory
                              )}
                            </Badge>
                          </div>
                        )}

                        {/* Application */}
                        {template.tags?.app && (
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <svg
                              className="gba:w-3 gba:h-3 gba:text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                              />
                            </svg>
                            <span className="gba:text-xs gba:text-gray-600">
                              {resolveCatalogName(template.tags.app)}
                            </span>
                          </div>
                        )}

                        {/* Show dash if both are missing */}
                        {!template.tags?.serviceCategory && !template.tags?.app && (
                          <span className="gba:text-gray-400 gba:text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`${testId}-steps-${index}`}>
                      <Badge
                        variant={isSelected ? 'default' : 'outline'}
                        className="gba:cursor-pointer hover:gba:bg-blue-100"
                        onClick={e => {
                          e.stopPropagation() // Prevent row click (edit action)
                          onTemplateSelect?.(template)
                        }}
                      >
                        {template.steps?.length || 0} steps
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
