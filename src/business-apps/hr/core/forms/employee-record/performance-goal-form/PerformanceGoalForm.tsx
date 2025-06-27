'use client';

import React, { useState } from 'react';
import { Form, message, Typography, Divider } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';
import { startProcess } from '@/common/utils/start-process';
import { useTranslation } from 'react-i18next';
import FormScreenComponent from './components/FormScreenComponent';

interface PerformanceGoalFormProps {
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
 * Form for creating new employee performance goals
 */
const PerformanceGoalFormContent: React.FC<PerformanceGoalFormProps> = ({
  onClose,
  onSuccess,
  employeeId,
  prefixDataTestId = 'performance-goal-form'
}) => {
  const [form] = Form.useForm<PerformanceGoalFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();
  
  const { Title } = Typography;
  
  // Status options based on the API schema
  const statusOptions = [
    { value: 'ON_TRACK', label: 'On Track' },
    { value: 'BEHIND_TARGET', label: 'Behind Target' },
    { value: 'AT_RISK', label: 'At Risk' },
    { value: 'ACHIEVED', label: 'Achieved' },
    { value: 'NOT_ACHIEVED', label: 'Not Achieved' }
  ];

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);
      
      // Transform dates to ISO string format as required by API
      const payload = {
        employeePerformanceGoal: {
          title: values.title,
          startDate: values.startDate.toISOString(),
          dueDate: values.dueDate.toISOString(),
          status: values.status || 'ON_TRACK',
          progressPercent: values.progressPercent || 0,
          employee: employeeId,
        },
        changeMode: "INSERT"
      };
      
      // Start the process to save the performance goal
      startProcess({
        domain: 'employee',
        processName: 'saveEmployeePerformanceGoal',
        payload,
        builderType: "NATIVE_SCREEN"
      });
      
      message.success('Performance goal was successfully created');
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving performance goal:', error);
      message.error('Failed to create performance goal');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-screen gba:px-4">
      <div className="gba:w-full gba:max-w-md gba:bg-white gba:rounded gba:shadow-md gba:p-6">
        <div className="gba:headerContainer">
          <div className="gba:titleContainer">
            <Title level={4} className="gba:headerTitle gba:text-center">
              {t("performance_goal.title", "Set New Goal")}
            </Title>
          </div>
        </div>
        <Divider className="gba:headerDivider" />
        
        <FormScreenComponent
          form={form}
          isSubmitting={isSubmitting}
          handleFormSubmit={handleFormSubmit}
          statusOptions={statusOptions}
          prefixDataTestId={prefixDataTestId}
        />
      </div>
    </div>
  );
};

// Wrapper component
const PerformanceGoalForm: React.FC<BusinessAppContextProps & { employeeId: string, onClose?: () => void, onSuccess?: () => void }> = ({ 
  employeeId,
  onClose = () => {},
  onSuccess
}) => {
  return (
    <PerformanceGoalFormContent 
      employeeId={employeeId}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};

export default PerformanceGoalForm;
