import React, { useState } from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from '@newwork/nw-design-system';
import { Modal, Space, message } from 'antd';
import { ExclamationCircleOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';

interface FlowTemplateListProps {
  templates: FlowTemplate[];
  onCreateNew: () => void;
  onEdit: (template: FlowTemplate) => void;
  onDelete: (template: FlowTemplate) => Promise<void>;
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
            data-testid={`${testId}-create-button`}
          >
            <PlusOutlined className="gba:mr-2" />
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
                  <TableHead data-testid={`${testId}-header-name`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.templateName', 'Name')}
                  </TableHead>
                  <TableHead data-testid={`${testId}-header-description`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.templateDescription', 'Description')}
                  </TableHead>
                  <TableHead data-testid={`${testId}-header-steps`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.templateSteps', 'Steps')}
                  </TableHead>
                  <TableHead data-testid={`${testId}-header-actions`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.templateActions', 'Actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {templates.map((template, index) => (
                  <TableRow key={template.id || index} data-testid={`${testId}-row-${index}`}>
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
                      <Space size="small">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(template)}
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
                          onClick={() => handleDeleteClick(template)}
                          data-testid={`${testId}-delete-${index}`}
                        >
                          <DeleteOutlined />
                          {getTranslationFromI18nKeyAndLabel('flow.creator.delete', 'Delete')}
                        </Button>
                        */}
                      </Space>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        title={getTranslationFromI18nKeyAndLabel('flow.creator.confirmDelete', 'Confirm Delete')}
        open={!!deletingTemplate}
        onOk={handleConfirmDelete}
        onCancel={handleCancelDelete}
        okText={getTranslationFromI18nKeyAndLabel('flow.creator.deleteConfirm', 'Delete')}
        cancelText={getTranslationFromI18nKeyAndLabel('flow.creator.cancel', 'Cancel')}
        okButtonProps={{ danger: true }}
        data-testid={`${testId}-delete-modal`}
      >
        <div className="gba:flex gba:items-center gba:gap-3">
          <ExclamationCircleOutlined className="gba:text-yellow-500 gba:text-xl" />
          <div>
            <p className="gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('flow.creator.deleteMessage', 'Are you sure you want to delete this flow definition?')}
            </p>
            <p className="gba:font-medium">
              "{deletingTemplate?.name || 'Untitled Definition'}"
            </p>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-2">
              {getTranslationFromI18nKeyAndLabel('flow.creator.deleteWarning', 'This action cannot be undone.')}
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};
