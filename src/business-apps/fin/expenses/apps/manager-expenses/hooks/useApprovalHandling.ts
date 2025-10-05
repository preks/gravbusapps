import { useState } from 'react';
import { ApprovalRequest } from '../types';
import { createApprovalPayload } from '../utils/approvalPayloadCreator';
import { getTabByKey } from '../constants/approvalTabs';
import { env } from '@/common/env/EnvUtils';
import { toast } from 'sonner';

interface UseApprovalHandlingProps {
  selectedTasks: ApprovalRequest[];
  setSelectedTasks: (tasks: ApprovalRequest[]) => void;
  rawTasks: any[];
  tabKey: string;
  userInfo: any;
  accessToken: string;
}

export const useApprovalHandling = ({
  selectedTasks,
  setSelectedTasks,
  rawTasks,
  tabKey,
  userInfo,
  accessToken,
}: UseApprovalHandlingProps) => {
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const handleApproveClick = async () => {
    if (selectedTasks.length === 0) {
      return { error: 'Please select at least one task to approve' };
    }

    const tabConfig = getTabByKey(tabKey);
    if (!tabConfig || !userInfo) {
      return { error: 'Missing configuration or user information' };
    }

    setIsApproving(true);
    setApprovalError(null);

    try {
      // Create approval payload based on tab type
      const approvalPayload = createApprovalPayload(
        selectedTasks,
        tabConfig,
        '', // No message since we removed the dialog
        userInfo,
        rawTasks,
      );

      for (const task of selectedTasks) {
        try {
          const originalTask = rawTasks.find((t) => t.id === task.id);
          if (!originalTask) {
            throw new Error(`Could not find original task data for ${task.id}`);
          }

          // Use different domain for transfer payment and handout payment
          const domain =
            tabConfig.key === 'transfer-payment' || tabConfig.key === 'handout-payment'
              ? 'cs-selgros'
              : 'employee-expense';
          const processName = tabConfig.processName;

          const taskInstanceId = task.id;

          const taskName = originalTask.name || 'approveTask';

          const userId = userInfo?.id;

          let processInstanceId = originalTask.processInstanceId;

          if (!processInstanceId && originalTask.endpoint) {
            const endpointParts = originalTask.endpoint.split('/');

            if (tabConfig.key === 'handout-payment') {
              // For handout payment, look for 'payAdvancePayment' in the endpoint
              const processNameIndex = endpointParts.findIndex(
                (part: string) => part === 'payAdvancePayment',
              );
              if (processNameIndex !== -1 && endpointParts[processNameIndex + 1]) {
                processInstanceId = endpointParts[processNameIndex + 1];
              }
            } else {
              // For other tabs, use the dynamic process name
              const processNameIndex = endpointParts.findIndex(
                (part: string) => part === processName,
              );
              if (processNameIndex !== -1 && endpointParts[processNameIndex + 1]) {
                processInstanceId = endpointParts[processNameIndex + 1];
              }
            }
          }

          if (!processInstanceId) {
            processInstanceId = task.id;
          }

          if (!userId) {
            throw new Error('User ID not available');
          }

          if (!processInstanceId) {
            throw new Error('Process instance ID not available');
          }

          const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? '';

          // 🎯 OPTIMIZATION: For transfer-payment, try to use entity data from task list first
          let actualEntityId: string | null = null;
          
          if (tabConfig.key === 'transfer-payment') {
            // Check if we have entity data from the task list (optimization)
            const selectedTask = selectedTasks.find(t => t.id === taskInstanceId);
            if (selectedTask?.entityId) {
              actualEntityId = selectedTask.entityId;
              console.log('✅ [OPTIMIZATION] Using entity ID from task list (no GET call):', actualEntityId);
            }
          }

          // If we don't have the entity ID from optimization, make the GET call
          if (!actualEntityId) {
            console.log('⚠️ Making GET call to fetch entity ID...');
            
            let getUrl: string;
            if (tabConfig.key === 'handout-payment') {
              // For handout payment, hardcode payAdvancePayment in the URL
              getUrl = `${baseUrl}/processes/${domain}/payAdvancePayment/${processInstanceId}/${taskName}/${taskInstanceId}?user=${userId}`;
            } else {
              // For other tabs, use the dynamic process name
              getUrl = `${baseUrl}/processes/${domain}/${processName}/${processInstanceId}/${taskName}/${taskInstanceId}?user=${userId}`;
            }

            const getResponse = await fetch(getUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (!getResponse.ok) {
              throw new Error(`GET request failed: ${getResponse.status} ${getResponse.statusText}`);
            }

            const taskData = await getResponse.json();

            // Extract the actual entity ID from the response
            if (taskData.parameters) {
              switch (tabConfig.key) {
                case 'advance-payment':
                  actualEntityId = taskData.parameters.advancePayment?.id;
                  break;
                case 'expense-request':
                  // Try different possible parameter names for expense request
                  actualEntityId =
                    taskData.parameters.expenseRequest?.id ||
                    taskData.parameters.request?.id ||
                    taskData.parameters.expenseRequestId;
                  break;
                case 'expense-plan':
                  // Try different possible parameter names for expense plan
                  actualEntityId =
                    taskData.parameters.expensePlan?.id ||
                    taskData.parameters.plan?.id ||
                    taskData.parameters.expensePlanId;
                  break;
                case 'handout-payment':
                  // For handout payment, use the advance payment ID from the response
                  actualEntityId = taskData.parameters.advancePayment?.id;
                  break;
                case 'transfer-payment':
                  // For transfer advance payment, use the advance payment ID from the response
                  actualEntityId = taskData.parameters.advancePayment?.id;
                  break;
              }
            }
          }

          if (!actualEntityId) {
            throw new Error(`Could not find entity ID in task data for ${tabConfig.key}`);
          }

          // Update the approval payload with the actual entity ID
          const updatedPayload = { ...approvalPayload };
          if (tabConfig.key === 'advance-payment' && updatedPayload.advancePaymentComment) {
            updatedPayload.advancePaymentComment.advancePayment = actualEntityId;
          } else if (tabConfig.key === 'expense-request' && updatedPayload.expenseRequestComment) {
            updatedPayload.expenseRequestComment.expenseRequest = actualEntityId;
          } else if (tabConfig.key === 'expense-plan' && updatedPayload.expensePlanComment) {
            updatedPayload.expensePlanComment.expensePlan = actualEntityId;
          } else if (tabConfig.key === 'handout-payment' && updatedPayload.advancePaymentComment) {
            // Handout payment uses the same payload structure as advance payment
            updatedPayload.advancePaymentComment.advancePayment = actualEntityId;
          } else if (tabConfig.key === 'transfer-payment' && updatedPayload.advancePaymentComment) {
            // Transfer advance payment uses the same payload structure as advance payment
            updatedPayload.advancePaymentComment.advancePayment = actualEntityId;
          }

          // Now make the POST call with the correct entity ID
          let postUrl: string;
          if (tabConfig.key === 'handout-payment') {
            // For handout payment, hardcode payAdvancePayment in the URL
            postUrl = `${baseUrl}/processes/${domain}/payAdvancePayment/${processInstanceId}/${taskName}/${taskInstanceId}?phase=complete&user=${userId}`;
          } else {
            // For other tabs, use the dynamic process name
            postUrl = `${baseUrl}/processes/${domain}/${processName}/${processInstanceId}/${taskName}/${taskInstanceId}?phase=complete&user=${userId}`;
          }

          const postResponse = await fetch(postUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(updatedPayload),
          });

          if (!postResponse.ok) {
            const responseText = await postResponse.text();
            throw new Error(
              `POST request failed: ${postResponse.status} - ${postResponse.statusText} - ${responseText}`,
            );
          }

          await postResponse.json();
        } catch (taskError) {
          throw taskError; // Re-throw to be caught by the outer try-catch
        }
      }

      // Clear selection and show success toast
      setSelectedTasks([]);
      setApprovalError(null);

      // Show success toast notification
      toast.success('FLOW is complete', {
        description: 'Task approved successfully',
        duration: 4000,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve tasks';
      setApprovalError(errorMessage);

      // Show error toast notification
      toast.error('Approval failed', {
        description: errorMessage,
        duration: 5000,
      });

      return { error: errorMessage };
    } finally {
      setIsApproving(false);
    }
  };

  return {
    isApproving,
    approvalError,
    setApprovalError,
    handleApproveClick,
  };
};
