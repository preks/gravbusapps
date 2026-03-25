import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Form, Input, Select, Switch, InputNumber, TimePicker, Divider, Space, Typography, Alert, Tooltip } from 'antd'
import { InfoIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useWizardStore } from '../../hooks/useWizardStore'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

interface AdvancedSettingsProps {
  'data-testid'?: string
}

interface AdvancedConfiguration {
  reminder?: {
    enabled: boolean
    beforeDeadline: number
    beforeDeadlineUnit: 'minutes' | 'hours' | 'days'
    message?: string
  }
  escalation?: {
    enabled: boolean
    afterDeadline: number
    afterDeadlineUnit: 'minutes' | 'hours' | 'days'
    escalateTo: 'manager' | 'admin' | 'custom'
    customEscalationTargets?: string[]
    message?: string
  }
  timing?: {
    defaultDeadline: number
    defaultDeadlineUnit: 'minutes' | 'hours' | 'days'
    businessHoursOnly: boolean
    workingHours?: {
      start: string
      end: string
    }
    excludeWeekends: boolean
  }
  notifications?: {
    emailEnabled: boolean
    smsEnabled: boolean
    pushEnabled: boolean
    digestEnabled: boolean
  }
}

/**
 * Advanced settings component for configuring timing, escalation, and other advanced workflow options
 */
