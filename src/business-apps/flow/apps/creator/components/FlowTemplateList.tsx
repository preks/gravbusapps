import React, { useState } from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@newwork/nw-design-system';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { AlertTriangle, Plus } from 'lucide-react';
import { message } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';

interface FlowTemplateListProps {
  templates: FlowTemplate[];
  onCreateNew: () => void;
  onEdit: (template: FlowTemplate) => void;
  onDelete: (template: FlowTemplate) => Promise<void>;
  onTemplateSelect?: (template: FlowTemplate | null) => void;
  selectedTemplate?: FlowTemplate | null;
  accessToken: string;
  'data-testid'?: string;
}

/**
 * Component displaying a list of flow templates with options to create new, edit, or delete existing ones
 */
export const FlowTemplateList: React.FC<FlowTemplateListProps> = ({
  templates,
  onCreateNew,
  onEdit,
  onDelete,
  onTemplateSelect,
  selectedTemplate,
  accessToken,
  'data-testid': testId = 'flow-template-list'
}) => {
  const [deletingTemplate, setDeletingTemplate] = useState<FlowTemplate | null>(null);

  const handleDeleteClick = (template: FlowTemplate) => {
    setDeletingTemplate(template);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTemplate) return;

    try {
      await onDelete(deletingTemplate);
      message.success(getTranslationFromI18nKeyAndLabel('flow.creator.deleteSuccess', 'Definition deleted successfully'));
      setDeletingTemplate(null);
    } catch (error) {
      console.error('Failed to delete template:', error);
      message.error(getTranslationFromI18nKeyAndLabel('flow.creator.deleteError', 'Failed to delete definition'));
    }
  };

  const handleCancelDelete = () => {
    setDeletingTemplate(null);
  };

  return (
    <>
      <Card className="gba:w-full" data-testid={testId}>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between" data-testid={`${testId}-header`}>
          <div data-testid={`${testId}-header-title`}>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('flow.creator.templatesList', 'Flow Definitions')}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel('flow.creator.templatesDescription', 'Create and manage flow definitions')}
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
              {getTranslationFromI18nKeyAndLabel('flow.creator.noTemplates', 'No flow definitions found. Create your first definition!')}
            </div>
          ) : (
            <Table data-testid={`${testId}-table`}>
              <TableHeader>
                <TableRow>
                  <TableHead className="gba:w-[60px]" data-testid={`${testId}-header-actions`}>
                    ACTIONS
                  </TableHead>
                  <TableHead data-testid={`${testId}-header-name`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.templateName', 'Name')}
                  </TableHead>
                  <TableHead data-testid={`${testId}-header-description`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.templateDescription', 'Description')}
                  </TableHead>
                  <TableHead data-testid={`${testId}-header-steps`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.templateSteps', 'Steps')}
                  </TableHead>
                  <TableHead data-testid={`${testId}-header-edit-actions`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.templateActions', 'Actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {templates.map((template, index) => {
                  const isSelected = selectedTemplate?.id === template.id;
                  return (
                    <TableRow 
                      key={template.id || index} 
                      data-testid={`${testId}-row-${index}`}
                      className={isSelected ? 'gba:bg-blue-50 gba:border-l-4 gba:border-l-blue-500' : 'hover:gba:bg-gray-50 gba:cursor-pointer'}
                      onClick={() => onTemplateSelect?.(template)}
                    >
                      <TableCell className="gba:py-4 gba:px-6" data-testid={`${testId}-app-actions-${index}`}>
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            data-testid={`flow-template-update-button-${template.id || index}`}
                            variant="secondary"
                            contextsArray={[FlowContextName.flowEntity]}
                            externalContextData={{ entityId: template.id || `template-${index}` }}
                            prefixDataTestId="flow-template-update"
                            accessToken={accessToken}
                            emptyStateBehavior="disable"
                            deferMainContextRequestsUntilClick
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="gba:font-medium" data-testid={`${testId}-title-${index}`}>
                        {template.name || 'Untitled Definition'}
                      </TableCell>
                      <TableCell data-testid={`${testId}-description-${index}`}>
                        {template.description || 'No description'}
                      </TableCell>
                      <TableCell data-testid={`${testId}-steps-${index}`}>
                        <Badge variant="outline">{template.steps?.length || 0} steps</Badge>
                      </TableCell>
                      <TableCell data-testid={`${testId}-actions-${index}`}>
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(template);
                            }}
                            data-testid={`${testId}-edit-${index}`}
                          >
                            <EditOutlined />
                            {getTranslationFromI18nKeyAndLabel('flow.creator.edit', 'Edit')}
                          </Button>
                          {/* Temporarily disabled - Delete button */}
                          {/*
                          <Button 
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(template);
                            }}
                            data-testid={`${testId}-delete-${index}`}
                          >
                            <DeleteOutlined />
                            {getTranslationFromI18nKeyAndLabel('flow.creator.delete', 'Delete')}
                          </Button>
                          */}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTemplate} onOpenChange={(open) => !open && handleCancelDelete()}>
        <DialogContent data-testid={`${testId}-delete-modal`}>
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <AlertTriangle className="gba:h-5 gba:w-5" style={{ color: 'var(--color-warning-500)' }} />
              {getTranslationFromI18nKeyAndLabel('flow.creator.confirmDelete', 'Confirm Delete')}
            </DialogTitle>
            <DialogDescription>
              <div className="gba:space-y-2">
                <p>
                  {getTranslationFromI18nKeyAndLabel('flow.creator.deleteMessage', 'Are you sure you want to delete this flow definition?')}
                </p>
                <p className="gba:font-medium">
                  "{deletingTemplate?.name || 'Untitled Definition'}"
                </p>
                <p className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {getTranslationFromI18nKeyAndLabel('flow.creator.deleteWarning', 'This action cannot be undone.')}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelDelete}
              data-testid={`${testId}-cancel-delete`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.creator.cancel', 'Cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              data-testid={`${testId}-confirm-delete`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.creator.deleteConfirm', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
