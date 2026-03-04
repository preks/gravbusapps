import React, { useState, useEffect } from 'react'
import { Card, Input, Button, Switch, Space, Tag, Tooltip, Select, Divider, Upload, message, Popover } from 'antd'
import {
  PlusIcon,
  TrashIcon,
  FileTextIcon,
  LinkSimpleIcon,
  ImageIcon,
  ChatCircleIcon,
  UserIcon,
  GearIcon,
  CaretDownIcon,
  CaretRightIcon,
  TrayIcon,
  UploadIcon,
  PaperclipIcon,
  InfoIcon,
  CheckCircleIcon,
  PencilIcon,
  CheckIcon,
  XIcon
} from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  FlowStep,
  Link,
  InputType,
  InputBlock,
  FlowStepType,
  TaskAssignment,
  AssignmentMode
} from '@/common/network/flows/FlowTemplateClient'
import { AssignmentSelector } from '../shared/AssignmentSelector'

const { TextArea } = Input

interface FlowStepEditorProps {
  step: FlowStep
  stepIndex: number
  onStepChange: (stepIndex: number, updatedStep: FlowStep) => void
  assignmentMode: AssignmentMode
  isNewStep?: boolean
  'data-testid'?: string
}

// Configuration for input block types
const INPUT_BLOCK_CONFIG = {
  [InputType.TEXT]: {
    icon: <FileTextIcon size={16} />,
    color: '#1890ff',
    label: 'Text Input',
    description: 'Single line text input'
  },
  [InputType.TEXTAREA]: {
    icon: <ChatCircleIcon size={16} />,
    color: '#52c41a',
    label: 'Long Text',
    description: 'Multi-line text input'
  },
  [InputType.NUMBER]: {
    icon: <FileTextIcon size={16} />,
    color: '#fa8c16',
    label: 'Number',
    description: 'Numeric input'
  },
  [InputType.SELECT]: {
    icon: <GearIcon size={16} />,
    color: '#722ed1',
    label: 'Dropdown',
    description: 'Select from predefined options'
  },
  [InputType.FILE]: {
    icon: <ImageIcon size={16} />,
    color: '#eb2f96',
    label: 'File Upload',
    description: 'File attachment input'
  }
}