export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ 'data-testid': testId = 'advanced-settings' }) => {
  const { configuration, updateConfiguration } = useWizardStore()
  const [form] = Form.useForm()
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfiguration>(() => ({
    reminder: {
      enabled: false,
      beforeDeadline: 1,
      beforeDeadlineUnit: 'hours',
      message: ''
    },
    escalation: {
      enabled: false,
      afterDeadline: 1,
      afterDeadlineUnit: 'hours',
      escalateTo: 'manager',
      message: ''
    },
    timing: {
      defaultDeadline: 1,
      defaultDeadlineUnit: 'days',
      businessHoursOnly: false,
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      excludeWeekends: false
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      digestEnabled: false
    }
  }))

  // Load existing configuration
  useEffect(() => {
    if (configuration.advanced) {
      setAdvancedConfig(prev => ({ ...prev, ...configuration.advanced }))
      form.setFieldsValue(configuration.advanced)
    }
  }, [configuration.advanced, form])

  // Update configuration when advanced config changes
  useEffect(() => {
    updateConfiguration('advanced', advancedConfig)
  }, [advancedConfig, updateConfiguration])

  const handleConfigChange = (section: keyof AdvancedConfiguration, updates: any) => {
    setAdvancedConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates
      }
    }))
  }

  const timeUnitOptions = [
    { value: 'minutes', label: 'Minutes' },
    { value: 'hours', label: 'Hours' },
    { value: 'days', label: 'Days' }
  ]

  const escalationOptions = [
    { value: 'manager', label: 'Direct Manager' },
    { value: 'admin', label: 'System Administrator' },
    { value: 'custom', label: 'Custom Recipients' }
  ]

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Header */}
      <div className="gba:text-center gba:mb-6">
        <Title level={3}>
          {getTranslationFromI18nKeyAndLabel('flow.wizard.advancedSettings', 'Advanced Settings')}
        </Title>
        <Text className="gba:text-gray-600">
          {getTranslationFromI18nKeyAndLabel(
            'flow.wizard.advancedSettingsDescription',
            'Configure timing, escalation, and notification settings for your workflow'
          )}
        </Text>
      </div>

      <Form form={form} layout="vertical">
        {/* Timing Configuration */}
        <Card className="gba:mb-6" data-testid={`${testId}-timing`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:space-x-2">
              <span>⏰ Timing Configuration</span>
              <Tooltip title="Configure default deadlines and working hours">
                <InfoIcon size={16} className="gba:text-gray-400" />
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
              <Form.Item label="Default Deadline">
                <Input.Group compact>
                  <InputNumber
                    value={advancedConfig.timing?.defaultDeadline}
                    onChange={value => handleConfigChange('timing', { defaultDeadline: value })}
                    min={1}
                    max={365}
                    style={{ width: '60%' }}
                  />
                  <Select
                    value={advancedConfig.timing?.defaultDeadlineUnit}
                    onChange={value => handleConfigChange('timing', { defaultDeadlineUnit: value })}
                    style={{ width: '40%' }}
                  >
                    {timeUnitOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Input.Group>
              </Form.Item>

              <Form.Item label="Business Hours Only">
                <Switch
                  checked={advancedConfig.timing?.businessHoursOnly}
                  onChange={checked => handleConfigChange('timing', { businessHoursOnly: checked })}
                />
              </Form.Item>

              {advancedConfig.timing?.businessHoursOnly && (
                <>
                  <Form.Item label="Working Hours Start">
                    <TimePicker
                      value={
                        advancedConfig.timing?.workingHours?.start
                          ? dayjs(advancedConfig.timing.workingHours.start, 'HH:mm')
                          : undefined
                      }
                      onChange={time =>
                        handleConfigChange('timing', {
                          workingHours: {
                            ...advancedConfig.timing?.workingHours,
                            start: time?.format('HH:mm') || '09:00'
                          }
                        })
                      }
                      format="HH:mm"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item label="Working Hours End">
                    <TimePicker
                      value={
                        advancedConfig.timing?.workingHours?.end
                          ? dayjs(advancedConfig.timing.workingHours.end, 'HH:mm')
                          : undefined
                      }
                      onChange={time =>
                        handleConfigChange('timing', {
                          workingHours: {
                            ...advancedConfig.timing?.workingHours,
                            end: time?.format('HH:mm') || '17:00'
                          }
                        })
                      }
                      format="HH:mm"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </>
              )}

              <Form.Item label="Exclude Weekends">
                <Switch
                  checked={advancedConfig.timing?.excludeWeekends}
                  onChange={checked => handleConfigChange('timing', { excludeWeekends: checked })}
                />
              </Form.Item>
            </div>
          </CardContent>
        </Card>

        {/* Reminder Configuration */}
        <Card className="gba:mb-6" data-testid={`${testId}-reminder`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:space-x-2">
              <span>🔔 Reminder Settings</span>
              <Tooltip title="Configure automatic reminders before deadlines">
                <InfoIcon size={16} className="gba:text-gray-400" />
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form.Item label="Enable Reminders">
              <Switch
                checked={advancedConfig.reminder?.enabled}
                onChange={checked => handleConfigChange('reminder', { enabled: checked })}
              />
            </Form.Item>

            {advancedConfig.reminder?.enabled && (
              <div className="gba:space-y-4">
                <Form.Item label="Send Reminder Before Deadline">
                  <Input.Group compact>
                    <InputNumber
                      value={advancedConfig.reminder?.beforeDeadline}
                      onChange={value => handleConfigChange('reminder', { beforeDeadline: value })}
                      min={1}
                      max={365}
                      style={{ width: '60%' }}
                    />
                    <Select
                      value={advancedConfig.reminder?.beforeDeadlineUnit}
                      onChange={value => handleConfigChange('reminder', { beforeDeadlineUnit: value })}
                      style={{ width: '40%' }}
                    >
                      {timeUnitOptions.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Input.Group>
                </Form.Item>

                <Form.Item label="Custom Reminder Message">
                  <Input.TextArea
                    value={advancedConfig.reminder?.message}
                    onChange={e => handleConfigChange('reminder', { message: e.target.value })}
                    placeholder="Optional custom message for reminders"
                    rows={2}
                  />
                </Form.Item>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Escalation Configuration */}
        <Card className="gba:mb-6" data-testid={`${testId}-escalation`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:space-x-2">
              <span>⚡ Escalation Settings</span>
              <Tooltip title="Configure automatic escalation after deadlines">
                <InfoIcon size={16} className="gba:text-gray-400" />
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form.Item label="Enable Escalation">
              <Switch
                checked={advancedConfig.escalation?.enabled}
                onChange={checked => handleConfigChange('escalation', { enabled: checked })}
              />
            </Form.Item>

            {advancedConfig.escalation?.enabled && (
              <div className="gba:space-y-4">
                <Form.Item label="Escalate After Deadline">
                  <Input.Group compact>
                    <InputNumber
                      value={advancedConfig.escalation?.afterDeadline}
                      onChange={value => handleConfigChange('escalation', { afterDeadline: value })}
                      min={1}
                      max={365}
                      style={{ width: '60%' }}
                    />
                    <Select
                      value={advancedConfig.escalation?.afterDeadlineUnit}
                      onChange={value => handleConfigChange('escalation', { afterDeadlineUnit: value })}
                      style={{ width: '40%' }}
                    >
                      {timeUnitOptions.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Input.Group>
                </Form.Item>

                <Form.Item label="Escalate To">
                  <Select
                    value={advancedConfig.escalation?.escalateTo}
                    onChange={value => handleConfigChange('escalation', { escalateTo: value })}
                    style={{ width: '100%' }}
                  >
                    {escalationOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label="Custom Escalation Message">
                  <Input.TextArea
                    value={advancedConfig.escalation?.message}
                    onChange={e => handleConfigChange('escalation', { message: e.target.value })}
                    placeholder="Optional custom message for escalations"
                    rows={2}
                  />
                </Form.Item>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Configuration */}
        <Card className="gba:mb-6" data-testid={`${testId}-notifications`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:space-x-2">
              <span>📧 Notification Settings</span>
              <Tooltip title="Configure notification channels">
                <InfoIcon size={16} className="gba:text-gray-400" />
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
              <Form.Item label="Email Notifications">
                <Switch
                  checked={advancedConfig.notifications?.emailEnabled}
                  onChange={checked => handleConfigChange('notifications', { emailEnabled: checked })}
                />
              </Form.Item>

              <Form.Item label="SMS Notifications">
                <Switch
                  checked={advancedConfig.notifications?.smsEnabled}
                  onChange={checked => handleConfigChange('notifications', { smsEnabled: checked })}
                />
              </Form.Item>

              <Form.Item label="Push Notifications">
                <Switch
                  checked={advancedConfig.notifications?.pushEnabled}
                  onChange={checked => handleConfigChange('notifications', { pushEnabled: checked })}
                />
              </Form.Item>

              <Form.Item label="Daily Digest">
                <Switch
                  checked={advancedConfig.notifications?.digestEnabled}
                  onChange={checked => handleConfigChange('notifications', { digestEnabled: checked })}
                />
              </Form.Item>
            </div>
          </CardContent>
        </Card>
      </Form>

      {/* Information Alert */}
      <Alert
        message="Advanced Settings"
        description="These settings will apply to all steps in your workflow. You can override specific settings for individual steps in the step configuration."
        type="info"
        showIcon
        data-testid={`${testId}-info-alert`}
      />
    </div>
  )
}
