export interface LocationData {
    id: string;
    name: string;
    isAbroad: boolean;
    location: string;
    departureDate: Date | undefined;
    departureTime: Date | undefined;
    isCollapsed: boolean;
    travelRegionRef?: string;
  }

  export interface MaxDateTimeLimits {
    maxDate?: Date | undefined;
    maxTime?: Date | undefined;
  }
  
  export interface MinDateTimeLimits {
    minDate?: Date | undefined;
    minTime?: Date | undefined;
  }
  
  export type DateTimeLimits = MinDateTimeLimits & MaxDateTimeLimits;

  export interface DestinationLimit {
    [key: string]: DateTimeLimits;
  }

  /**
   * Trip data interface
   */
  export interface TripData {
    address: string;
    tripDateTime: string;
    pointType: string;
    tripDirection: string;
    costCenter: string;
    expensePlan: string;
    tripOrder: number;
    travelRegionRef: string;
    countryRef: string;
    expenseRequest: string;
    project: string;
    allowanceRegionRuleDetail: string;
    [key: string]: any;
  }
  
  /**
   * Log object interface
   */
  export interface LogObject {
    stepKey: string;
    event: string;
    expenseRequest: {
      id: any;
      startDate: any;
      endDate: any;
      expenseRule: string;
      version: any;
      costCenter: any;
      employee: any;
      expensePlan: any;
      title: any;
      deductibleAmount: any;
      nonDeductibleAmount: any;
      reimbursableAmount: any;
      nonReimbursableAmount: any;
      totalAmountAllowance: any;
      totalAmountExpense: any;
      totalAmountMileage: any;
      totalRemainingAmount: any;
      status: any;
      requestDate: string;
      requestTypeRef: any;
      additionalProperties: any;
      currencyRef: any;
    };
    expenseRequestTrips?: {
      expenseTrips: TripData[] | any[];
    };
  }