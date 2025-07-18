import { RestClient } from '@/common/network/rest/RestClient';
import { env } from '@/common/env/EnvUtils';
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils';
import { 
  SaveExpenseRuleAssignmentInput,
  MileageRuleFormData,
  AllowanceRegionRuleFormData
} from '../types/ExpenseRuleTypes';

const BASE_PATH = 'employee-expense';

export class ExpenseSettingsClient extends RestClient {
  constructor() {
    let url: string = env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')!;
    if (!url.endsWith('/')) {
      url += '/';
    }
    super(url, {});
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {};
    }
    this.headers["Authorization"] = setAccessTokenToAuthorizationHeader(accessToken);
  }

  // Expense Rule Assignment Operations
  async saveExpenseRuleAssignment(data: SaveExpenseRuleAssignmentInput): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.expenseRuleAssignment.id;
    const payload = {
      ...data,
      changeMode: hasId ? 'UPDATE' : 'CREATE'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleAssignment`, payload);
  }

  async deleteExpenseRuleAssignment(id: string): Promise<any> {
    return this.delete(`/${BASE_PATH}/saveExpenseRuleAssignment/${id}`);
  }

  async getExpenseRuleAssignmentSchema(): Promise<any> {
    return this.get(`/${BASE_PATH}/saveExpenseRuleAssignment/schema`);
  }

  // Mileage Rule Operations
  async saveMileageRule(data: MileageRuleFormData): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      mileageRule: {
        ...(hasId && { id: data.id }),
        code: data.code,
        name: data.name,
        description: data.description,
        rateType: data.rateType,
        rateAmount: data.rateAmount,
        currency: data.currency,
  
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        details: data.details,
        ...(data.version !== undefined && { version: data.version })
      },
      changeMode: hasId ? 'UPDATE' : 'CREATE'
    };
    return this.post(`/${BASE_PATH}/saveMileageRule`, payload);
  }

  async deleteMileageRule(id: string): Promise<any> {
    return this.delete(`/${BASE_PATH}/saveMileageRule/${id}`);
  }

  // Mileage Rule Detail Operations
  async saveMileageRuleDetail(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      ...data,
      changeMode: hasId ? 'UPDATE' : 'CREATE'
    };
    return this.post(`/${BASE_PATH}/saveMileageRuleDetail`, payload);
  }

  async deleteMileageRuleDetail(id: string): Promise<any> {
    return this.delete(`/${BASE_PATH}/saveMileageRuleDetail/${id}`);
  }

  // Allowance Region Rule Operations (Travel Rules)
  async saveAllowanceRegionRule(data: AllowanceRegionRuleFormData): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      allowanceRegionRule: {
        ...(hasId && { id: data.id }),
        code: data.code,
        name: data.name,
        description: data.description,
        regionType: data.regionType,
        countryCode: data.countryCode,
        cityName: data.cityName,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        details: data.details,
        ...(data.version !== undefined && { version: data.version })
      },
      changeMode: hasId ? 'UPDATE' : 'CREATE'
    };
    return this.post(`/${BASE_PATH}/saveAllowanceRegionRule`, payload);
  }

  async deleteAllowanceRegionRule(id: string): Promise<any> {
    return this.delete(`/${BASE_PATH}/saveAllowanceRegionRule/${id}`);
  }

  // Allowance Region Rule Detail Operations
  async saveAllowanceRegionRuleDetail(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      ...data,
      changeMode: hasId ? 'UPDATE' : 'CREATE'
    };
    return this.post(`/${BASE_PATH}/saveAllowanceRegionRuleDetail`, payload);
  }

  async deleteAllowanceRegionRuleDetail(id: string): Promise<any> {
    return this.delete(`/${BASE_PATH}/saveAllowanceRegionRuleDetail/${id}`);
  }

  // Expense Rule Operations
  async saveExpenseRuleOtherInfo(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      ...data,
      changeMode: hasId ? 'UPDATE' : 'CREATE'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleOtherInfo`, payload);
  }

  async deleteExpenseRuleOtherInfo(id: string): Promise<any> {
    return this.delete(`/${BASE_PATH}/saveExpenseRuleOtherInfo/${id}`);
  }

  async saveExpenseRuleOtherCalc(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      ...data,
      changeMode: hasId ? 'UPDATE' : 'CREATE'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleOtherCalc`, payload);
  }

  async deleteExpenseRuleOtherCalc(id: string): Promise<any> {
    return this.delete(`/${BASE_PATH}/saveExpenseRuleOtherCalc/${id}`);
  }

  async saveExpenseRuleMileage(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      ...data,
      changeMode: hasId ? 'UPDATE' : 'CREATE'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleMileage`, payload);
  }

  async deleteExpenseRuleMileage(id: string): Promise<any> {
    return this.delete(`/${BASE_PATH}/saveExpenseRuleMileage/${id}`);
  }

  async saveExpenseRuleGeneralExpense(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      ...data,
      changeMode: hasId ? 'UPDATE' : 'CREATE'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleGeneralExpense`, payload);
  }

  async deleteExpenseRuleGeneralExpense(id: string): Promise<any> {
    return this.delete(`/${BASE_PATH}/saveExpenseRuleGeneralExpense/${id}`);
  }

  // Calculation and Utility Operations
  async getEmployeeRule(employeeId: string, allowanceDate: string): Promise<any> {
    return this.get(`/${BASE_PATH}/getEmployeeRule/${employeeId}/${allowanceDate}`);
  }

  async calculateAllowance(requestId: string): Promise<any> {
    return this.get(`/${BASE_PATH}/calculateAllowance/${requestId}`);
  }

  // Validation and Conflict Detection
  async validateRuleAssignment(data: SaveExpenseRuleAssignmentInput): Promise<any> {
    // This would call a validation endpoint if available
    // For now, we can implement client-side validation
    return this.validateAssignmentConflicts(data);
  }

  private validateAssignmentConflicts(data: SaveExpenseRuleAssignmentInput): any {
    // Client-side validation logic
    const conflicts = [];
    const warnings = [];

    // Validate date ranges
    const activeFrom = new Date(data.expenseRuleAssignment.activeFrom);
    const activeTo = new Date(data.expenseRuleAssignment.activeTo);

    if (activeFrom >= activeTo) {
      conflicts.push({
        type: 'PERIOD_OVERLAP',
        severity: 'ERROR',
        message: 'Active from date must be before active to date',
        affectedRules: [data.expenseRuleAssignment.expenseRule],
        resolution: 'Adjust the date range'
      });
    }

    // Validate assignment order
    if (data.expenseRuleAssignment.assignmentOrder < 1) {
      conflicts.push({
        type: 'ORDER_CONFLICT',
        severity: 'ERROR',
        message: 'Assignment order must be greater than 0',
        affectedRules: [data.expenseRuleAssignment.expenseRule],
        resolution: 'Set a valid assignment order'
      });
    }

    // Add future date validation
    const today = new Date();
    if (activeTo < today) {
      warnings.push('Rule assignment will be inactive (end date is in the past)');
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings
    };
  }

  // Bulk Operations
  async saveBulkExpenseRuleAssignment(assignments: SaveExpenseRuleAssignmentInput[]): Promise<any> {
    const payload = {
      expenseRuleAssignmentList: assignments.map(assignment => ({
        ...assignment.expenseRuleAssignment,
        // For new assignments, omit id and version to let the endpoint know to create them
        ...(assignment.expenseRuleAssignment.id ? {} : { id: undefined, version: undefined })
      }))
    };
    return this.post(`/${BASE_PATH}/saveBulkExpenseRuleAssignment`, payload);
  }

  async bulkUpdateAssignments(assignments: SaveExpenseRuleAssignmentInput[]): Promise<any> {
    const results = [];
    for (const assignment of assignments) {
      try {
        const result = await this.saveExpenseRuleAssignment(assignment);
        results.push({ success: true, data: result, assignment });
      } catch (error) {
        results.push({ success: false, error, assignment });
      }
    }
    return results;
  }

  async bulkDeleteAssignments(assignmentIds: string[]): Promise<any> {
    const results = [];
    for (const id of assignmentIds) {
      try {
        const result = await this.deleteExpenseRuleAssignment(id);
        results.push({ success: true, data: result, id });
      } catch (error) {
        results.push({ success: false, error, id });
      }
    }
    return results;
  }
}

// Create a singleton instance
export const expenseSettingsClient = new ExpenseSettingsClient(); 