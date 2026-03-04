import React, { useState } from 'react'
import { Card, Input, Button, Switch, Tooltip, Typography, Divider, Tag } from 'antd'
import {
  PencilIcon,
  CheckIcon,
  XIcon,
  UserIcon,
  NotePencilIcon,
  PaperclipIcon
} from '@phosphor-icons/react'
import { FlowStep, AssignmentTarget } from '../../types/flowTemplate'
import { AssignmentSelector } from '../shared/AssignmentSelector'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useMockData } from '../../../../providers/MockDataProvider'

const { TextArea } = Input
const { Text, Title } = Typography

// Helper function to get entity type color
const getEntityTypeColor = (entityType: string): string => {
  switch (entityType) {
    case 'user':
      return 'blue'
    case 'department':
      return 'green'
    case 'capability':
      return 'orange'
    case 'role':
      return 'purple'
    default:
      return 'default'
  }
}

interface StepExecutionFormProps {
  step: FlowStep
  stepIndex: number
  configuration: {
    title?: string
    message?: string
    assignment?: any
    inputValues?: { [key: string]: any }
    links?: any[]
  }
  onConfigurationChange: (updates: any) => void
  'data-testid'?: string
}

export const StepExecutionForm: React.FC<StepExecutionFormProps> = ({
  step,
  stepIndex,
  configuration,
  onConfigurationChange,
  'data-testid': testId = 'step-execution-form'
}) => {
  const { resolveEntityName } = useMockData()
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false)
  const [editTitleMessage, setEditTitleMessage] = useState(false)
  const [editedTitle, setEditedTitle] = useState<string | null>(null)
  const [editedMessage, setEditedMessage] = useState<string | null>(null)

  const updateConfiguration = (field: string, value: any) => {
    onConfigurationChange({ [field]: value })
  }

  const updateInputValue = (inputIndex: number, value: any) => {
    const newInputValues = { ...configuration.inputValues }
    newInputValues[`input_${inputIndex}`] = value
    onConfigurationChange({ inputValues: newInputValues })
  }

  return (
    <div className="gba:space-y-6 gba:p-2" data-testid={testId}>
      {/* Title & Message Card */}
      <Card
        size="small"
        className="gba:mb-4 gba:shadow-md gba:rounded-lg gba:border gba:bg-white"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        title={
          <div className="gba:flex gba:items-center gba:gap-2">
            <UserIcon size={16} />
            <span className="gba:font-semibold">Title & Message</span>
          </div>
        }
      >
        <div className="gba:p-2">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div className="gba:flex-1">
              <Text className="gba:m-0 gba:mb-2 gba:font-bold gba:text-xl gba:text-gray-900">
                {configuration.title ?? step.title}
              </Text>
              <Text className="gba:block gba:text-gray-600 gba:text-base gba:leading-relaxed">
                {configuration.message ?? step.message}
              </Text>
            </div>
            <Tooltip title="Edit title and message">
              <Button
                icon={<EditOutlined />}
                size="small"
                className="gba:ml-4"
                onClick={() => setEditTitleMessage(true)}
                data-testid={`${testId}-edit-title-message-toggle`}
              />
            </Tooltip>
          </div>

          {editTitleMessage && (
            <>
              <Divider className="gba:my-3" />
              <div className="gba:space-y-3">
                <Input
                  value={editedTitle ?? configuration.title ?? step.title}
                  onChange={e => setEditedTitle(e.target.value)}
                  placeholder="Title"
                  data-testid={`${testId}-edit-title-input`}
                />
                <TextArea
                  rows={2}
                  value={editedMessage ?? configuration.message ?? step.message}
                  onChange={e => setEditedMessage(e.target.value)}
                  placeholder="Message"
                  data-testid={`${testId}-edit-message-input`}
                />
                <div className="gba:flex gba:gap-2">
                  <Button
                    icon={<CheckIcon size={16} />}
                    size="small"
                    type="primary"
                    onClick={() => {
                      updateConfiguration('title', editedTitle ?? step.title)
                      updateConfiguration('message', editedMessage ?? step.message)
                      setEditTitleMessage(false)
                      setEditedTitle(null)
                      setEditedMessage(null)
                    }}
                    data-testid={`${testId}-edit-title-message-save`}
                  >
                    Save
                  </Button>
                  <Button
                    icon={<CloseOutlined />}
                    size="small"
                    onClick={() => {
                      setEditTitleMessage(false)
                      setEditedTitle(null)
                      setEditedMessage(null)
                    }}
                    data-testid={`${testId}-edit-title-message-cancel`}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Assignment Configuration */}
      {!step.assignment && (
        <div className="gba:mt-4">
          <Card
            size="small"
            className="gba:mb-4 gba:shadow-md gba:rounded-lg gba:border gba:bg-white gba:mt-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            title={
              <div className="gba:flex gba:items-center gba:gap-2">
                <UserIcon size={16} />
                <span className="gba:font-semibold">
                  {getTranslationFromI18nKeyAndLabel('flow.execution.assignment', 'Assignment')}
                </span>
              </div>
            }
          >
            <div className="gba:space-y-4 gba:p-2">
              <Text className="gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'flow.execution.assignmentDescription',
                  'Configure who should receive this task at execution time.'
                )}
              </Text>

              <AssignmentSelector
                value={configuration.assignment}
                onChange={assignment => updateConfiguration('assignment', assignment)}
                data-testid={`${testId}-assignment-selector`}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Predefined Assignment */}
      {step.assignment && (
        <div className="gba:mt-4">
          <Card
            size="small"
            className="gba:mb-4 gba:shadow-md gba:rounded-lg gba:border gba:bg-white gba:mt-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            title={
              <div className="gba:flex gba:items-center gba:gap-2">
                <UserIcon size={16} />
                <span className="gba:font-semibold">Assignment</span>
              </div>
            }
            data-testid="step-execution-assignment-card"
          >
            <div className="gba:space-y-3 gba:p-2">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:text-sm gba:text-gray-500 gba:font-medium">Assignment:</span>
                <Tag color="blue" data-testid="step-execution-assignment-info">
                  {step.assignment?.targets?.length || 0} targets
                </Tag>
              </div>
              <div className="gba:flex gba:items-start gba:gap-2">
                <span className="gba:text-sm gba:text-gray-500 gba:font-medium gba:mt-1">Targets:</span>
                <div className="gba:flex-1">
                  {Array.isArray(step.assignment.targets) && step.assignment.targets.length > 0 ? (
                    <div className="gba:flex gba:flex-wrap gba:gap-1">
                      {step.assignment.targets.map((target, idx) => (
                        <Tag
                          color={getEntityTypeColor(target.entity)}
                          key={idx}
                          data-testid="step-execution-assignment-target"
                        >
                          {resolveEntityName(target.entity, target.id)}
                        </Tag>
                      ))}
                    </div>
                  ) : (
                    <span className="gba:text-gray-400 gba:text-sm" data-testid="step-execution-assignment-no-targets">
                      No targets selected
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Links Section */}
      {step.links && step.links.length > 0 && (
        <Card
          size="small"
          className="gba:mb-4 gba:shadow-md gba:rounded-lg gba:border gba:bg-white gba:mt-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          title={
            <div className="gba:flex gba:items-center gba:gap-2">
              <PaperclipIcon size={16} />
              <span className="gba:font-semibold">Links</span>
            </div>
          }
        >
          <div className="gba:space-y-2 gba:p-2">
            {step.links.map((link, idx) => (
              <div key={idx} className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-gray-50 gba:rounded-md">
                <PaperclipIcon size={16} className="gba:text-gray-500" />
                {link.url ? (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gba:text-blue-600 gba:underline gba:flex-1"
                  >
                    {link.name || link.url}
                  </a>
                ) : (
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span>{link.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
