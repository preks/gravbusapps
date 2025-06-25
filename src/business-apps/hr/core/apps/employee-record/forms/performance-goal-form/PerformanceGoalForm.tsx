'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, DatePicker, Select, InputNumber, Button, message } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';
import { useRestClient } from '@/common/network/rest/useRestClient';

interface PerformanceGoalFormProps extends BusinessAppContextProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  employeeId: string;
  prefixDataTestId?: string;
}

interface PerformanceGoalFormData {
  title: string;
  startDate: dayjs.Dayjs;
  dueDate: dayjs.Dayjs;
  status: string;
  progressPercent: number;
}

/**
 * Performance Goal Form Component
 * Modal form for creating new employee performance goals
 */
const PerformanceGoalForm: React.FC<PerformanceGoalFormProps> = ({
  visible,
  onClose,
  onSuccess,
  employeeId,
  accessToken,
  prefixDataTestId = 'performance-goal-form'
}) => {
  const [form] = Form.useForm<PerformanceGoalFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const restClient = useRestClient(accessToken);
  
  // Status options based on the API schema
  const statusOptions = [
    { value: 'ON_TRACK', label: 'On Track' },
    { value: 'BEHIND_TARGET', label: 'Behind Target' },
    { value: 'AT_RISK', label: 'At Risk' },
    { value: 'ACHIEVED', label: 'Achieved' },
    { value: 'NOT_ACHIEVED', label: 'Not Achieved' }
  ];

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);
      
      // Transform dates to ISO string format as required by API
      const formattedValues = {
        employeePerformanceGoal: {
          title: values.title,
          startDate: values.startDate.toISOString(),
          dueDate: values.dueDate.toISOString(),
          status: values.status || 'ON_TRACK',
          progressPercent: values.progressPercent || 0,
          employee: employeeId
        },
        changeMode: "INSERT"
      };
      
      // Call the API to save the performance goal
      const response = await restClient.post('/processes/employee/saveEmployeePerformanceGoal', formattedValues);
      
      if (response) {
        message.success('Performance goal was successfully created');
        form.resetFields();
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Error saving performance goal:', error);
      message.error('Failed to create performance goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Set New Goal"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
      data-testid={`${prefixDataTestId}-modal`}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          startDate: dayjs(),
          dueDate: dayjs().add(5, 'day'),
          progressPercent: 0,
          status: 'ON_TRACK'
        }}
        data-testid={`${prefixDataTestId}-form`}
      >
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: 'Please enter a goal title' }]}
          data-testid={`${prefixDataTestId}-title-field`}
        >
          <Input placeholder="Enter goal title" maxLength={100} />
        </Form.Item>
        
        <Form.Item
          name="startDate"
          label="Start Date"
          rules={[{ required: true, message: 'Please select a start date' }]}
          data-testid={`${prefixDataTestId}-start-date-field`}
        >
          <DatePicker className="gba:w-full" />
        </Form.Item>
        
        <Form.Item
          name="dueDate"
          label="Due Date"
          rules={[
            { required: true, message: 'Please select a due date' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || !getFieldValue('startDate') || value.isAfter(getFieldValue('startDate'))) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Due date must be after start date'));
              },
            }),
          ]}
          data-testid={`${prefixDataTestId}-due-date-field`}
        >
          <DatePicker className="gba:w-full" />
        </Form.Item>
        
        <Form.Item 
          name="status"
          label="Status"
          data-testid={`${prefixDataTestId}-status-field`}
        >
          <Select options={statusOptions} />
        </Form.Item>
        
        <Form.Item
          name="progressPercent"
          label="Progress"
          data-testid={`${prefixDataTestId}-progress-field`}
        >
          <InputNumber 
            className="gba:w-full"
            formatter={value => `${value}%`}
            parser={(value) => {
              const parsed = parseInt(value?.replace('%', '') || '0', 10);
              return isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
            }}
          />
        </Form.Item>
        
        <div className="gba:flex gba:justify-end gba:mt-6 gba:space-x-3">
          <Button 
            onClick={handleCancel} 
            data-testid={`${prefixDataTestId}-cancel-button`}
          >
            Cancel
          </Button>
          <Button 
            type="primary" 
            onClick={handleFormSubmit} 
            loading={isSubmitting}
            data-testid={`${prefixDataTestId}-create-button`}
          >
            Create
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default PerformanceGoalForm;
