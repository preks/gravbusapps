import { env } from "@/common/env/EnvUtils";
import { InvestmentFormValues, InvestmentApiPayload, InvestmentApiResponse } from "../types";
import { toStringOrUndefined, toNumberOrUndefined } from "./validationUtils";

export class InvestmentApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env("NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT") || "";
    if (!this.baseUrl) {
      throw new Error("NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT environment variable is not set");
    }
  }

  /**
   * Create a new investment
   */
  async createInvestment(values: InvestmentFormValues, accessToken: string): Promise<InvestmentApiResponse> {
    const payload = this.buildPayload(values, false);
    return this.makeApiCall(payload, "create", accessToken);
  }

  /**
   * Update an existing investment
   */
  async updateInvestment(values: InvestmentFormValues, accessToken: string): Promise<InvestmentApiResponse> {
    if (!values.id) {
      throw new Error("Investment ID is required for update operation");
    }

    const payload = this.buildPayload(values, true);
    return this.makeApiCall(payload, "update", accessToken);
  }

  /**
   * Delete an investment
   */
  async deleteInvestment(id: string, accessToken: string, version?: number): Promise<InvestmentApiResponse> {
    if (!id) {
      throw new Error("Investment ID is required for delete operation");
    }

    const payload = {
      investment: {
        id,
        deleted: true,
        version,
      },
    };

    return this.makeApiCall(payload, "delete", accessToken);
  }

  /**
   * Save investment (create or update based on presence of ID)
   */
  async saveInvestment(values: InvestmentFormValues, accessToken: string): Promise<InvestmentApiResponse> {
    if (values.id) {
      return this.updateInvestment(values, accessToken);
    } else {
      return this.createInvestment(values, accessToken);
    }
  }

  /**
   * Build the API payload from form values
   */
  private buildPayload(values: InvestmentFormValues, isUpdate: boolean): any {
    // Prepare the investment payload
    const investmentPayload = {
      sourceApp: "CRM",
      ownerEmployee: toStringOrUndefined(values.ownerEmployeeId),
      name: toStringOrUndefined(values.name),
      account: toStringOrUndefined(values.accountId),
      initialInvestmentAmount: toNumberOrUndefined(values.initialInvestmentAmount),
      investmentGroupRef: toStringOrUndefined(values.group),
      version: values.version || 0,
    };

    // For updates, include the ID and version
    if (isUpdate) {
      (investmentPayload as any).id = values.id;
      if (values.version !== undefined) {
        investmentPayload.version = values.version;
      }
    }

    // Build the base payload with investment data always included
    const investmentRequest: any = {
      investment: investmentPayload,
    };

    // Add equity information if this is an equity investment
    const isEquityType = values.group === "InvestmentGroup:v1:EQUITY";
    if (isEquityType) {
      investmentRequest.equityInvestment = {
        id: values.equityInvestmentId,
        investmentRoleRef: toStringOrUndefined(values.equityRole),
        currentCompanyValuation: toNumberOrUndefined(values.currentCompanyValue),
        lastReportedTurnover: toNumberOrUndefined(values.lastReportedTurnover),
        lastReportedEbitda: toNumberOrUndefined(values.lastReportedEbitda),
        version: values.equityInvestmentVersion || 0,
      };
    }

    // Add private equity information if this is a private equity investment
    const isPrivateEquityType = values.group === "InvestmentGroup:v1:PRIVATE_EQUITY";
    if (isPrivateEquityType) {
      investmentRequest.privateEquityInvestment = {
        id: values.privateEquityInvestmentId,
        investmentRoleRef: toStringOrUndefined(values.privateEquityRole),
        version: values.privateEquityInvestmentVersion || 0,
      };
    }

    // Add real estate information if this is a real estate investment
    const isRealEstateType = values.group === "InvestmentGroup:v1:REAL_ESTATE";
    if (isRealEstateType) {
      investmentRequest.realEstateInvestment = {
        id: values.realEstateInvestmentId,
        realEstateTypeRef: toStringOrUndefined(values.realEstateTypeRef),
        investmentOwnershipStructureRef: toStringOrUndefined(values.investmentOwnershipStructureRef),
        numberOfUnits: toNumberOrUndefined(values.numberOfUnits),
        buildingYear: toNumberOrUndefined(values.buildingYear),
        version: values.realEstateInvestmentVersion || 0,
      };
    }

    // Add liquid fund information if this is a liquid fund investment
    const isLiquidFundType = values.group === "InvestmentGroup:v1:LIQUID_FUND";
    if (isLiquidFundType) {
      investmentRequest.liquidFundInvestment = {
        id: values.liquidFundInvestmentId,
        accountNumber: toStringOrUndefined(values.accountNumber),
        earlyTerminationAllowed: values.earlyTerminationAllowed || false,
        interestRate: toNumberOrUndefined(values.interestRate),
        interestPaymentFrequencyRef: toStringOrUndefined(values.interestPaymentFrequencyRef),
        maturityDate: toStringOrUndefined(values.maturityDate),
        version: values.liquidFundInvestmentVersion || 0,
      };
    }

    return {
      investmentRequest,
      changeMode: isUpdate ? "UPDATE" : "INSERT",
    };
  }

  /**
   * Make the actual API call
   */
  private async makeApiCall(payload: any, operation: string, accessToken: string): Promise<InvestmentApiResponse> {
    const url = `${this.baseUrl}/customer-relations/saveInvestment`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`
        );
      }

      const result = await response.json();

      return {
        success: true,
        data: result,
        message: `Investment ${operation} successful`,
      };
    } catch (error) {
      console.error(`Error during investment ${operation}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        message: `Investment ${operation} failed`,
      };
    }
  }
}

// Export singleton instance
export const investmentApiClient = new InvestmentApiClient();

// Export convenience functions
export const createInvestment = (values: InvestmentFormValues, accessToken: string) =>
  investmentApiClient.createInvestment(values, accessToken);

export const updateInvestment = (values: InvestmentFormValues, accessToken: string) =>
  investmentApiClient.updateInvestment(values, accessToken);

export const deleteInvestment = (id: string, accessToken: string, version?: number) =>
  investmentApiClient.deleteInvestment(id, accessToken, version);

export const saveInvestment = (values: InvestmentFormValues, accessToken: string) =>
  investmentApiClient.saveInvestment(values, accessToken);
