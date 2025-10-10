// Example additional data configurations for testing ApproveExpenseRequest

// 1. Basic example with just expense ID
export const basicExample = {
  expenseId: 'mock-expense-request-id'
}

// 2. Example with process task payload (simulating Kogito process)
export const processTaskExample = {
  psi_taskPayload: {
    expenseRequest: {
      id: '8f760576-8587-4822-ae03-a2ffc45f9b80'
    }
  }
}

// 3. Example with user context
export const userContextExample = {
  expenseId: 'mock-expense-request-id',
  userContext: {
    employeeId: 'emp-123',
    role: 'APPROVER'
  }
}

// 4. Example for testing approval workflow
export const approvalWorkflowExample = {
  expenseId: 'mock-expense-request-id',
  workflow: {
    taskId: 'approve-expense-request-task-123',
    processInstanceId: 'process-456',
    taskName: 'Approve Expense Request'
  }
}

// 5. Example with URL parameters (for testing URL-based loading)
// Navigate to: /approve-expense-request?expenseId=mock-expense-request-id
export const urlParameterExample = {
  // This will be extracted from URL: ?expenseId=mock-expense-request-id
  expenseId: 'mock-expense-request-id'
}

// Usage instructions:
// 1. For local development without access token: Use any of the above examples
// 2. For testing with real data: Provide valid expenseId and accessToken
// 3. For process integration: Use processTaskExample format
// 4. For URL-based testing: Use urlParameterExample and add ?expenseId=... to URL
