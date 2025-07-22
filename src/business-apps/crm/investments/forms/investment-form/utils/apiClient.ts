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
  async createInvestment(values: InvestmentFormValues): Promise<InvestmentApiResponse> {
    const payload = this.buildPayload(values, false);
    return this.makeApiCall(payload, "create");
  }

  /**
   * Update an existing investment
   */
  async updateInvestment(values: InvestmentFormValues): Promise<InvestmentApiResponse> {
    if (!values.id) {
      throw new Error("Investment ID is required for update operation");
    }

    const payload = this.buildPayload(values, true);
    return this.makeApiCall(payload, "update");
  }

  /**
   * Delete an investment
   */
  async deleteInvestment(id: string, version?: number): Promise<InvestmentApiResponse> {
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

    return this.makeApiCall(payload, "delete");
  }

  /**
   * Save investment (create or update based on presence of ID)
   */
  async saveInvestment(values: InvestmentFormValues): Promise<InvestmentApiResponse> {
    if (values.id) {
      return this.updateInvestment(values);
    } else {
      return this.createInvestment(values);
    }
  }

  /**
   * Build the API payload from form values
   */
  private buildPayload(values: InvestmentFormValues, isUpdate: boolean): any {
    const investmentPayload: InvestmentApiPayload = {
      sourceApp: "CRM",
      ownerEmployeeId: toStringOrUndefined(values.ownerEmployeeId)!,
      name: toStringOrUndefined(values.name)!,
      accountId: toStringOrUndefined(values.accountId)!,
      initialInvestmentAmount: toNumberOrUndefined(values.initialInvestmentAmount)!,
      group: toStringOrUndefined(values.group)!,
    };

    // Add ID and version for updates
    if (isUpdate) {
      investmentPayload.id = values.id;
      if (values.version !== undefined) {
        investmentPayload.version = values.version;
      }
    }

    return {
      investment: investmentPayload,
    };
  }

  /**
   * Make the actual API call
   */
  private async makeApiCall(payload: any, operation: string): Promise<InvestmentApiResponse> {
    const url = `${this.baseUrl}/customer-relations/saveInvestment`;

    console.log(`${operation} investment API call:`, {
      url,
      payload,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      console.log(`Investment ${operation} successful:`, result);

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
export const createInvestment = (values: InvestmentFormValues) => investmentApiClient.createInvestment(values);

export const updateInvestment = (values: InvestmentFormValues) => investmentApiClient.updateInvestment(values);

export const deleteInvestment = (id: string, version?: number) => investmentApiClient.deleteInvestment(id, version);

export const saveInvestment = (values: InvestmentFormValues) => investmentApiClient.saveInvestment(values);
