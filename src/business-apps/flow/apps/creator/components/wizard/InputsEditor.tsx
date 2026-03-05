import React from 'react'
import { Button, Input, Select, Checkbox, Card, Tag, Typography } from 'antd'
import { PlusIcon, TrashIcon, NotePencilIcon } from '@phosphor-icons/react'
import { Type, MessageSquare, Hash, List, Radio, CheckSquare, Calendar, Upload, PenTool } from 'lucide-react'
import { InputType } from '@/common/network/flows/FlowTemplateClient'

const { Text } = Typography

interface InputBlock {
  id: string
  type: InputType
  label: string
  required: boolean
  placeholder?: string
}

interface InputsEditorProps {
  inputs: InputBlock[]
  onUpdate: (blocks: InputBlock[]) => void
  'data-testid'?: string
}

// Input block type configurations
const INPUT_BLOCK_CONFIG = {
  [InputType.TEXT]: {
    icon: <Type className="gba:w-4 gba:h-4" />,
    color: '#1890ff',
    description: 'Single line text input'
  },
  [InputType.TEXTAREA]: {
    icon: <MessageSquare className="gba:w-4 gba:h-4" />,
    color: '#52c41a',
    description: 'Multi-line text input'
  },
  [InputType.NUMBER]: {
    icon: <Hash className="gba:w-4 gba:h-4" />,
    color: '#13c2c2',
    description: 'Numeric input field'
  },
  [InputType.SELECT]: {
    icon: <List className="gba:w-4 gba:h-4" />,
    color: '#fa8c16',
    description: 'Select from predefined options'
  },
  [InputType.MULTISELECT]: {
    icon: <List className="gba:w-4 gba:h-4" />,
    color: '#fa8c16',
    description: 'Select multiple options'
  },
  [InputType.CHECKBOX]: {
    icon: <CheckSquare className="gba:w-4 gba:h-4" />,
    color: '#722ed1',
    description: 'Multiple choice selection'
  },
  [InputType.DATE]: {
    icon: <Calendar className="gba:w-4 gba:h-4" />,
    color: '#faad14',
    description: 'Date picker'
  },
  [InputType.FILE]: {
    icon: <Upload className="gba:w-4 gba:h-4" />,
    color: '#f5222d',
    description: 'File upload functionality'
  }
}

export const InputsEditor: React.FC<InputsEditorProps> = ({
  inputs,
  onUpdate,
  'data-testid': testId = 'input-blocks-editor'
}) => {
  const handleAddBlock = () => {
    const newBlock: InputBlock = {
      id: `input-${Date.now()}`,
      type: InputType.TEXT,
      label: '',
      required: false,
      placeholder: ''
    }
    onUpdate([...inputs, newBlock])
  }

  const handleUpdateBlock = (index: number, updates: Partial<InputBlock>) => {
    const updatedBlocks = [...inputs]
    updatedBlocks[index] = { ...updatedBlocks[index], ...updates }
    onUpdate(updatedBlocks)
  }

  const handleDeleteBlock = (index: number) => {
    const updatedBlocks = inputs.filter((_, i) => i !== index)
    onUpdate(updatedBlocks)
  }

  const getInputTypeOptions = () => [
    { value: InputType.TEXT, label: 'Text Input' },
    { value: InputType.TEXTAREA, label: 'Text Area' },
    { value: InputType.NUMBER, label: 'Number' },
    { value: InputType.SELECT, label: 'Select' },
    { value: InputType.MULTISELECT, label: 'Multi-Select' },
    { value: InputType.CHECKBOX, label: 'Checkbox' },
    { value: InputType.DATE, label: 'Date' },
    { value: InputType.FILE, label: 'File Upload' }
  ]

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <div className="gba:flex gba:items-center gba:space-x-3">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:bg-green-100">
            <NotePencilIcon className="gba:text-green-600" />
          </div>
          <div>
            <Text strong className="gba:text-base gba:text-gray-800">
              Input Blocks
            </Text>
            <div className="gba:flex gba:items-center gba:space-x-2 gba:mt-1">
              <Tag color="green" className="gba:text-xs">
                {inputs.length}
              </Tag>
              <Text className="gba:text-xs gba:text-gray-500">Data to collect from users</Text>
            </div>
          </div>
        </div>
        <Button
          icon={<PlusIcon size={16} />}
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
        {inputs.length === 0 ? (
          <div className="gba:text-center gba:py-8 gba:border-2 gba:border-dashed gba:border-gray-200 gba:rounded-lg gba:bg-gray-50">
            <div className="gba:space-y-2">
              <NotePencilIcon className="gba:text-2xl gba:text-gray-400" />
              <Text className="gba:text-gray-500 gba:text-sm gba:block">No input blocks</Text>
              <Text className="gba:text-gray-400 gba:text-xs">Add inputs to collect data</Text>
            </div>
          </div>
        ) : (
          inputs.map((block, index) => {
            const blockConfig = INPUT_BLOCK_CONFIG[block.type]
            return (
              <Card key={block.id} className="gba:border gba:border-gray-200 gba:bg-white gba:shadow-sm">
                <div className="gba:p-3 gba:space-y-3">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:space-x-2">
                      <div style={{ color: blockConfig.color }}>{blockConfig.icon}</div>
                      <Select
                        value={block.type}
                        onChange={value => handleUpdateBlock(index, { type: value })}
                        options={getInputTypeOptions()}
                        size="small"
                        style={{ width: 120 }}
                      />
                    </div>
                    <div className="gba:flex gba:items-center gba:space-x-2">
                      <Checkbox
                        checked={block.required}
                        onChange={e => handleUpdateBlock(index, { required: e.target.checked })}
                        className="gba:text-xs"
                      >
                        Required
                      </Checkbox>
                      <Button
                        icon={<TrashIcon size={16} />}
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
                        onChange={e => handleUpdateBlock(index, { label: e.target.value })}
                        placeholder="Label"
                        size="small"
                      />
                      <Input
                        value={block.placeholder}
                        onChange={e => handleUpdateBlock(index, { placeholder: e.target.value })}
                        placeholder="Placeholder"
                        size="small"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
