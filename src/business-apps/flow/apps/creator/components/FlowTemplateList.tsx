import React from 'react'
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
  searchTerm = '',
  'data-testid': testId = 'flow-template-list'
}) => {
  return (
    <>
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
                  <TableHead className="gba:max-w-md" data-testid={`${testId}-header-description`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.templateDescription', 'Description')}
                  </TableHead>
                  <TableHead data-testid={`${testId}-header-steps`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.templateSteps', 'Steps')}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {templates.map((template, index) => (
                  <TableRow
                    key={template.id || index}
                    data-testid={`${testId}-row-${index}`}
                    className="hover:gba:bg-gray-50 gba:cursor-pointer"
                    onClick={() => onEdit(template)}
                  >
                    <TableCell className="gba:font-medium" data-testid={`${testId}-title-${index}`}>
                      {template.name || 'Untitled Definition'}
                    </TableCell>
                    <TableCell className="gba:max-w-md gba:truncate" data-testid={`${testId}-description-${index}`}>
                      {(template.description || 'No description').length > 100
                        ? `${(template.description || 'No description').substring(0, 100)}...`
                        : template.description || 'No description'}
                    </TableCell>
                    <TableCell data-testid={`${testId}-steps-${index}`}>
                      <Badge variant="outline">{template.steps?.length || 0} steps</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
