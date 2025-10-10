// Example additional data structure for testing ApproveExpensePlan component
// Use this structure when calling the component with the planId: 18cfedab-87c4-41b1-9654-7670dd445bf7

export const exampleAdditionalData = {
  // Option 1: Direct planId (preferred)
  planId: '18cfedab-87c4-41b1-9654-7670dd445bf7',

  // Option 2: Psi task payload structure (alternative)
  psi_taskPayload: {
    expensePlan: {
      id: '18cfedab-87c4-41b1-9654-7670dd445bf7',
      version: 4,
      additionalProperties: {
        transportationMeans: []
      },
      code: '2025000692',
      title: 'TR-233',
      description: '',
      requestTypeRef: 'ExpenseRequestType:v1:TRIP',
      planDate: '2025-01-23T16:20:06.000+00:00',
      totalAmount: 0,
      totalAmountExpense: 0,
      totalAmountAllowance: 0,
      totalAmountMileage: 0,
      totalRemainingAmount: 0,
      currencyRef: 'Currency:v1:RON',
      advancePaymentTotalAmount: 0,
      advancePaymentPaidAmount: 0,
      advancePaymentInTransitAmount: 0,
      status: 'PENDING',
      employeeIdentificationNo: null,
      startDate: '2025-01-13T03:00:00',
      endDate: '2025-01-13T05:00:00',
      decisionDate: null,
      approvalDate: null,
      reimbursableAmount: 0,
      nonReimbursableAmount: 0,
      deductibleAmount: 0,
      nonDeductibleAmount: 0,
      totalDomesticTime: null,
      totalInternationalTime: null,
      totalTime: null,
      totalDomesticDays: null,
      totalInternationalDays: null,
      totalDays: null,
      totalDomesticTimeInterval: null,
      totalInternationalTimeInterval: null,
      totalTimeInterval: null,
      totalDomesticDaysInterval: null,
      totalInternationalDaysInterval: null,
      totalDaysInterval: null,
      costCenter: '4738d2e8-8516-438a-af19-af4ec2d773e3',
      project: 'd284ced6-334f-4cea-8837-df9807d85c4d',
      employee: 'b17e8b90-f6ab-4bf7-81c3-36aab00e5808',
      employeeAbsence: null,
      employeeDocument: null
    },
    initialParameters: {}
  },

  // Option 3: Navigation payload (if needed)
  nvi_navigationPayload: {},

  // Additional context data (optional)
  context: {
    taskId: 'approve-expense-plan-task-123',
    processInstanceId: 'expense-approval-process-456',
    businessKey: 'EXPENSE-2025-001'
  }
}

// Usage example:
/*
import { exampleAdditionalData } from './example-additional-data';

// When rendering the component:
<ApproveExpensePlan 
  accessToken={accessToken}
  userInfo={userInfo}
  additionalData={exampleAdditionalData}
/>
*/

// Alternative: URL parameter approach
// Navigate to: /approve-expense-plan?planId=18cfedab-87c4-41b1-9654-7670dd445bf7
