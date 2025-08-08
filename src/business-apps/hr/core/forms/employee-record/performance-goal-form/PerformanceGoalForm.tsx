'use client';

import React, { useState, useEffect } from 'react';
import { Form, message, Typography, Divider } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { useTranslation } from 'react-i18next';
import FormScreenComponent from './components/FormScreenComponent';

interface PerformanceGoalFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  employeeId: string;
  prefixDataTestId?: string;
  additionalData: any;
}

interface PerformanceGoalFormData {
  title: string;
  startDate: Date;
  dueDate: Date;
  status: string;
  progressPercent: number;
}

const statusOptions = [
  { value: 'ON_TRACK', label: 'On Track' },
  { value: 'BEHIND_TARGET', label: 'Behind Target' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'ACHIEVED', label: 'Achieved' },
  { value: 'NOT_ACHIEVED', label: 'Not Achieved' }
];

/**
 * Performance Goal Form Component
 * Form for creating new employee performance goals or editing existing ones
 */
const PerformanceGoalFormContent: React.FC<PerformanceGoalFormProps> = ({
  onClose,
  onSuccess,
  prefixDataTestId = 'performance-goal-form',
  additionalData
}) => {
  const [form] = Form.useForm<PerformanceGoalFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();
  
  const { Title } = Typography;
  
  // Status options based on the API schema
 
  const isEditMode = additionalData?.goalId ? true : false;
  // Initialize form with existing data when in edit mode
  useEffect(() => {
    if (additionalData) {
      // Helper function to safely convert date strings to Date objects
      const safeDateConversion = (dateString: string | undefined): Date => {
        if (!dateString) return new Date();
        try {
          const date = new Date(dateString);
          return isNaN(date.getTime()) ? new Date() : date;
        } catch (error) {
          console.warn('Failed to parse date:', dateString, error);
          return new Date();
        }
      };

      const initialValues = {
        title: additionalData.title || '',
        startDate: safeDateConversion(additionalData.startDate),
        dueDate: safeDateConversion(additionalData.dueDate),
        status: additionalData.status || 'ON_TRACK',
        progressPercent: additionalData.progressPercent || 0
      };
      
      form.setFieldsValue(initialValues);
    } else {
      // For create mode, set start date to today and due date to 5 days from today
      const today = dayjs().startOf('day'); // Start of day to avoid time issues
      const dueDate = today.add(5, 'day');
      
      console.log('Creating new goal - Start date:', today.toDate(), 'Due date:', dueDate.toDate());
      
      form.setFieldsValue({ 
        startDate: today.toDate(),
        dueDate: dueDate.toDate() 
      });
    }
  }, [ additionalData, form]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);
      
      // Transform dates to ISO string format as required by API
      const payload = {
        employeePerformanceGoal: {
          id: isEditMode ? additionalData.goalId : null,
          title: values.title,
          startDate: values.startDate instanceof Date ? values.startDate.toISOString() : values.startDate,
          dueDate: values.dueDate instanceof Date ? values.dueDate.toISOString() : values.dueDate,
          status: values.status || 'ON_TRACK',
          progressPercent: values.progressPercent || 0,
          employee: additionalData?.employeeId,
          version: isEditMode && additionalData?.version ? additionalData.version : 0
        },
        changeMode: isEditMode ? "UPDATE" : "INSERT"
      };
      console.log("🚀 ~ Goal Payload:", payload)
      
      
      // Validate that we have the required data for edit mode
      if (isEditMode && !additionalData?.goalId) {
        console.error('Edit mode enabled but no goal ID found:', additionalData);
        message.error('Cannot edit goal: Goal ID not found');
        return;
      }
      
      // For editing existing goals, continue the current process
      dispatchProcessContinueEvent('pse_complete', payload);
      
      const successMessage = isEditMode 
        ? 'Performance goal was successfully updated'
        : 'Performance goal was successfully created';
      
      message.success(successMessage);
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving performance goal:', error);
      const errorMessage = isEditMode 
        ? 'Failed to update performance goal'
        : 'Failed to create performance goal';
      message.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormTitle = () => {
    return isEditMode 
      ? t("performance_goal.edit_title", "Edit Performance Goal")
      : t("performance_goal.title", "Set New Goal");
  };

  return (
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:min-h-screen gba:px-4">
      <div className="gba:w-full gba:max-w-md gba:bg-white gba:rounded gba:shadow-md gba:p-6">
        <div className="gba:headerContainer">
          <div className="gba:titleContainer">
            <Title level={4} className="gba:headerTitle gba:text-center">
              {getFormTitle()}
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
          isEditMode={isEditMode}
        />
      </div>
    </div>
  );
};

// Wrapper component
const PerformanceGoalForm: React.FC<BusinessAppContextProps & { 
  employeeId: string, 
  onClose?: () => void, 
  onSuccess?: () => void,
}> = ({ 
  employeeId,
  onClose = () => {},
  onSuccess,
  additionalData
}) => {
  return (
    <PerformanceGoalFormContent 
      employeeId={employeeId}
      onClose={onClose}
      onSuccess={onSuccess}
      additionalData={additionalData?.psi_taskPayload?.psi_initialParameters}
    />
  );
};

export default PerformanceGoalForm;
