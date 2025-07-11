import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { FlowTemplate, TaskExecutionType } from '../../types/flowTemplate';
import { Button, Badge, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, CardHeader, CardTitle, CardDescription, CardContent } from '@newwork/nw-design-system';

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
        {templates.length === 0 ? (
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
                <TableHead data-testid={`${testId}-header-execution`}>
                  {getTranslationFromI18nKeyAndLabel('flow.creator.executionMode', 'Execution')}
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
              {templates.map((template) => (
                <TableRow key={template.id} data-testid={`${testId}-row-${template.id}`}>
                  <TableCell className="gba:font-medium" data-testid={`${testId}-title-${template.id}`}>
                    {template.title}
                  </TableCell>
                  <TableCell data-testid={`${testId}-description-${template.id}`}>
                    {template.description}
                  </TableCell>
                  <TableCell data-testid={`${testId}-execution-${template.id}`}>
                                    <Badge variant={template.executionStrategy === TaskExecutionType.SEQUENTIAL ? 'default' : 'secondary'}>
                  {template.executionStrategy === TaskExecutionType.SEQUENTIAL 
                        ? getTranslationFromI18nKeyAndLabel('flow.creator.sequential', 'Sequential')
                        : getTranslationFromI18nKeyAndLabel('flow.creator.parallel', 'Parallel')
                      }
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`${testId}-steps-${template.id}`}>
                    <Badge variant="outline">{template.steps.length}</Badge>
                  </TableCell>
                  <TableCell data-testid={`${testId}-actions-${template.id}`}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(template)}
                      data-testid={`${testId}-edit-${template.id}`}
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
