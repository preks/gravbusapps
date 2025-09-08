/**
 * Validation utilities for the investment form
 */

/**
 * Convert a value to string or return undefined if empty
 */
export const toStringOrUndefined = (value: any): string | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return String(value).trim() || undefined;
};

/**
 * Convert a value to number or return undefined if invalid
 */
export const toNumberOrUndefined = (value: any): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const num = Number(value);
  return isNaN(num) ? undefined : num;
};

/**
 * Validate that a string field is not empty
 */
export const isRequired = (value: any): boolean => {
  return toStringOrUndefined(value) !== undefined;
};

/**
 * Validate that a number field is positive
 */
export const isPositiveNumber = (value: any): boolean => {
  const num = toNumberOrUndefined(value);
  return num !== undefined && num > 0;
};

/**
 * Validate the entire investment form
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateInvestmentForm = (values: any): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!isRequired(values.ownerEmployeeId)) {
    errors.ownerEmployeeId = "Owner is required";
  }

  if (!isRequired(values.name)) {
    errors.name = "Name is required";
  }

  if (!isRequired(values.accountId)) {
    errors.accountId = "Account name is required";
  }

  if (!isPositiveNumber(values.initialInvestmentAmount)) {
    errors.initialInvestmentAmount = "Initial investment amount must be a positive number";
  }

  if (!isRequired(values.group)) {
    errors.group = "Group is required";
  }

  // Validate equity information if investment group is EQUITY
  const isEquityType = values.group === "InvestmentGroup:v1:EQUITY";
  if (isEquityType) {
    if (!isRequired(values.equityRole)) {
      errors.equityRole = "Role is required for equity investments";
    }

    if (!isPositiveNumber(values.currentCompanyValue)) {
      errors.currentCompanyValue = "Current company value must be a positive number";
    }

    // Optional fields validation (only check if provided)
    if (values.lastReportedTurnover && !isPositiveNumber(values.lastReportedTurnover)) {
      errors.lastReportedTurnover = "Last reported turnover must be a positive number";
    }

    if (values.lastReportedEbitda && toNumberOrUndefined(values.lastReportedEbitda) === undefined) {
      errors.lastReportedEbitda = "Last reported EBITDA must be a valid number";
    }
  }


  // Validate real estate information if investment group is REAL_ESTATE
  const isRealEstateType = values.group === "InvestmentGroup:v1:REAL_ESTATE";
  if (isRealEstateType) {
    if (!isRequired(values.realEstateTypeRef)) {
      errors.realEstateTypeRef = "Real Estate Type is required for real estate investments";
    }

    if (!isRequired(values.investmentOwnershipStructureRef)) {
      errors.investmentOwnershipStructureRef = "Ownership Structure is required for real estate investments";
    }

    if (!isPositiveNumber(values.numberOfUnits)) {
      errors.numberOfUnits = "Number of Units must be a positive number";
    }

    const buildingYear = toNumberOrUndefined(values.buildingYear);
    if (buildingYear === undefined) {
      errors.buildingYear = "Building Year is required";
    } else if (buildingYear < 1700 || buildingYear > 2100) {
      errors.buildingYear = "Building Year must be between 1700 and 2100";
    }
  }

  // Validate liquid fund information if investment group is LIQUID_FUND
  const isLiquidFundType = values.group === "InvestmentGroup:v1:LIQUID_FUND";
  if (isLiquidFundType) {
    if (!isRequired(values.accountNumber)) {
      errors.accountNumber = "Account Number is required for liquid fund investments";
    }

    if (!isPositiveNumber(values.interestRate)) {
      errors.interestRate = "Interest Rate must be a positive number";
    }

    if (!isRequired(values.interestPaymentFrequencyRef)) {
      errors.interestPaymentFrequencyRef = "Payment Frequency is required for liquid fund investments";
    }

    if (!isRequired(values.maturityDate)) {
      errors.maturityDate = "Maturity Date is required for liquid fund investments";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Format number as currency
 */
export const formatCurrency = (value: number, currency = "EUR"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Parse currency string to number
 */
export const parseCurrency = (value: string): number | undefined => {
  if (!value || typeof value !== "string") return undefined;

  // Remove currency symbols, spaces, and commas
  const cleaned = value.replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);

  return isNaN(num) ? undefined : num;
};
