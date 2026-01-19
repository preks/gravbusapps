export enum Services {
  EMPLOYEE = '/processes/employee',
  EMPLOYEE_EXPENSE = '/processes/employee-expense',
  EMPLOYEE_TIME = '/processes/employee-time',
  CUSTOMER_RELATIONS = '/processes/customer-relations'
}

export const ServiceLabels: Record<Services, string> = {
  [Services.EMPLOYEE]: 'Employee',
  [Services.EMPLOYEE_EXPENSE]: 'Employee Expense',
  [Services.EMPLOYEE_TIME]: 'Employee Time',
  [Services.CUSTOMER_RELATIONS]: 'Customer Relations'
}

export const getServicePath = (service: Services): string => {
  return service
}

export const getServiceLabel = (service: Services): string => {
  return ServiceLabels[service]
}

export const getAllServices = (): Services[] => {
  return Object.values(Services)
}
