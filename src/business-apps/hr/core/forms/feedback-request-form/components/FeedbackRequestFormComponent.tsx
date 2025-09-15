import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Alert,
  Spinner
} from '@newwork/nw-design-system';
import { UserOutlined } from '@ant-design/icons';
import { useFeedbackRequestForm } from '../context/FeedbackRequestFormContext';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import EmployeeSearchableSelect from '../../../../../crm/common/forms/lead-form/components/EmployeeSearchableSelect';

const prefixDataTestId = 'FeedbackRequestFormComponent';

const FeedbackRequestFormComponent: React.FC = () => {
  const {
    formValues,
    setFormValues,
    isLoading,
    error,
    clearError,
    onSubmit,
    onCancel,
    employees,
    employeesLoading,
    employeesError,
    searchEmployees,
    hasPreSelectedEmployee,
    isPreSelectedEmployeeCurrentUser
  } = useFeedbackRequestForm();

  // Load initial employees if needed
  useEffect(() => {
    if (!hasPreSelectedEmployee && !isPreSelectedEmployeeCurrentUser) {
      searchEmployees('');
    }
  }, [hasPreSelectedEmployee, isPreSelectedEmployeeCurrentUser, searchEmployees]);

  const handleEmployeeSearch = (value: string) => {
    searchEmployees(value);
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const selectedEmployee = employees.find(emp => emp.id === employeeId);
    if (selectedEmployee) {
      setFormValues({
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name
      });
    }
  };

  const handleMessageChange = (value: string) => {
    setFormValues({ requestMessage: value });
  };

  const handleSubmit = async () => {
    clearError();
    await onSubmit();
  };

  const handleCancel = async () => {
    await onCancel();
  };

  return (
    <div 
      className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full"
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
    >
      <div className="gba:bg-white gba:max-w-md gba:w-full gba:max-h-[90vh] gba:overflow-hidden">
        {/* Modal Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-2">
            <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900">
              {getTranslationFromI18nKeyAndLabel('feedback.request.title', 'Request Feedback')}
            </h2>
          </div>
        </div>

        {/* Modal Content */}
        <div className="gba:p-4 gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(90vh-140px)]">
          {/* Error Display */}
          {error && (
            <Alert 
              variant="destructive"
              data-testid={formatDataTestId(prefixDataTestId, 'Error')}
            >
              {error}
            </Alert>
          )}

          {/* Employee Selection */}
          <div className="gba:space-y-2">
            {!hasPreSelectedEmployee && !isPreSelectedEmployeeCurrentUser ? (
              <EmployeeSearchableSelect
                label={getTranslationFromI18nKeyAndLabel('feedback.request.requestFrom', 'Request feedback from...')}
                name="employee-select"
                value={formValues.employeeId}
                placeholder={getTranslationFromI18nKeyAndLabel('feedback.request.selectPlaceholder', 'Select employee')}
                options={employees.map(emp => ({
                  id: emp.id,
                  value: emp.id,
                  name: emp.name,
                  label: emp.name,
                  jobTitle: emp.jobTitle,
                  department: emp.department,
                  pictureThumbnail: emp.pictureThumbnail,
                  userId: emp.userId,
                  extraInfo: {
                    jobPosition: emp.jobTitle,
                    organizationalUnit: emp.department,
                    pictureThumbnail: emp.pictureThumbnail,
                    userId: emp.userId
                  }
                }))}
                loading={employeesLoading}
                onSearch={handleEmployeeSearch}
                onChange={handleEmployeeSelect}
                data-testid={formatDataTestId(prefixDataTestId, 'EmployeeSelect')}
                error={employeesError}
                required={true}
                className="gba:w-full"
              />
            ) : (
              <div className="gba:p-3 gba:bg-gray-50 gba:rounded-lg gba:border">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <UserOutlined />
                  <span className="gba:font-medium">{formValues.employeeName}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="gba:p-4 gba:border-t gba:border-gray-200 gba:flex gba:gap-2 gba:justify-end">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isLoading}
            data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
            className="gba:px-6 gba:py-2 gba:rounded-lg"
          >
            {getTranslationFromI18nKeyAndLabel('feedback.request.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formValues.employeeId}
            data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
            className="gba:bg-black hover:gba:bg-gray-800 gba:text-white gba:px-6 gba:py-2 gba:rounded-lg"
          >
            {isLoading ? (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Spinner size="sm" />
                {getTranslationFromI18nKeyAndLabel('feedback.request.sending', 'Sending...')}
              </div>
            ) : (
              getTranslationFromI18nKeyAndLabel('feedback.request.send', 'Send Request')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackRequestFormComponent;
