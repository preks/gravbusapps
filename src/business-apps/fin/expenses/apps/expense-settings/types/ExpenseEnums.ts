// Enum definitions for expense settings with human-readable mappings

export enum MileageRulePeriod {
  YEARLY = 'YEARLY',
  TRIP = 'TRIP',
  TOTAL = 'TOTAL'
}

export enum TravelLocation {
  HOME = 'HOME',
  ABROAD = 'ABROAD',
  BOTH = 'BOTH'
}

export enum AllowanceType {
  EXPENSE = 'EXPENSE',
  DAILY_ALLOWANCE = 'DAILY_ALLOWANCE',
  BREAKFAST_DEDUCTION = 'BREAKFAST_DEDUCTION',
  LUNCH_DEDUCTION = 'LUNCH_DEDUCTION',
  DINNER_DEDUCTION = 'DINNER_DEDUCTION',
  OVERNIGHT_DEDUCTION = 'OVERNIGHT_DEDUCTION',
  DEDUCTION_LIMIT = 'DEDUCTION_LIMIT'
}

export enum RuleSource {
  MILEAGE_RULE = 'MILEAGE_RULE',
  GENERAL_EXPENSE_RULE = 'GENERAL_EXPENSE_RULE',
  ALLOWANCE_RULE = 'ALLOWANCE_RULE',
  ATTENTION_RULE = 'ATTENTION_RULE'
}

export enum DeductionDay {
  FIRST_DAY = 'FIRST_DAY',
  DAYS_BETWEEN = 'DAYS_BETWEEN',
  LAST_DAY = 'LAST_DAY'
}

// Human-readable labels for each enum
export const MileageRulePeriodLabels: Record<MileageRulePeriod, string> = {
  [MileageRulePeriod.YEARLY]: 'Yearly',
  [MileageRulePeriod.TRIP]: 'Per Trip',
  [MileageRulePeriod.TOTAL]: 'Total'
};

export const TravelLocationLabels: Record<TravelLocation, string> = {
  [TravelLocation.HOME]: 'Home',
  [TravelLocation.ABROAD]: 'Abroad',
  [TravelLocation.BOTH]: 'Home & Abroad'
};

export const AllowanceTypeLabels: Record<AllowanceType, string> = {
  [AllowanceType.EXPENSE]: 'General Expense',
  [AllowanceType.DAILY_ALLOWANCE]: 'Daily Allowance',
  [AllowanceType.BREAKFAST_DEDUCTION]: 'Breakfast Deduction',
  [AllowanceType.LUNCH_DEDUCTION]: 'Lunch Deduction',
  [AllowanceType.DINNER_DEDUCTION]: 'Dinner Deduction',
  [AllowanceType.OVERNIGHT_DEDUCTION]: 'Overnight Deduction',
  [AllowanceType.DEDUCTION_LIMIT]: 'Deduction Limit'
};

export const RuleSourceLabels: Record<RuleSource, string> = {
  [RuleSource.MILEAGE_RULE]: 'Mileage Rule',
  [RuleSource.GENERAL_EXPENSE_RULE]: 'General Expense Rule',
  [RuleSource.ALLOWANCE_RULE]: 'Allowance Rule',
  [RuleSource.ATTENTION_RULE]: 'Attention Rule'
};

export const DeductionDayLabels: Record<DeductionDay, string> = {
  [DeductionDay.FIRST_DAY]: 'First Day',
  [DeductionDay.DAYS_BETWEEN]: 'Days Between',
  [DeductionDay.LAST_DAY]: 'Last Day'
};

// Utility functions to get options for form dropdowns
export const getMileageRulePeriodOptions = () => 
  Object.values(MileageRulePeriod).map(value => ({
    value,
    label: MileageRulePeriodLabels[value]
  }));

export const getTravelLocationOptions = () => 
  Object.values(TravelLocation).map(value => ({
    value,
    label: TravelLocationLabels[value]
  }));

export const getAllowanceTypeOptions = () => 
  Object.values(AllowanceType).map(value => ({
    value,
    label: AllowanceTypeLabels[value]
  }));

export const getRuleSourceOptions = () => 
  Object.values(RuleSource).map(value => ({
    value,
    label: RuleSourceLabels[value]
  }));

export const getDeductionDayOptions = () => 
  Object.values(DeductionDay).map(value => ({
    value,
    label: DeductionDayLabels[value]
  }));

// Helper functions to get human-readable labels
export const getMileageRulePeriodLabel = (value: string): string => 
  MileageRulePeriodLabels[value as MileageRulePeriod] || value;

export const getTravelLocationLabel = (value: string | boolean): string => {
  if (typeof value === 'boolean') {
    return value ? TravelLocationLabels[TravelLocation.ABROAD] : TravelLocationLabels[TravelLocation.HOME];
  }
  return TravelLocationLabels[value as TravelLocation] || value;
};

export const getAllowanceTypeLabel = (value: string): string => 
  AllowanceTypeLabels[value as AllowanceType] || value;

export const getRuleSourceLabel = (value: string): string => 
  RuleSourceLabels[value as RuleSource] || value;

export const getDeductionDayLabel = (value: string): string => 
  DeductionDayLabels[value as DeductionDay] || value;

// Convert boolean abroad field to TravelLocation enum
export const convertAbroadToTravelLocation = (abroad: boolean | null | undefined): TravelLocation => {
  if (abroad === true) return TravelLocation.ABROAD;
  if (abroad === false) return TravelLocation.HOME;
  return TravelLocation.BOTH; // null/undefined means both
};

// Convert TravelLocation enum to boolean abroad field
export const convertTravelLocationToAbroad = (location: TravelLocation): boolean | null => {
  switch (location) {
    case TravelLocation.ABROAD:
      return true;
    case TravelLocation.HOME:
      return false;
    case TravelLocation.BOTH:
      return null; // null means both home and abroad
  }
}; 