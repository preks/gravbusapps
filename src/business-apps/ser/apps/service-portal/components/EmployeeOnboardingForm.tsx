import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRealEmployeeData } from '../hooks/useRealEmployeeData'
import { useEmploymentTypeCatalog, getEmploymentTypeOptions } from '../hooks/useEmploymentTypeCatalog'
import { createConductorWorkflowEngine } from '../../../services'
import type { WorkflowEngine } from '../../../packages/services-plus-core/src'

// UI Components - TODO: Replace with @newwork/nw-design-system when migrated
import { Card, Form, Input, Select, DatePicker, Button, Checkbox, Alert, Spin, Row, Col } from 'antd'
import { UserOutlined, LaptopOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Option } = Select
const { TextArea } = Input

export interface EmployeeOnboardingFormProps extends BusinessAppContextProps {
  onSuccess?: (requestId: string) => void
  onCancel?: () => void
}

/**
 * Employee Onboarding Request Form with Real Data Integration
 *
 * This component demonstrates the complete integration between:
 * - Service Portal UI with real GraphQL data loading
 * - Custom Flow Engine workflow execution
 * - Service Desk task distribution
 */
export const EmployeeOnboardingForm: React.FC<EmployeeOnboardingFormProps> = ({
  onSuccess,
  onCancel,
  ...contextProps
}) => {
  const [form] = Form.useForm()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [workflowEngine, setWorkflowEngine] = useState<WorkflowEngine | null>(null)

  // Load real employee data from GraphQL
  const {
    employees,
    jobPositions,
    departments,
    isLoading: employeeDataLoading,
    error: employeeDataError,
    fetchJobPositions
  } = useRealEmployeeData(contextProps)

  // Load employment types from catalog
  const {
    employmentTypes,
    isLoading: employmentTypesLoading,
    error: employmentTypesError
  } = useEmploymentTypeCatalog(contextProps)

  // Initialize workflow engine
  useEffect(() => {
    if (contextProps.accessToken) {
      try {
        const engine = createConductorWorkflowEngine(contextProps)
        setWorkflowEngine(engine)
        console.log('[EmployeeOnboardingForm] Conductor workflow engine initialized')
      } catch (error) {
        console.error('[EmployeeOnboardingForm] Error initializing workflow engine:', error)
      }
    }
  }, [contextProps.accessToken])

  // Handle department selection and cascade job positions
  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartmentId(departmentId)
    form.setFieldsValue({ position: undefined, reportingManager: undefined })

    if (departmentId) {
      fetchJobPositions('', departmentId)
    }
  }

  // Handle form submission
  const handleSubmit = async (values: any) => {
    if (!workflowEngine) {
      console.error('[EmployeeOnboardingForm] Workflow engine not initialized')
      return
    }

    setIsSubmitting(true)

    try {
      console.log('[EmployeeOnboardingForm] Submitting onboarding request:', values)

      // Start the employee onboarding workflow
      const requestId = await workflowEngine.startRequest('employee-onboarding-request', {
        // Employee Information
        employeeName: values.employeeName,
        employeeEmail: values.employeeEmail,
        startDate: values.startDate?.format('YYYY-MM-DD'),

        // Position & Organization (using real IDs)
        department: values.department,
        position: values.position,
        reportingManager: values.reportingManager,
        employmentType: values.employmentType,

        // Work Setup
        workLocation: values.workLocation,
        laptopType: values.laptopType,
        accessories: values.accessories || [],

        // Request Settings
        urgency: values.urgency || 'standard',
        specialRequirements: values.specialRequirements || '',

        // Metadata
        requestedBy: contextProps.userInfo?.id,
        requestDate: new Date().toISOString()
      })

      console.log(`[EmployeeOnboardingForm] Request submitted successfully: ${requestId}`)

      if (onSuccess) {
        onSuccess(requestId)
      }
    } catch (error) {
      console.error('[EmployeeOnboardingForm] Error submitting request:', error)
      form.setFields([
        {
          name: 'submit',
          errors: [error instanceof Error ? error.message : 'Failed to submit request']
        }
      ])
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter job positions based on selected department
  const filteredJobPositions = jobPositions.filter(
    position => !selectedDepartmentId || position.departmentId === selectedDepartmentId
  )

  // Filter managers based on selected department
  const filteredManagers = employees.filter(
    employee =>
      employee.jobTitle.toLowerCase().includes('manager') || employee.jobTitle.toLowerCase().includes('director')
  )

  const isLoading = employeeDataLoading || employmentTypesLoading
  const hasError = employeeDataError || employmentTypesError

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:p-12">
        <Spin size="large" />
        <span className="gba:ml-3">Loading organizational data...</span>
      </div>
    )
  }

  if (hasError) {
    return (
      <Alert
        message="Data Loading Error"
        description={employeeDataError || employmentTypesError}
        type="error"
        showIcon
        className="gba:m-6"
      />
    )
  }

  return (
    <div data-testid="employee-onboarding-form" className="gba:max-w-4xl gba:mx-auto gba:p-6">
      <Card
        title={
          <div className="gba:flex gba:items-center gba:gap-3">
            <UserOutlined className="gba:text-blue-600" />
            <span>Employee Onboarding Request</span>
          </div>
        }
        bordered={false}
      >
        <div className="gba:mb-6">
          <p className="gba:text-gray-600 gba:mb-4">
            Submit a comprehensive onboarding request that will automatically coordinate across HR, IT, Facilities, and
            other departments to ensure the new employee has everything ready for their first day.
          </p>

          <div className="gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded-lg gba:p-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <ClockCircleOutlined className="gba:text-blue-600" />
              <span className="gba:font-medium gba:text-blue-900">What happens next:</span>
            </div>
            <ul className="gba:text-sm gba:text-blue-800 gba:list-disc gba:list-inside gba:space-y-1">
              <li>HR will process documentation and contracts</li>
              <li>IT will prepare equipment and system access</li>
              <li>Training schedules will be coordinated</li>
              <li>Workspace and facilities will be prepared</li>
              <li>You can track progress in "My Requests"</li>
            </ul>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit} data-testid="onboarding-form">
          <Row gutter={[16, 0]}>
            {/* Employee Information Section */}
            <Col span={24}>
              <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-4">Employee Information</h3>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="employeeName"
                label="Employee Full Name"
                rules={[{ required: true, message: 'Please enter employee name' }]}
                data-testid="employee-name-field"
              >
                <Input placeholder="John Doe" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="employeeEmail"
                label="Employee Email Address"
                rules={[
                  { required: true, message: 'Please enter employee email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
                data-testid="employee-email-field"
              >
                <Input placeholder="john.doe@personal-email.com" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="startDate"
                label="Start Date"
                rules={[{ required: true, message: 'Please select start date' }]}
                data-testid="start-date-field"
              >
                <DatePicker className="gba:w-full" />
              </Form.Item>
            </Col>

            {/* Position & Organization Section */}
            <Col span={24}>
              <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-4 gba:mt-6">
                Position & Organization
              </h3>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="department"
                label="Department"
                rules={[{ required: true, message: 'Please select department' }]}
                data-testid="department-field"
              >
                <Select
                  placeholder="Select department..."
                  onChange={handleDepartmentChange}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {departments.map(dept => (
                    <Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="position"
                label="Position/Job Title"
                rules={[{ required: true, message: 'Please select position' }]}
                data-testid="position-field"
              >
                <Select
                  placeholder="Select position..."
                  disabled={!selectedDepartmentId}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {filteredJobPositions.map(position => (
                    <Option key={position.id} value={position.id}>
                      {position.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="reportingManager"
                label="Reporting Manager"
                rules={[{ required: true, message: 'Please select reporting manager' }]}
                data-testid="manager-field"
              >
                <Select
                  placeholder="Select manager..."
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {filteredManagers.map(manager => (
                    <Option key={manager.employeeId} value={manager.employeeId}>
                      {manager.displayName} - {manager.jobTitle}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="employmentType"
                label="Employment Type"
                rules={[{ required: true, message: 'Please select employment type' }]}
                data-testid="employment-type-field"
              >
                <Select placeholder="Select employment type...">
                  {getEmploymentTypeOptions(employmentTypes).map(type => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* Work Setup Section */}
            <Col span={24}>
              <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-4 gba:mt-6">Work Setup</h3>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="workLocation"
                label="Work Location"
                rules={[{ required: true, message: 'Please select work location' }]}
                data-testid="work-location-field"
              >
                <Select placeholder="Select work location...">
                  <Option value="office-main">Main Office</Option>
                  <Option value="office-branch">Branch Office</Option>
                  <Option value="remote">Remote</Option>
                  <Option value="hybrid">Hybrid</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="laptopType"
                label="Laptop Type"
                rules={[{ required: true, message: 'Please select laptop type' }]}
                data-testid="laptop-type-field"
              >
                <Select placeholder="Select laptop type...">
                  <Option value="macbook-pro">MacBook Pro</Option>
                  <Option value="macbook-air">MacBook Air</Option>
                  <Option value="windows-laptop">Windows Laptop</Option>
                  <Option value="linux-laptop">Linux Laptop</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="accessories" label="Additional Equipment" data-testid="accessories-field">
                <Checkbox.Group>
                  <Row>
                    <Col span={12}>
                      <Checkbox value="external-monitor">External Monitor</Checkbox>
                    </Col>
                    <Col span={12}>
                      <Checkbox value="keyboard">External Keyboard</Checkbox>
                    </Col>
                    <Col span={12}>
                      <Checkbox value="mouse">Mouse</Checkbox>
                    </Col>
                    <Col span={12}>
                      <Checkbox value="headset">Headset</Checkbox>
                    </Col>
                    <Col span={12}>
                      <Checkbox value="webcam">Webcam</Checkbox>
                    </Col>
                    <Col span={12}>
                      <Checkbox value="docking-station">Docking Station</Checkbox>
                    </Col>
                  </Row>
                </Checkbox.Group>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="urgency" label="Urgency Level" initialValue="standard" data-testid="urgency-field">
                <Select>
                  <Option value="standard">Standard (5-7 business days)</Option>
                  <Option value="urgent">Urgent (2-3 business days)</Option>
                  <Option value="critical">Critical (1 business day)</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                name="specialRequirements"
                label="Special Requirements or Notes"
                data-testid="special-requirements-field"
              >
                <TextArea
                  rows={4}
                  placeholder="Any special accommodations, security clearances, or additional setup requirements..."
                />
              </Form.Item>
            </Col>

            {/* Submit Section */}
            <Col span={24}>
              <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-4 gba:border-t gba:border-gray-200">
                {onCancel && (
                  <Button onClick={onCancel} data-testid="cancel-button">
                    Cancel
                  </Button>
                )}
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting}
                  disabled={!workflowEngine}
                  icon={<LaptopOutlined />}
                  data-testid="submit-button"
                >
                  {isSubmitting ? 'Starting Onboarding Process...' : 'Start Onboarding Process'}
                </Button>
              </div>
              {!workflowEngine && (
                <div className="gba:text-center gba:mt-2">
                  <span className="gba:text-xs gba:text-gray-500">Connecting to workflow engine...</span>
                </div>
              )}
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  )
}
