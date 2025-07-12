import React from 'react';
import { Button, Input, Select, Checkbox, Card, Tag, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, FormOutlined } from '@ant-design/icons';
import { 
  Type, 
  MessageSquare, 
  Hash, 
  List, 
  Radio, 
  CheckSquare, 
  Calendar, 
  Upload, 
  PenTool 
} from 'lucide-react';
import { InputBlockType } from '../../types/flowTemplate';

const { Text } = Typography;

interface InputBlock {
  id: string;
  type: InputBlockType;
  label: string;
  required: boolean;
  placeholder?: string;
}

interface InputBlocksEditorProps {
  inputBlocks: InputBlock[];
  onUpdate: (blocks: InputBlock[]) => void;
  'data-testid'?: string;
}

// Input block type configurations
const INPUT_BLOCK_CONFIG = {
  [InputBlockType.TEXT]: {
    icon: <Type className="gba:w-4 gba:h-4" />,
    color: '#1890ff',
    description: 'Single line text input'
  },
  [InputBlockType.TEXTAREA]: {
    icon: <MessageSquare className="gba:w-4 gba:h-4" />,
    color: '#52c41a',
    description: 'Multi-line text input'
  },
  [InputBlockType.NUMBER]: {
    icon: <Hash className="gba:w-4 gba:h-4" />,
    color: '#13c2c2',
    description: 'Numeric input field'
  },
  [InputBlockType.DROPDOWN]: {
    icon: <List className="gba:w-4 gba:h-4" />,
    color: '#fa8c16',
    description: 'Select from predefined options'
  },
  [InputBlockType.RADIO]: {
    icon: <Radio className="gba:w-4 gba:h-4" />,
    color: '#eb2f96',
    description: 'Single choice selection'
  },
  [InputBlockType.CHECKBOX]: {
    icon: <CheckSquare className="gba:w-4 gba:h-4" />,
    color: '#722ed1',
    description: 'Multiple choice selection'
  },
  [InputBlockType.DATETIME]: {
    icon: <Calendar className="gba:w-4 gba:h-4" />,
    color: '#faad14',
    description: 'Date and time picker'
  },
  [InputBlockType.FILE]: {
    icon: <Upload className="gba:w-4 gba:h-4" />,
    color: '#f5222d',
    description: 'File upload functionality'
  },
  [InputBlockType.SIGNATURE]: {
    icon: <PenTool className="gba:w-4 gba:h-4" />,
    color: '#531dab',
    description: 'Digital signature capture'
  }
};

export const InputBlocksEditor: React.FC<InputBlocksEditorProps> = ({
  inputBlocks,
  onUpdate,
  'data-testid': testId = 'input-blocks-editor'
}) => {
  const handleAddBlock = () => {
    const newBlock: InputBlock = {
      id: `input-${Date.now()}`,
      type: InputBlockType.TEXT,
      label: '',
      required: false,
      placeholder: ''
    };
    onUpdate([...inputBlocks, newBlock]);
  };

  const handleUpdateBlock = (index: number, updates: Partial<InputBlock>) => {
    const updatedBlocks = [...inputBlocks];
    updatedBlocks[index] = { ...updatedBlocks[index], ...updates };
    onUpdate(updatedBlocks);
  };

  const handleDeleteBlock = (index: number) => {
    const updatedBlocks = inputBlocks.filter((_, i) => i !== index);
    onUpdate(updatedBlocks);
  };

  const getInputBlockTypeOptions = () => [
    { value: InputBlockType.TEXT, label: 'Text Input' },
    { value: InputBlockType.TEXTAREA, label: 'Text Area' },
    { value: InputBlockType.NUMBER, label: 'Number' },
    { value: InputBlockType.DROPDOWN, label: 'Dropdown' },
    { value: InputBlockType.RADIO, label: 'Radio' },
    { value: InputBlockType.CHECKBOX, label: 'Checkbox' },
    { value: InputBlockType.DATETIME, label: 'Date/Time' },
    { value: InputBlockType.FILE, label: 'File Upload' },
    { value: InputBlockType.SIGNATURE, label: 'Signature' }
  ];

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <div className="gba:flex gba:items-center gba:space-x-3">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:bg-green-100">
            <FormOutlined className="gba:text-green-600" />
          </div>
          <div>
            <Text strong className="gba:text-base gba:text-gray-800">Input Blocks</Text>
            <div className="gba:flex gba:items-center gba:space-x-2 gba:mt-1">
              <Tag color="green" className="gba:text-xs">{inputBlocks.length}</Tag>
              <Text className="gba:text-xs gba:text-gray-500">Data to collect from users</Text>
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
        {inputBlocks.length === 0 ? (
          <div className="gba:text-center gba:py-8 gba:border-2 gba:border-dashed gba:border-gray-200 gba:rounded-lg gba:bg-gray-50">
            <div className="gba:space-y-2">
              <FormOutlined className="gba:text-2xl gba:text-gray-400" />
              <Text className="gba:text-gray-500 gba:text-sm gba:block">No input blocks</Text>
              <Text className="gba:text-gray-400 gba:text-xs">Add inputs to collect data</Text>
            </div>
          </div>
        ) : (
          inputBlocks.map((block, index) => {
            const blockConfig = INPUT_BLOCK_CONFIG[block.type];
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
                        options={getInputBlockTypeOptions()}
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
                    <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                      <Input
                        value={block.label}
                        onChange={(e) => handleUpdateBlock(index, { label: e.target.value })}
                        placeholder="Label"
                        size="small"
                      />
                      <Input
                        value={block.placeholder}
                        onChange={(e) => handleUpdateBlock(index, { placeholder: e.target.value })}
                        placeholder="Placeholder"
                        size="small"
                      />
                    </div>
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