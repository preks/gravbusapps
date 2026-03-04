import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Form, Select, Switch, Typography, Alert, Tooltip, Tag, List, Radio, Space } from 'antd'
import { UserIcon, UsersIcon, InfoIcon, CheckCircleIcon, GearIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useWizardStore } from '../../hooks/useWizardStore'

const { Title, Text } = Typography
const { Option } = Select

interface AssignmentConfigurationProps {
  'data-testid'?: string
}

interface AssignmentRules {
  type: 'single' | 'multiple' | 'any' | 'all'
  strategy: 'manual' | 'role-based' | 'department-based' | 'manager-based' | 'requester-based'
  allowReassignment: boolean
  autoAssign: boolean
  requiresApproval: boolean
  escalation: {
    enabled: boolean
    timeoutHours: number
    escalateTo: 'manager' | 'admin' | 'custom'
  }
  constraints: {
    sameUser: boolean // Can't assign to same user as previous step
    skipWeekends: boolean
    businessHoursOnly: boolean
  }
}

/**
 * Assignment configuration component for defining assignment rules and patterns
 */
export const AssignmentConfiguration: React.FC<AssignmentConfigurationProps> = ({
  'data-testid': testId = 'assignment-configuration'
}) => {
  const { configuration, updateConfiguration } = useWizardStore()

  const [rules, setRules] = useState<AssignmentRules>(() => ({
    type: 'single',
    strategy: 'manual',
    allowReassignment: true,
    autoAssign: false,
    requiresApproval: false,
    escalation: {
      enabled: false,
      timeoutHours: 24,
      escalateTo: 'manager'
    },
    constraints: {
      sameUser: false,
      skipWeekends: false,
      businessHoursOnly: false
    }
  }))

  // Load initial value from configuration
  useEffect(() => {
    if (configuration.assignmentRules) {
      setRules(configuration.assignmentRules)
    }
  }, [configuration.assignmentRules])

  // Update configuration when rules change
  useEffect(() => {
    updateConfiguration('assignmentRules', rules)
  }, [rules, updateConfiguration])

  const handleRulesChange = (updates: Partial<AssignmentRules>) => {
    setRules(prev => ({ ...prev, ...updates }))
  }

  const handleEscalationChange = (updates: Partial<AssignmentRules['escalation']>) => {
    setRules(prev => ({
      ...prev,
      escalation: { ...prev.escalation, ...updates }
    }))
  }

  const handleConstraintsChange = (updates: Partial<AssignmentRules['constraints']>) => {
    setRules(prev => ({
      ...prev,
      constraints: { ...prev.constraints, ...updates }
    }))
  }

  const assignmentTypeOptions = [
    {
      value: 'single',
      label: 'Single Person',
      description: 'One person must complete this task',
      icon: <UserIcon />
    },
    {
      value: 'multiple',
      label: 'Multiple People',
      description: 'Multiple people can work on this task',
      icon: <UsersIcon size={16} />
    },
    {
      value: 'any',
      label: 'Any One Person',
      description: 'Any one person from the assigned group',
      icon: <UserIcon />
    },
    {
      value: 'all',
      label: 'All People',
      description: 'All assigned people must complete',
      icon: <UsersIcon size={16} />
    }
  ]

  const strategyOptions = [
    {
      value: 'manual',
      label: 'Manual Assignment',
      description: 'Assignments will be made manually at execution time',
      icon: <UserIcon />
    },
    {
      value: 'role-based',
      label: 'Role-Based Assignment',
      description: 'Assign based on user roles (e.g., Manager, Analyst)',
      icon: <UsersIcon size={16} />
    },
    {
      value: 'department-based',
      label: 'Department-Based Assignment',
      description: 'Assign based on department structure',
      icon: <UsersIcon size={16} />
    },
    {
      value: 'manager-based',
      label: 'Manager-Based Assignment',
      description: "Assign to the requester's manager or hierarchy",
      icon: <UserIcon />
    },
    {
      value: 'requester-based',
      label: 'Requester-Based Assignment',
      description: 'Assign back to the workflow requester',
      icon: <UserIcon />
    }
  ]

  const escalationOptions = [
    { value: 'manager', label: 'Direct Manager' },
    { value: 'admin', label: 'System Administrator' },
    { value: 'custom', label: 'Custom Rules' }
  ]

  const timeoutOptions = [
    { value: 1, label: '1 Hour' },
    { value: 4, label: '4 Hours' },
    { value: 8, label: '8 Hours' },
    { value: 24, label: '1 Day' },
    { value: 48, label: '2 Days' },
    { value: 72, label: '3 Days' },
    { value: 168, label: '1 Week' }
  ]

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Configured Steps Overview */}
      {configuration.steps && configuration.steps.length > 0 && (
        <Card data-testid={`${testId}-steps-overview`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:space-x-2">
              <CheckCircleIcon className="gba:text-green-500" />
              <span>Configured Workflow Steps ({configuration.steps.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <List
              dataSource={configuration.steps}
              renderItem={(step: any, index: number) => (
                <List.Item key={step.id}>
                  <div className="gba:flex gba:items-center gba:space-x-3 gba:w-full">
                    <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:bg-blue-100 gba:text-blue-600 gba:font-medium gba:text-sm">
                      {index + 1}
                    </div>
                    <div className="gba:flex-1">
                      <div className="gba:font-medium gba:text-gray-900">{step.title}</div>
                      <div className="gba:text-sm gba:text-gray-600">{step.description}</div>
                    </div>
                    <Tag color="blue">Requires Assignment</Tag>
                  </div>
                </List.Item>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* Assignment Type */}
      <Card data-testid={`${testId}-type`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:space-x-2">
            <span>👥 Assignment Type</span>
            <Tooltip title="How tasks should be assigned when workflow executes">
              <InfoIcon size={16} className="gba:text-gray-400" />
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form.Item>
            <Radio.Group
              value={rules.type}
              onChange={e => handleRulesChange({ type: e.target.value })}
              className="gba:w-full"
            >
              <div className="gba:space-y-3">
                {assignmentTypeOptions.map(option => (
                  <div
                    key={option.value}
                    className={`gba:w-full gba:p-4 gba:border gba:border-gray-200 gba:rounded-lg gba:cursor-pointer gba:transition-colors ${
                      rules.type === option.value ? 'gba:border-blue-500 gba:bg-blue-50' : 'hover:gba:border-blue-300'
                    }`}
                    onClick={() => handleRulesChange({ type: option.value as any })}
                  >
                    <div className="gba:flex gba:items-start gba:space-x-3">
                      <Radio value={option.value} className="gba:mt-1" />
                      <div className="gba:text-lg gba:mt-0 gba:text-blue-600">{option.icon}</div>
                      <div className="gba:flex-1">
                        <div className="gba:font-medium gba:text-gray-900">{option.label}</div>
                        <div className="gba:text-sm gba:text-gray-500 gba:mt-1">{option.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Radio.Group>
          </Form.Item>
        </CardContent>
      </Card>

      {/* Assignment Strategy */}
      <Card data-testid={`${testId}-strategy`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:space-x-2">
            <span>🎯 Assignment Strategy</span>
            <Tooltip title="How the system should determine who gets assigned">
              <InfoIcon size={16} className="gba:text-gray-400" />
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form.Item>
            <Select
              value={rules.strategy}
              onChange={value => handleRulesChange({ strategy: value })}
              style={{ width: '100%' }}
              size="large"
            >
              {strategyOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  <div className="gba:flex gba:items-center gba:space-x-3">
                    <div className="gba:text-lg">{option.icon}</div>
                    <div>
                      <div className="gba:font-medium">{option.label}</div>
                      <div className="gba:text-xs gba:text-gray-500">{option.description}</div>
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {rules.strategy !== 'manual' && (
            <Alert
              message="Automatic Assignment"
              description={`Tasks will be automatically assigned using the ${rules.strategy.replace('-', ' ')} strategy when the workflow executes. Specific assignments will be determined at runtime based on the current organizational structure.`}
              type="info"
              showIcon
              className="gba:mt-3"
            />
          )}
        </CardContent>
      </Card>

      {/* Assignment Options */}
      <Card data-testid={`${testId}-options`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:space-x-2">
            <span>⚙️ Assignment Options</span>
            <Tooltip title="Additional assignment behavior settings">
              <InfoIcon size={16} className="gba:text-gray-400" />
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <Text strong>Allow Reassignment</Text>
                <div className="gba:text-sm gba:text-gray-600">Allow assigned users to reassign tasks to others</div>
              </div>
              <Switch
                checked={rules.allowReassignment}
                onChange={checked => handleRulesChange({ allowReassignment: checked })}
              />
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <Text strong>Auto-assign</Text>
                <div className="gba:text-sm gba:text-gray-600">Automatically assign when workflow step starts</div>
              </div>
              <Switch checked={rules.autoAssign} onChange={checked => handleRulesChange({ autoAssign: checked })} />
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <Text strong>Requires Approval</Text>
                <div className="gba:text-sm gba:text-gray-600">Assignment must be approved before task can start</div>
              </div>
              <Switch
                checked={rules.requiresApproval}
                onChange={checked => handleRulesChange({ requiresApproval: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escalation Rules */}
      <Card data-testid={`${testId}-escalation`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:space-x-2">
            <span>⏰ Escalation Rules</span>
            <Tooltip title="What happens if tasks are not completed in time">
              <InfoIcon size={16} className="gba:text-gray-400" />
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <Text strong>Enable Escalation</Text>
                <div className="gba:text-sm gba:text-gray-600">Escalate overdue tasks automatically</div>
              </div>
              <Switch
                checked={rules.escalation.enabled}
                onChange={checked => handleEscalationChange({ enabled: checked })}
              />
            </div>

            {rules.escalation.enabled && (
              <div className="gba:space-y-3 gba:ml-4 gba:pl-4 gba:border-l-2 gba:border-blue-200">
                <Form.Item label="Escalate After">
                  <Select
                    value={rules.escalation.timeoutHours}
                    onChange={value => handleEscalationChange({ timeoutHours: value })}
                    style={{ width: '100%' }}
                  >
                    {timeoutOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label="Escalate To">
                  <Select
                    value={rules.escalation.escalateTo}
                    onChange={value => handleEscalationChange({ escalateTo: value })}
                    style={{ width: '100%' }}
                  >
                    {escalationOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Constraints */}
      <Card data-testid={`${testId}-constraints`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:space-x-2">
            <span>🔒 Assignment Constraints</span>
            <Tooltip title="Rules that limit or control assignments">
              <InfoIcon size={16} className="gba:text-gray-400" />
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <Text strong>Prevent Same User Assignment</Text>
                <div className="gba:text-sm gba:text-gray-600">Don't assign to the same user as the previous step</div>
              </div>
              <Switch
                checked={rules.constraints.sameUser}
                onChange={checked => handleConstraintsChange({ sameUser: checked })}
              />
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <Text strong>Skip Weekends</Text>
                <div className="gba:text-sm gba:text-gray-600">Don't assign tasks on weekends</div>
              </div>
              <Switch
                checked={rules.constraints.skipWeekends}
                onChange={checked => handleConstraintsChange({ skipWeekends: checked })}
              />
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <Text strong>Business Hours Only</Text>
                <div className="gba:text-sm gba:text-gray-600">Only assign during business hours</div>
              </div>
              <Switch
                checked={rules.constraints.businessHoursOnly}
                onChange={checked => handleConstraintsChange({ businessHoursOnly: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      <div style={{ marginBottom: '24px' }}>
        <Alert
          message="Assignment Rules Configuration"
          description="These rules define how tasks will be assigned when the workflow executes. Specific users, roles, or departments will be determined at runtime based on the current organizational structure and the selected assignment strategy."
          type="info"
          showIcon
          data-testid={`${testId}-info`}
        />
      </div>
    </div>
  )
}
