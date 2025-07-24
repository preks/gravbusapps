import React, { useEffect } from 'react';
import { message } from 'antd';
import { Button, Spinner } from '@newwork/nw-design-system';
import { useSalesTaskFormContext } from '../context/SalesTaskFormContext';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import TaskInformationSection from './TaskInformationSection';
import CoreDetailsSection from './CoreDetailsSection';
import EntitySelectionSection from './EntitySelectionSection';
import DeadlineSection from './DeadlineSection';
import DescriptionSection from './DescriptionSection';
import FileUploadSection from './FileUploadSection';
import dayjs from 'dayjs';

const prefixDataTestId = 'SalesTaskForm';

const SalesTaskFormComponent: React.FC = () => {
  const {
    formValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
    isUpdateMode,
    fileList,
    businessAppContext,
  } = useSalesTaskFormContext();

  const { accessToken, additionalData } = businessAppContext;

  // Check if all mandatory fields are filled
  const isFormValid = 
    formValues.title &&
    formValues.taskTypeRef &&
    formValues.priorityRef &&
    formValues.deadline;

  // Listen for process completion events to handle file upload and success message
  useEffect(() => {
    const handler = async (event: any) => {
      try {
        const response = event.detail?.response;
        const salesTask = response?.salesTask;
        if (!salesTask) return;
        
        // Handle file upload if there's a file
        const uploadFile = fileList && fileList[0];
        if (uploadFile && uploadFile.originFileObj) {
          const { useFileClient } = await import('@/common/network/files/useFileClient');
          const { useRestClient } = await import('@/common/network/rest/useRestClient');
          const { env } = await import('@/common/env/EnvUtils');
          
          const fileClient = useFileClient({ accessToken } as any);
          const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
          
          const file = uploadFile.originFileObj;
          const pathParams = { accessScope: 'public' };
          const queryParams = {
            appName: 'crm',
            folderPath: `/sales-tasks/${salesTask.id}/documents`,
          };
          
          const uploadResponse = await fileClient.uploadFile(
            file,
            pathParams,
            queryParams
          );
          
          const crmDocumentPayload = {
            crmDocument: {
              name: file.name,
              description: `File for ${salesTask.name}`,
              file: uploadResponse.fileInfo.fileId,
              fileSize: file.size,
              mimeType: file.type,
              verified: true,
              verificationDate: Date.now(),
              salesTask: salesTask.id,
              version: 0,
            },
            changeMode: 'INSERT',
          };
          
          await restClient.post('/customer-relations/saveCrmDocument', crmDocumentPayload, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
        
        message.success(isUpdateMode ? 'Task updated successfully' : 'Task created successfully');
      } catch (err: any) {
        console.error('Error in process completion:', err);
        message.error(err?.message || 'Failed to create task');
      }
    };
    
    window.addEventListener('com.newwork.process.taskCompletion', handler as EventListener);
    
    return () => {
      window.removeEventListener('com.newwork.process.taskCompletion', handler as EventListener);
    };
  }, [accessToken, fileList, isUpdateMode]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      await onSubmit(formValues);
      
      // Build payload for process continuation
      const payload = {
        employeeId: additionalData?.employeeId,
        managerId: additionalData?.managerId,
        structureId: additionalData?.structureId,
        locationId: additionalData?.locationId,
        organizationalUnitId: additionalData?.organizationalUnitId,
        ...(additionalData?.contactId && { contactId: additionalData.contactId }),
        changeMode: isUpdateMode ? 'UPDATE' : 'INSERT',
        salesTask: {
          ...(isUpdateMode && { id: formValues.id }),
          version: isUpdateMode ? formValues.version || 0 : 0,
          typeRef: formValues.taskTypeRef,
          name: formValues.title,
          priorityRef: formValues.priorityRef,
          deadline: formValues.deadline ? dayjs(formValues.deadline).toISOString() : null,
          description: formValues.description,
          ...(formValues.assignedEmployeeId && { assignedEmployee: formValues.assignedEmployeeId }),
          // Entity from additionalData (when opened from record pages)
          ...(additionalData?.leadId && { lead: additionalData.leadId }),
          ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
          ...(additionalData?.contactId && { contact: additionalData.contactId }),
          ...(additionalData?.accountId && { account: additionalData.accountId }),
          // Entity from manual selection (when opened standalone)
          ...(formValues.relatedEntityType === 'lead' && { lead: formValues.relatedEntityId }),
          ...(formValues.relatedEntityType === 'contact' && { contact: formValues.relatedEntityId }),
          ...(formValues.relatedEntityType === 'account' && { account: formValues.relatedEntityId }),
          ...(formValues.relatedEntityType === 'opportunity' && { opportunity: formValues.relatedEntityId }),
        },
      };
      
      // Log the payload for debugging
      console.log(`${isUpdateMode ? 'Updating' : 'Creating'} sales task with payload:`, payload);
      
      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent('pse_submit', payload);
    } catch (err) {
      console.error('Error submitting sales task form:', err);
      message.error(isUpdateMode ? 'Failed to update task' : 'Failed to submit task');
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel();
      
      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent('pse_pause', {});
    } catch (err) {
      console.error('Error cancelling sales task form:', err);
    }
  };

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={formatDataTestId(prefixDataTestId, 'Form')}>

        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-4">
          
          {/* Task Information Section */}
          <TaskInformationSection />

          {/* Core Details Section */}
          <CoreDetailsSection />

          {/* Entity Selection Section */}
          <EntitySelectionSection />

          {/* Deadline Section */}
          <DeadlineSection />

          {/* Description Section */}
          <DescriptionSection />

          {/* File Upload Section */}
          <FileUploadSection />

          {/* Error Display */}
          {error && (
            <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4">
              <div className="gba:text-red-800 gba:text-sm">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Submit and Cancel Buttons - Fixed at bottom */}
        <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200 gba:flex gba:gap-3">
          <Button
            variant="outline"
            className="gba:flex-1"
            onClick={handleCancel}
            disabled={isLoading}
            data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
          >
            {getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="default"
            disabled={!isFormValid || isLoading}
            className="gba:flex-1"
            onClick={handleSubmit}
            data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
          >
            {isLoading && <Spinner className="gba:mr-2" />}
            {getTranslationFromI18nKeyAndLabel(
              isUpdateMode ? 'crm:common.update' : 'crm:common.submit', 
              isUpdateMode ? 'Update' : 'Submit'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SalesTaskFormComponent; 