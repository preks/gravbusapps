import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from '@newwork/nw-design-system';

// Custom Icon component since we don't have direct icon import
const Icon = ({ name, className = '', ...props }: any) => {
  // Simple icon implementation
  return (
    <span className={`gba:inline-block ${className}`} {...props}>
      {name === 'plus' && '+'}
      {name === 'pencil' && '✏️'}
    </span>
  );
};

interface FlowTemplateListProps {
  templates: FlowTemplate[];
  onCreateNew: () => void;
  onEdit: (template: FlowTemplate) => void;
  'data-testid'?: string;
}

/**
 * Component displaying a list of flow templates with options to create new or edit existing ones
 */
export const FlowTemplateList: React.FC<FlowTemplateListProps> = ({
  templates,
  onCreateNew,
  onEdit,
  'data-testid': testId = 'flow-template-list'
}) => {
  return (
    <Card className="gba:w-full" data-testid={testId}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between" data-testid={`${testId}-header`}>
        <div data-testid={`${testId}-header-title`}>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('flow.creator.templatesList', 'Templates')}
          </CardTitle>
          <CardDescription>
            {getTranslationFromI18nKeyAndLabel('flow.creator.templatesDescription', 'Create and manage workflow templates')}
          </CardDescription>
        </div>
        
        <Button 
          onClick={onCreateNew} 
          data-testid={`${testId}-create-button`}
        >
          <Icon name="plus" className="gba:mr-2 gba:h-4 gba:w-4" />
          {getTranslationFromI18nKeyAndLabel('flow.creator.createNew', 'Create New')}
        </Button>
      </CardHeader>
      
      <CardContent data-testid={`${testId}-content`}>
        {!templates || templates.length === 0 ? (
          <div 
            className="gba:text-center gba:p-8 gba:border gba:border-dashed gba:rounded-md" 
            data-testid={`${testId}-empty-state`}
          >
            <p className="gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel('flow.creator.noTemplates', 'No templates found')}
            </p>
            <Button 
              variant="outline" 
              onClick={onCreateNew} 
              className="gba:mt-4" 
              data-testid={`${testId}-empty-create-button`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.creator.createFirst', 'Create your first template')}
            </Button>
          </div>
        ) : (
          <Table data-testid={`${testId}-table`}>
            <TableHeader>
              <TableRow>
                <TableHead data-testid={`${testId}-header-title`}>
                  {getTranslationFromI18nKeyAndLabel('flow.creator.title', 'Title')}
                </TableHead>
                <TableHead data-testid={`${testId}-header-description`}>
                  {getTranslationFromI18nKeyAndLabel('flow.creator.description', 'Description')}
                </TableHead>
                <TableHead data-testid={`${testId}-header-steps`}>
                  {getTranslationFromI18nKeyAndLabel('flow.creator.steps', 'Steps')}
                </TableHead>
                <TableHead className="gba:w-[100px]" data-testid={`${testId}-header-actions`}>
                  {getTranslationFromI18nKeyAndLabel('flow.creator.actions', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template, index) => (
                <TableRow key={template.id || index} data-testid={`${testId}-row-${index}`}>
                  <TableCell className="gba:font-medium" data-testid={`${testId}-title-${index}`}>
                    {template.name || 'Untitled Template'}
                  </TableCell>
                  <TableCell data-testid={`${testId}-description-${index}`}>
                    {template.description || 'No description'}
                  </TableCell>
                  <TableCell data-testid={`${testId}-steps-${index}`}>
                    <Badge variant="outline">{template.steps?.length || 0}</Badge>
                  </TableCell>
                  <TableCell data-testid={`${testId}-actions-${index}`}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(template)}
                      data-testid={`${testId}-edit-${index}`}
                    >
                      <Icon name="pencil" className="gba:h-4 gba:w-4" />
                      <span className="gba:sr-only">
                        {getTranslationFromI18nKeyAndLabel('flow.creator.edit', 'Edit')}
                      </span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