export const FlowStepEditor: React.FC<FlowStepEditorProps> = ({
  step,
  stepIndex,
  onStepChange,
  assignmentMode,
  isNewStep = false,
  'data-testid': testId = 'simplified-step-editor'
}) => {
  const [isExpanded, setIsExpanded] = useState(isNewStep)
  const [showLinks, setShowLinks] = useState((step.links?.length || 0) > 0)
  const [showInputs, setShowInputs] = useState(false) // default to false for simplicity
  const [showAssignment, setShowAssignment] = useState(!!step.assignment)
  const [editMode, setEditMode] = useState(false)
  const [localTitle, setLocalTitle] = useState(step.title || '')
  const [localMessage, setLocalMessage] = useState(step.message || '')

  useEffect(() => {
    setLocalTitle(step.title || '')
    setLocalMessage(step.message || '')
  }, [step.title, step.message])

  const updateStep = (updates: Partial<FlowStep>) => {
    onStepChange(stepIndex, { ...step, ...updates })
  }

  const addLink = () => {
    const newLink: Link = {
      name: '',
      url: ''
    }
    const currentLinks = step.links || []
    updateStep({
      links: [...currentLinks, newLink]
    })
  }

  const handleFileUpload = (file: File) => {
    // Create a URL for the uploaded file (in a real app, this would be uploaded to a server)
    const fileUrl = URL.createObjectURL(file)

    const newLink: Link = {
      name: file.name,
      url: fileUrl
    }

    const currentLinks = step.links || []
    updateStep({
      links: [...currentLinks, newLink]
    })
  }

  const updateLink = (index: number, updates: Partial<Link>) => {
    const currentLinks = step.links || []
    const updatedLinks = [...currentLinks]
    updatedLinks[index] = { ...updatedLinks[index], ...updates }
    updateStep({ links: updatedLinks })
  }

  const removeLink = (index: number) => {
    const currentLinks = step.links || []
    updateStep({
      links: currentLinks.filter((_, i) => i !== index)
    })
  }

  const addInputBlock = () => {
    const newInput: InputBlock = {
      type: InputType.TEXT,
      name: '',
      label: '',
      required: false
    }
    const currentInputs = step.inputs || []
    updateStep({
      inputs: [...currentInputs, newInput]
    })
  }

  const updateInputBlock = (index: number, updates: Partial<InputBlock>) => {
    const currentInputs = step.inputs || []
    const updatedInputs = [...currentInputs]
    updatedInputs[index] = { ...updatedInputs[index], ...updates }
    updateStep({ inputs: updatedInputs })
  }

  const removeInputBlock = (index: number) => {
    const currentInputs = step.inputs || []
    const updatedInputs = currentInputs.filter((_, i) => i !== index)
    updateStep({ inputs: updatedInputs })
  }

  const updateAssignment = (assignment: TaskAssignment) => {
    updateStep({ assignment })
  }

  return (
    <Card
      className="gba:mb-4"
      data-testid={`${testId}-step-${stepIndex}`}
      title={
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <CaretDownIcon size={16} /> : <CaretRightIcon size={16} />}
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`${testId}-expand-button`}
            />
            <span className="gba:text-sm gba:font-medium">
              {step.title || `${getTranslationFromI18nKeyAndLabel('flow.creator.step', 'Step')} ${stepIndex + 1}`}
            </span>
            <Tag color="blue">{step.type}</Tag>
          </div>
        </div>
      }
    >
      {isExpanded && (
        <div className="gba:space-y-6">
          {/* Step Type Field */}
          <div data-testid={`${testId}-step-type-field`}>
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('flow.creator.stepType', 'Step Type')}
            </label>
            <Select
              value={step.type}
              onChange={value => updateStep({ type: value })}
              style={{ width: '100%' }}
              data-testid={`${testId}-step-type-select`}
            >
              <Select.Option value={FlowStepType.TASK}>
                <Space>
                  <UserIcon size={16} />
                  {getTranslationFromI18nKeyAndLabel('flow.creator.stepType.task', 'Task')}
                </Space>
              </Select.Option>
              <Select.Option value={FlowStepType.APPROVAL}>
                <Space>
                  <GearIcon size={16} />
                  {getTranslationFromI18nKeyAndLabel('flow.creator.stepType.approval', 'Approval')}
                </Space>
              </Select.Option>
              <Select.Option value={FlowStepType.INFORMATION}>
                <Space>
                  <ChatCircleIcon size={16} />
                  {getTranslationFromI18nKeyAndLabel('flow.creator.stepType.information', 'Information')}
                </Space>
              </Select.Option>
              <Select.Option value={FlowStepType.ACKNOWLEDGE}>
                <Space>
                  <CheckCircleIcon size={16} />
                  {getTranslationFromI18nKeyAndLabel('flow.creator.stepType.acknowledge', 'Acknowledge')}
                </Space>
              </Select.Option>
            </Select>
          </div>

          {/* Title and Message with Edit Toggle */}
          <Card size="small" title={getTranslationFromI18nKeyAndLabel('flow.creator.stepInfo', 'Step Information')}>
            <div className="gba:space-y-4">
              {/* Title Field */}
              <div data-testid={`${testId}-title-field`}>
                <label className="gba:block gba:text-sm gba:font-medium gba:mb-1">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.stepTitle', 'Step Title')}
                </label>
                {editMode ? (
                  <Input
                    value={localTitle}
                    onChange={e => setLocalTitle(e.target.value)}
                    data-testid={`${testId}-title-input`}
                    className="gba:mb-2"
                  />
                ) : (
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-base gba:font-semibold">{step.title}</span>
                  </div>
                )}
              </div>

              {/* Message Field */}
              <div data-testid={`${testId}-message-field`}>
                <label className="gba:block gba:text-sm gba:font-medium gba:mb-1">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.message', 'Message')}
                </label>
                {editMode ? (
                  <TextArea
                    value={localMessage}
                    onChange={e => setLocalMessage(e.target.value)}
                    rows={4}
                    data-testid={`${testId}-message-input`}
                    className="gba:mb-2"
                  />
                ) : (
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-base">{step.message}</span>
                  </div>
                )}
              </div>

              {/* Edit Toggle */}
              <div className="gba:mt-2">
                {editMode ? (
                  <Space>
                    <Button
                      icon={<CheckOutlined />}
                      type="primary"
                      size="small"
                      onClick={() => {
                        updateStep({ title: localTitle, message: localMessage })
                        setEditMode(false)
                      }}
                      data-testid={`${testId}-save-edit`}
                    >
                      Save
                    </Button>
                    <Button
                      icon={<XIcon size={16} />}
                      size="small"
                      onClick={() => {
                        setLocalTitle(step.title || '')
                        setLocalMessage(step.message || '')
                        setEditMode(false)
                      }}
                      data-testid={`${testId}-cancel-edit`}
                    >
                      Cancel
                    </Button>
                  </Space>
                ) : (
                  <Button
                    icon={<PencilIcon size={16} />}
                    size="small"
                    onClick={() => setEditMode(true)}
                    data-testid={`${testId}-edit-toggle`}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Links Section */}
          <div data-testid={`${testId}-links-section`}>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <Switch
                checked={showLinks}
                onChange={checked => setShowLinks(checked)}
                data-testid={`${testId}-links-toggle`}
              />
              <label className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('flow.creator.addLinks', 'Add Links')}
              </label>
            </div>

            {showLinks && (
              <div className="gba:space-y-4">
                <div className="gba:flex gba:items-center gba:justify-end">
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusIcon size={16} />}
                    onClick={addLink}
                    data-testid={`${testId}-add-link`}
                  >
                    {getTranslationFromI18nKeyAndLabel('flow.creator.addLink', 'Add Link')}
                  </Button>
                </div>

                {/* Drag & Drop Upload Area */}
                <Upload.Dragger
                  multiple
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  data-testid={`${testId}-file-upload-dragger`}
                  className="gba:border-dashed gba:border-gray-300 gba:bg-gray-50"
                >
                  <p className="gba:mb-2">
                    <TrayIcon size={24} className="gba:text-2xl gba:text-gray-400" />
                  </p>
                  <p className="gba:text-sm gba:text-gray-600">
                    {getTranslationFromI18nKeyAndLabel(
                      'flow.creator.dragDropFiles',
                      'Click or drag files here to upload'
                    )}
                  </p>
                  <p className="gba:text-xs gba:text-gray-400">
                    {getTranslationFromI18nKeyAndLabel(
                      'flow.creator.supportedFiles',
                      'Supports documents, images, and other files'
                    )}
                  </p>
                </Upload.Dragger>

                {step.links?.length === 0 ? (
                  <div className="gba:text-center gba:py-4 gba:text-gray-500 gba:text-sm">
                    {getTranslationFromI18nKeyAndLabel('flow.creator.noLinks', 'No links added yet')}
                  </div>
                ) : (
                  <div className="gba:space-y-2">
                    {step.links?.map((link, index) => (
                      <div key={index} className="gba:border gba:rounded gba:p-3 gba:space-y-2">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Input
                            value={link.name}
                            onChange={e => updateLink(index, { name: e.target.value })}
                            placeholder="Link name"
                            data-testid={`${testId}-link-name-${index}`}
                          />
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<TrashIcon size={16} />}
                            onClick={() => removeLink(index)}
                            data-testid={`${testId}-remove-link-${index}`}
                          />
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Input
                            value={link.url}
                            onChange={e => updateLink(index, { url: e.target.value })}
                            placeholder="URL"
                            data-testid={`${testId}-link-url-${index}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Inputs Section */}
          {/* Input Form Configuration - hide behind switch */}
          <div data-testid={`${testId}-inputs-section`}>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Switch checked={showInputs} onChange={setShowInputs} data-testid={`${testId}-inputs-toggle`} />
                <label className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    'flow.creator.showAdvancedInputConfig',
                    'Show advanced input configuration'
                  )}
                </label>
              </div>
              {showInputs && (
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusIcon size={16} />}
                  onClick={addInputBlock}
                  data-testid={`${testId}-add-input`}
                >
                  {getTranslationFromI18nKeyAndLabel('flow.creator.addInput', 'Add Input')}
                </Button>
              )}
            </div>

            {showInputs && (
              <div className="gba:space-y-2">
                {step.inputs?.length === 0 ? (
                  <div className="gba:text-center gba:py-4 gba:text-gray-500 gba:text-sm">
                    {getTranslationFromI18nKeyAndLabel('flow.creator.noInputs', 'No input fields added yet')}
                  </div>
                ) : (
                  step.inputs?.map((input, index) => (
                    <div key={index} className="gba:border gba:rounded gba:p-3 gba:space-y-2">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Select
                          value={input.type}
                          onChange={value => updateInputBlock(index, { type: value })}
                          style={{ width: 140 }}
                          data-testid={`${testId}-input-type-${index}`}
                        >
                          {Object.entries(INPUT_BLOCK_CONFIG).map(([type, config]) => (
                            <Select.Option key={type} value={type}>
                              <Space>
                                {config.icon}
                                {config.label}
                              </Space>
                            </Select.Option>
                          ))}
                        </Select>
                        <Input
                          value={input.label}
                          onChange={e => updateInputBlock(index, { label: e.target.value })}
                          data-testid={`${testId}-input-label-${index}`}
                        />
                        <Switch
                          checked={input.required}
                          onChange={required => updateInputBlock(index, { required })}
                          data-testid={`${testId}-input-required-${index}`}
                        />
                        <span className="gba:text-xs gba:text-gray-500">
                          {getTranslationFromI18nKeyAndLabel('flow.creator.required', 'Required')}
                        </span>
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<TrashIcon size={16} />}
                          onClick={() => removeInputBlock(index)}
                          data-testid={`${testId}-remove-input-${index}`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Assignment Section */}
          <div data-testid={`${testId}-assignment-section`}>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <Switch
                checked={showAssignment}
                onChange={checked => setShowAssignment(checked)}
                data-testid={`${testId}-assignment-toggle`}
              />
              <label className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('flow.creator.addAssignmentRule', 'Add Assignment Rule')}
              </label>
              <Popover
                content={
                  <div className="gba:max-w-xs">
                    {getTranslationFromI18nKeyAndLabel(
                      'flow.creator.assignmentExecutionInfo',
                      'By default the assignment will be configured at execution time.'
                    )}
                  </div>
                }
                title={getTranslationFromI18nKeyAndLabel('flow.creator.assignmentInfo', 'Assignment Information')}
                trigger="hover"
                zIndex={9999}
                styles={{
                  root: { zIndex: 9999 }
                }}
              >
                <InfoIcon size={16} className="gba:text-gray-400 gba:cursor-help" />
              </Popover>
            </div>

            {showAssignment && (
              <div className="gba:pl-6">
                <AssignmentSelector
                  value={step.assignment}
                  onChange={updateAssignment}
                  assignmentMode={assignmentMode}
                  data-testid={`${testId}-assignment-selector`}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
