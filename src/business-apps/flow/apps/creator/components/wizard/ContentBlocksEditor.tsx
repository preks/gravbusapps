import React from 'react';
import { Button, Input, Select, Checkbox, Card, Tag, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { Type, FileText, Link, Image } from 'lucide-react';
import { ContentBlockType } from '../../types/flowTemplate';

const { Text } = Typography;

interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  required: boolean;
}

interface ContentBlocksEditorProps {
  contentBlocks: ContentBlock[];
  onUpdate: (blocks: ContentBlock[]) => void;
  'data-testid'?: string;
}

// Content block type configurations
const CONTENT_BLOCK_CONFIG = {
  [ContentBlockType.TEXT]: {
    icon: <Type className="gba:w-4 gba:h-4" />,
    color: '#1890ff',
    description: 'Display text content to users'
  },
  [ContentBlockType.DOCUMENT]: {
    icon: <FileText className="gba:w-4 gba:h-4" />,
    color: '#52c41a',
    description: 'Attach documents or files'
  },
  [ContentBlockType.LINK]: {
    icon: <Link className="gba:w-4 gba:h-4" />,
    color: '#fa8c16',
    description: 'Link to external resources'
  },
  [ContentBlockType.IMAGE]: {
    icon: <Image className="gba:w-4 gba:h-4" />,
    color: '#722ed1',
    description: 'Display images or graphics'
  }
};

export const ContentBlocksEditor: React.FC<ContentBlocksEditorProps> = ({
  contentBlocks,
  onUpdate,
  'data-testid': testId = 'content-blocks-editor'
}) => {
  const handleAddBlock = () => {
    const newBlock: ContentBlock = {
      id: `content-${Date.now()}`,
      type: ContentBlockType.TEXT,
      content: '',
      required: false
    };
    onUpdate([...contentBlocks, newBlock]);
  };

  const handleUpdateBlock = (index: number, updates: Partial<ContentBlock>) => {
    const updatedBlocks = [...contentBlocks];
    updatedBlocks[index] = { ...updatedBlocks[index], ...updates };
    onUpdate(updatedBlocks);
  };

  const handleDeleteBlock = (index: number) => {
    const updatedBlocks = contentBlocks.filter((_, i) => i !== index);
    onUpdate(updatedBlocks);
  };

  const getContentBlockTypeOptions = () => [
    { value: ContentBlockType.TEXT, label: 'Text' },
    { value: ContentBlockType.DOCUMENT, label: 'Document' },
    { value: ContentBlockType.LINK, label: 'Link' },
    { value: ContentBlockType.IMAGE, label: 'Image' }
  ];

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <div className="gba:flex gba:items-center gba:space-x-3">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:bg-blue-100">
            <FileTextOutlined className="gba:text-blue-600" />
          </div>
          <div>
            <Text strong className="gba:text-base gba:text-gray-800">Content Blocks</Text>
            <div className="gba:flex gba:items-center gba:space-x-2 gba:mt-1">
              <Tag color="blue" className="gba:text-xs">{contentBlocks.length}</Tag>
              <Text className="gba:text-xs gba:text-gray-500">Information to display</Text>
            </div>
          </div>
        </div>
        <Button
          icon={<PlusOutlined />}
          onClick={handleAddBlock}
          size="small"
          type="primary"
          ghost
          data-testid={`${testId}-add-block`}
        >
          Add
        </Button>
      </div>
      
      <div className="gba:space-y-3 gba:max-h-64 gba:overflow-y-auto gba:pr-2">
        {contentBlocks.length === 0 ? (
          <div className="gba:text-center gba:py-8 gba:border-2 gba:border-dashed gba:border-gray-200 gba:rounded-lg gba:bg-gray-50">
            <div className="gba:space-y-2">
              <FileTextOutlined className="gba:text-2xl gba:text-gray-400" />
              <Text className="gba:text-gray-500 gba:text-sm gba:block">No content blocks</Text>
              <Text className="gba:text-gray-400 gba:text-xs">Add content to display to users</Text>
            </div>
          </div>
        ) : (
          contentBlocks.map((block, index) => {
            const blockConfig = CONTENT_BLOCK_CONFIG[block.type];
            return (
              <Card key={block.id} className="gba:border gba:border-gray-200 gba:bg-white gba:shadow-sm">
                <div className="gba:p-3 gba:space-y-3">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:space-x-2">
                      <div style={{ color: blockConfig.color }}>
                        {blockConfig.icon}
                      </div>
                      <Select
                        value={block.type}
                        onChange={(value) => handleUpdateBlock(index, { type: value })}
                        options={getContentBlockTypeOptions()}
                        size="small"
                        style={{ width: 120 }}
                      />
                    </div>
                    <div className="gba:flex gba:items-center gba:space-x-2">
                      <Checkbox
                        checked={block.required}
                        onChange={(e) => handleUpdateBlock(index, { required: e.target.checked })}
                        className="gba:text-xs"
                      >
                        Required
                      </Checkbox>
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteBlock(index)}
                        size="small"
                        type="text"
                        danger
                      />
                    </div>
                  </div>
                  <div className="gba:space-y-2">
                    <Text className="gba:text-xs gba:text-gray-500">{blockConfig.description}</Text>
                    <Input
                      value={block.content}
                      onChange={(e) => handleUpdateBlock(index, { content: e.target.value })}
                      placeholder="Content text"
                      size="small"
                    />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}; 