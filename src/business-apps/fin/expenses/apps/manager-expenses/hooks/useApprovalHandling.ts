import { useState } from 'react';
import { ApprovalRequest } from '../types';
import { createApprovalPayload } from '../utils/approvalPayloadCreator';
import { getTabByKey } from '../constants/approvalTabs';
import { env } from '@/common/env/EnvUtils';
import { toast } from 'sonner';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface UseApprovalHandlingProps {
  selectedTasks: ApprovalRequest[];
  setSelectedTasks: (tasks: ApprovalRequest[]) => void;
  rawTasks: any[];
  tabKey: string;
  userInfo: any;
  accessToken: string;
  onApprovalSuccess?: () => void; // Callback after successful approval
}

export const useApprovalHandling = ({
  selectedTasks,
  setSelectedTasks,
  rawTasks,
  tabKey,
  userInfo,
  accessToken,
  onApprovalSuccess,
}: UseApprovalHandlingProps) => {
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [currentProgressIndex, setCurrentProgressIndex] = useState<number>(0);
  const [totalToApprove, setTotalToApprove] = useState<number>(0);

  // Small delay between sequential requests to avoid backend concurrency conflicts
  const sequentialDelayMs = 150;
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleApproveClick = async () => {
    if (selectedTasks.length === 0) {
      return { error: getTranslationFromI18nKeyAndLabel('lowcoder:manager_expenses_landing_page.select_task_to_approve', 'Please select at least one task to approve') };
    }

    const tabConfig = getTabByKey(tabKey);
    if (!tabConfig || !userInfo) {
      return { error: getTranslationFromI18nKeyAndLabel('lowcoder:common.configuration_missing', 'Missing configuration or user information') };
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

      setTotalToApprove(selectedTasks.length);
      setCurrentProgressIndex(0);

      let approvedCount = 0;
      const failedTasks: Array<{ id: string; error: string }> = [];

      for (const task of selectedTasks) {
        try {
          const originalTask = rawTasks.find((t) => t.id === task.id);
          if (!originalTask) {
            throw new Error(getTranslationFromI18nKeyAndLabel('lowcoder:approvals.could_not_find_task_data', `Could not find original task data for ${task.id}`));
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
            throw new Error(getTranslationFromI18nKeyAndLabel('lowcoder:common.user_id_not_available', 'User ID not available'));
          }

          if (!processInstanceId) {
            throw new Error(getTranslationFromI18nKeyAndLabel('lowcoder:approvals.process_instance_missing', 'Process instance ID not available'));
          }

          const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? '';

          // 🎯 OPTIMIZATION: Try to use entity data from task list first (all tabs)
          let actualEntityId: string | null = null;
          const selectedTask = selectedTasks.find(t => t.id === taskInstanceId);
          
          if (selectedTask?.entityId) {
            actualEntityId = selectedTask.entityId;
            console.log(`✅ [OPTIMIZATION - ${tabConfig.key}] Using entity ID from task list (no GET call):`, actualEntityId);
          }

          // If we don't have the entity ID from optimization, make the GET call
          if (!actualEntityId) {
            console.log(`⚠️ [${tabConfig.key}] Making GET call to fetch entity ID...`);
            
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
            throw new Error(getTranslationFromI18nKeyAndLabel('lowcoder:network.get_failed', `GET request failed: ${getResponse.status} ${getResponse.statusText}`));
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
            throw new Error(getTranslationFromI18nKeyAndLabel('lowcoder:approvals.entity_id_missing', `Could not find entity ID in task data for ${tabConfig.key}`));
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
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:network.post_failed',
                `POST request failed: ${postResponse.status} - ${postResponse.statusText} - ${responseText}`,
              ),
            );
          }

          await postResponse.json();
          // Gentle pacing between sequential approvals
          await delay(sequentialDelayMs);
          approvedCount += 1;
        } catch (taskError) {
          const message = taskError instanceof Error ? taskError.message : 'Unknown error';
          failedTasks.push({ id: task.id, error: message });
        }
        setCurrentProgressIndex((prev) => prev + 1);
      }

      // Clear selection
      setSelectedTasks([]);
      setApprovalError(null);

      // Summarize result
      if (approvedCount > 0 && failedTasks.length === 0) {
        toast.success(
          getTranslationFromI18nKeyAndLabel('lowcoder:approvals.approval_completed', 'Approval completed'),
          {
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:approvals.approved_successfully_count',
            `${approvedCount} task${approvedCount > 1 ? 's' : ''} approved successfully`,
          ),
          duration: 4000,
        });
      } else if (approvedCount > 0 && failedTasks.length > 0) {
        toast.success(
          getTranslationFromI18nKeyAndLabel('lowcoder:approvals.partial_approval_completed', 'Partial approval completed'),
          {
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:approvals.partial_approval_summary',
            `${approvedCount} approved · ${failedTasks.length} failed`,
          ),
          duration: 5000,
        });
      } else if (approvedCount === 0 && failedTasks.length > 0) {
        const first = failedTasks[0];
        const more = failedTasks.length - 1;
        const details = more > 0 ? `${first.error} (+${more} more)` : first.error;
        setApprovalError(details);
        toast.error(
          getTranslationFromI18nKeyAndLabel('lowcoder:approvals.all_failed', 'All approvals failed'),
          {
          description: getTranslationFromI18nKeyAndLabel('lowcoder:approvals.error_details', details),
          duration: 6000,
        });
      }

      // Refresh the list if at least one succeeded
      if (approvedCount > 0 && onApprovalSuccess) {
        onApprovalSuccess();
      }

      return { success: true, approvedCount, failedCount: failedTasks.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : getTranslationFromI18nKeyAndLabel('lowcoder:approvals.failed_to_approve', 'Failed to approve tasks');
      setApprovalError(errorMessage);

      // Show error toast notification
      toast.error(
        getTranslationFromI18nKeyAndLabel('lowcoder:approvals.approval_failed', 'Approval failed'),
        {
        description: getTranslationFromI18nKeyAndLabel('lowcoder:approvals.error_details', errorMessage),
        duration: 5000,
      });

      return { error: errorMessage };
    } finally {
      setIsApproving(false);
      setCurrentProgressIndex(0);
      setTotalToApprove(0);
    }
  };

  return {
    isApproving,
    approvalError,
    setApprovalError,
    handleApproveClick,
    progress: { current: currentProgressIndex, total: totalToApprove },
  };
};
