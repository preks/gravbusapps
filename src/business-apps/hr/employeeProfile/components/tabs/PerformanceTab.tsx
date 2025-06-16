'use client';

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Employee, EmployeeFeedback, EmployeePerformanceGoal } from '../../hooks/useEmployeeData';
import { Button, Card } from '@newwork/gravity-ui-catalog';
import { Modal, Form, Input, DatePicker, Select, message, InputNumber } from 'antd';
import { startProcess } from '@/common/utils/start-process';

interface PerformanceTabProps {
  employee: Employee;
  employeeFeedback: EmployeeFeedback[];
  employeePerformanceGoal: EmployeePerformanceGoal[];
  accessToken: string; // Required by the parent component
}

/**
 * Performance Tab Component
 * Displays performance goals and feedback for the employee
 */
const PerformanceTab: React.FC<PerformanceTabProps> = ({ 
  employee, 
  employeeFeedback,
  employeePerformanceGoal,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accessToken // Required by parent but not used directly
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Open the modal to set a new goal
  const showModal = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  // Close the modal
  const handleCancel = () => {
    form.resetFields();
    setIsModalVisible(false);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      // Format dates for submission
      const formattedValues = {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
      };
      
      // Start process with the correct name
      startProcess({
        domain: 'employee',
        processName: 'saveEmployeePerformanceGoal',
        payload: {
          employeeId: employee.id,
          ...formattedValues
        }
      });
      
      message.success('Performance goal submission started');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Map status to display values and styles
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string, color: string }> = {
      'ON_TRACK': { 
        label: 'On Track', 
        color: 'bg-green-100 text-green-800' 
      },
      'AT_RISK': { 
        label: 'At Risk', 
        color: 'bg-yellow-100 text-yellow-800' 
      },
      'OFF_TRACK': { 
        label: 'Off Track', 
        color: 'bg-red-100 text-red-800' 
      },
      'COMPLETED': { 
        label: 'Completed', 
        color: 'bg-blue-100 text-blue-800' 
      },
      'NOT_ACHIEVED': { 
        label: 'Not Achieved', 
        color: 'bg-gray-100 text-gray-800' 
      }
    };
    
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  // Format feedback for display
  const formatFeedback = () => {
    if (!employeeFeedback || !Array.isArray(employeeFeedback)) return [];
    
    return employeeFeedback.map(feedback => {
      if (!feedback) return null;
      
      const firstName = feedback.senderEmployee?.firstName || '';
      const lastName = feedback.senderEmployee?.lastName || '';
      const pictureThumbnail = feedback.senderEmployee?.employeePosition?.employee?.pictureThumbnail;
      
      return {
        id: feedback.senderEmployeeId || '',
        content: feedback.feedback || '',
        date: feedback.feedbackDate ? dayjs(feedback.feedbackDate).format('MMM D, YYYY') : '',
        sender: `${firstName} ${lastName}`.trim() || "Unknown Sender",
        avatar: pictureThumbnail
          ? `data:image/jpeg;base64,${pictureThumbnail}`
          : '/assets/default-avatar.png'
      };
    }).filter(Boolean);
  };

  const formattedFeedback = formatFeedback();

  return (
    <div className="gba:performance-tab gba:space-y-8">
      {/* Goals Section */}
      <div>
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <h2 className="gba:text-xl gba:font-medium">
            Set New Goal
          </h2>
          <Button 
            onClick={showModal}
            className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded gba:hover:bg-blue-700 gba:transition-colors"
            data-testid="set-new-goal-button"
            variant="primary"
          >
            Set New Goal
          </Button>
        </div>

        {employeePerformanceGoal.length === 0 ? (
          <div className="gba:text-center gba:text-gray-500 gba:py-8">
            <p>No goals found.</p>
          </div>
        ) : (
          <div className="gba:space-y-4">
            {employeePerformanceGoal.map((goal) => {
              const statusInfo = getStatusInfo(goal.status);
              
              return (
                <Card key={`goal-${goal.title ?? ''}-${goal.status ?? ''}`} bordered>
                  <div className="gba:flex gba:flex-col gba:md:flex-row gba:md:items-center gba:justify-between gba:mb-4">
                    <h3 className="gba:text-lg gba:font-medium">{goal.title}</h3>
                    <span className={`gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:mt-2 gba:md:mt-0 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  
                  <div className="gba:mb-4">
                    <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2.5">
                      <div 
                        className="gba:bg-blue-600 gba:h-2.5 gba:rounded-full" 
                        style={{ width: `${goal.progressPercent}%` }}
                      ></div>
                    </div>
                    <div className="gba:flex gba:justify-between gba:mt-1 gba:text-sm gba:text-gray-600">
                      <span>progress</span>
                      <span>{goal.progressPercent}%</span>
                    </div>
                  </div>
                  
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:text-sm">
                    <div>
                      <span className="gba:block gba:text-gray-500">Start Date</span>
                      <span>{dayjs(goal.startDate).format('MMM D, YYYY')}</span>
                    </div>
                    <div>
                      <span className="gba:block gba:text-gray-500">Due Date</span>
                      <span>{dayjs(goal.dueDate).format('MMM D, YYYY')}</span>
                    </div>
                    <div>
                      <span className="gba:block gba:text-gray-500">Completion Date</span>
                      <span>{goal.completionDate ? dayjs(goal.completionDate).format('MMM D, YYYY') : '-'}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div>
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <h2 className="gba:text-xl gba:font-medium">
            Feedback
          </h2>
          <Button 
            onClick={() => {
              // Trigger flow to give feedback
              if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(
                  new CustomEvent('com.newwork.process.start', {
                    detail: {
                      domain: 'employee',
                      processName: 'giveEmployeeFeedback',
                      startProcessBody: {
                        employeeId: employee.id
                      }
                    }
                  })
                );
              }
            }}
            className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded gba:hover:bg-blue-700 gba:transition-colors"
            data-testid="give-feedback-button"
            variant="primary"
          >
            Give Feedback
          </Button>
        </div>

        {formattedFeedback.length === 0 ? (
          <div className="gba:text-center gba:text-gray-500 gba:py-8">
            <p>No feedback data available.</p>
          </div>
        ) : (
          <div className="gba:space-y-4">
            {formattedFeedback.map((feedback) => {
              // TypeScript safety - this should never happen due to our filter(Boolean) above
              if (!feedback) return null;
              
              return (
                <Card key={`feedback-${feedback.sender ?? ''}-${feedback.date ?? ''}`} className="gba:p-4">
                  <div className="gba:flex gba:items-start">
                    <div className="gba:shrink-0 gba:mr-4">
                      <div className="gba:w-10 gba:h-10 gba:rounded-full gba:overflow-hidden gba:bg-gray-200">
                        {feedback.avatar && (
                          <img 
                            src={feedback.avatar} 
                            alt={feedback.sender}
                            className="gba:w-full gba:h-full gba:object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div className="gba:grow">
                      <div className="gba:flex gba:justify-between gba:items-start">
                        <h4 className="gba:font-medium">{feedback.sender}</h4>
                        <span className="gba:text-sm gba:text-gray-500">{feedback.date}</span>
                      </div>
                      <p className="gba:mt-1 gba:text-gray-700">{feedback.content}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Set New Goal Modal */}
      <Modal
        title="Set New Goal"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button 
            key="cancel" 
            onClick={handleCancel}
            data-testid="cancel-goal-button"
            variant="secondary"
          >
            Cancel
          </Button>,
          <Button
            key="create"
            onClick={handleSubmit}
            loading={submitting}
            data-testid="create-goal-button"
            variant="primary"
          >
            Create
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          name="goalForm"
          className="gba:goal-form"
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter a title for the goal' }]}
          >
            <Input placeholder="Enter Title" data-testid="goal-title-input" />
          </Form.Item>
          
          <Form.Item
            name="startDate"
            label="Start Date"
            rules={[{ required: true, message: 'Please select a start date' }]}
          >
            <DatePicker 
              style={{ width: '100%' }}
              placeholder="Select Date"
              data-testid="goal-start-date-input"
            />
          </Form.Item>
          
          <Form.Item
            name="dueDate"
            label="Due Date"
            rules={[{ required: true, message: 'Please select a due date' }]}
          >
            <DatePicker 
              style={{ width: '100%' }}
              placeholder="Select Date"
              data-testid="goal-due-date-input"
            />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="Status"
          >
            <Select 
              placeholder="Select Status"
              data-testid="goal-status-select"
              options={[
                { value: 'ON_TRACK', label: 'On Track' },
                { value: 'AT_RISK', label: 'At Risk' },
                { value: 'OFF_TRACK', label: 'Off Track' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'NOT_ACHIEVED', label: 'Not Achieved' }
              ]}
            />
          </Form.Item>
          
          <Form.Item
            name="progressPercent"
            label="Progress"
            initialValue={0}
          >
            <InputNumber
              min={0}
              max={100}
              // @ts-ignore - Bypassing type checking for formatter/parser functions
              formatter={value => `${value}%`}
              // @ts-ignore - Bypassing type checking for formatter/parser functions
              parser={value => {
                if (typeof value !== 'string') return 0;
                const parsed = parseInt(value.replace('%', ''), 10);
                return isNaN(parsed) ? 0 : parsed;
              }}
              style={{ width: '100%' }}
              data-testid="goal-progress-input"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PerformanceTab;
