export interface AdvancePaymentItem {
  id: string;
  code?: string;
  description?: string;
  status: string;
  title?: string; 
  employeeDisplayName?: string; 
  employeeFullName?: string; 
  employeePictureThumbnail?: string; 
  startDate?: string; 
  endDate?: string; 
  amount?: number;
}

export interface AdvancePaymentStatisticsData {
  totalAmount: number | null;
}
