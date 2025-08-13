import { RestClient } from '@/common/network/rest/RestClient';
import { env } from '@/common/env/EnvUtils';
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils';
import { 
  SaveExpenseRuleAssignmentInput,
  AllowanceRegionRuleFormData
} from '../types/ExpenseRuleTypes';
import { MileageRuleFormData, MileageRuleDetailFormData } from '../forms/mileage-rule-form';

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
    // DEBUG: Log incoming data
    console.log('🐛 ExpenseSettingsClient received data:', {
      id: data.id,
      version: data.version,
      code: data.code,
      ruleName: data.ruleName, // Note: this gets mapped to 'name' in API payload
      detailsWithVersions: data.details?.map((d: MileageRuleDetailFormData) => ({ id: d.id, version: d.version }))
    });

    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      mileageRule: {
        ...(hasId && { id: data.id }),
        ...(data.version !== undefined && { version: data.version }),
        code: data.code,
        name: data.ruleName,  // API expects 'name', not 'ruleName'
        description: data.description,
        rulePeriod: data.rulePeriod,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        businessKey: data.code || '', // Optional field, use code as fallback
        additionalProperties: {}, // Optional empty object
        details: data.details?.map((detail: MileageRuleDetailFormData) => ({
          ...(detail.id && { id: detail.id }),
          limitFrom: detail.limitFrom,
          limitTo: detail.limitTo,
          rateAmount: detail.rateAmount,
          detailOrder: detail.detailOrder,
          activeFrom: detail.activeFrom,
          activeTo: detail.activeTo,
          ...(detail.version !== undefined && { version: detail.version })
        })) || []
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    };
    
    // DEBUG: Log final payload
    console.log('🐛 ExpenseSettingsClient final payload:', {
      changeMode: payload.changeMode,
      mileageRuleId: payload.mileageRule.id,
      mileageRuleVersion: payload.mileageRule.version,
      mileageRuleName: payload.mileageRule.name, // Mapped from 'ruleName' to 'name'
      mileageRuleCode: payload.mileageRule.code,
      detailsWithVersions: payload.mileageRule.details.map((d: any) => ({ id: d.id, version: d.version }))
    });
    
    console.log('🐛 Full payload structure:', JSON.stringify(payload, null, 2));
    
    console.log('🐛 saveMileageRule - POST to:', `processes/${BASE_PATH}/saveMileageRule`);
    return this.post(`/${BASE_PATH}/saveMileageRule`, payload);
  }

  async deleteMileageRule(id: string): Promise<any> {
    return this.delete(`/${BASE_PATH}/saveMileageRule/${id}`);
  }

  // Mileage Rule Detail Operations
  async saveMileageRuleDetail(data: MileageRuleDetailFormData): Promise<any> {
    // DEBUG: Log incoming detail data
    console.log('🐛 ExpenseSettingsClient saveMileageRuleDetail received:', {
      id: data.id,
      version: data.version,
      rateAmount: data.rateAmount,
      limitFrom: data.limitFrom,
      limitTo: data.limitTo
    });

    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      mileageRuleDetail: {
        ...(hasId && { id: data.id }),
        ...(data.version !== undefined && { version: data.version }),
        limitFrom: data.limitFrom,
        limitTo: data.limitTo,
        amount: data.rateAmount,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        detailOrder: data.detailOrder,
        // mileageRule should be the parent rule ID
        mileageRule: data.mileageRuleId,
        additionalProperties: data.additionalProperties || {} // Expected field from Swagger
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    };
    
    // DEBUG: Log final detail payload
    console.log('🐛 ExpenseSettingsClient detail final payload:', {
      changeMode: payload.changeMode,
      detailId: payload.mileageRuleDetail.id,
      detailVersion: payload.mileageRuleDetail.version,
      amount: payload.mileageRuleDetail.amount,
      limitFrom: payload.mileageRuleDetail.limitFrom,
      limitTo: payload.mileageRuleDetail.limitTo,
      mileageRuleId: payload.mileageRuleDetail.mileageRule,
      hasAdditionalProperties: !!payload.mileageRuleDetail.additionalProperties
    });
    
    console.log('🐛 Complete payload being sent:', JSON.stringify(payload, null, 2));
    
    console.log('🐛 ExpenseSettingsClient attempting POST to:', `/${BASE_PATH}/saveMileageRuleDetail`);
    console.log('🐛 Final endpoint path:', `processes/${BASE_PATH}/saveMileageRuleDetail`);
    
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

  // Calculation Rule Operations (uses saveExpenseRule endpoint)
  async saveCalculationRule(data: any): Promise<any> {
    // Always use INSERT changeMode, pass id and version for updates
    console.log('ExpenseSettingsClient.saveCalculationRule - Input data:', {
      id: data.id,
      version: data.version,
      versionType: typeof data.version,
      hasVersion: data.version !== undefined
    });

    const payload = {
      expenseRule: {
        ...(data.id && { id: data.id }),
        code: data.code,
        name: data.name,
        standard: data.standard,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        deductionLimit: data.deductionLimit,
        useLastCountry: data.useLastCountry,
        useSingleCurrency: data.useSingleCurrency,
        taxesCode: data.taxesCode,
        nonpayableCode: data.nonpayableCode,
        advancePaymentCode: data.advancePaymentCode,
        calculationTypeRef: data.calculationTypeRef,
        countryRef: data.countryRef,
        currencyRef: data.currencyRef,
        ...(data.version !== undefined && { version: data.version })
      },
      changeMode: 'INSERT'
    };

    console.log('ExpenseSettingsClient.saveCalculationRule - Final payload:', payload);
    return this.post(`/${BASE_PATH}/saveExpenseRule`, payload);
  }

  async deleteCalculationRule(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRule: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRule`, payload);
  }

  async saveExpenseRuleMileage(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      expenseRuleMileage: {
        ...(hasId && { id: data.id }),
        expenseRuleId: data.expenseRuleId,
        code: data.code,
        name: data.name,
        reimbursable: data.reimbursable,
        taxCodeRef: data.taxCodeRef,
        taxValue: data.taxValue,
        unitPrice: data.unitPrice,
        mileageOrder: data.mileageOrder,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        wageCode: data.wageCode,
        expenseGroupRef: data.expenseGroupRef,
        measurementUnitRef: data.measurementUnitRef,
        mileageRuleId: data.mileageRuleId,
        version: data.version
      },
      changeMode: hasId ? 'UPDATE' : 'CREATE'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleMileage`, payload);
  }

  async deleteExpenseRuleMileage(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleMileage: {
        id,
        version
      },
      changeMode: 'DELETE'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleMileage`, payload);
  }

  // Expense Rule Allowance Code Operations
  async saveExpenseRuleAllowanceCode(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      expenseRuleAllowanceCode: {
        ...(hasId && { id: data.id }),
        expenseRuleId: data.expenseRuleId,
        code: data.code,
        amount: data.amount,
        abroad: data.abroad,
        calculation: data.calculation,
        codeOrder: data.codeOrder,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        expenseGroupRef: data.expenseGroupRef,
        ...(data.version !== undefined && { version: data.version })
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleAllowanceCode`, payload);
  }

  async deleteExpenseRuleAllowanceCode(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleAllowanceCode: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleAllowanceCode`, payload);
  }

  // Expense Rule Deduction Operations
  async saveExpenseRuleDeduction(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      expenseRuleDeduction: {
        ...(hasId && { id: data.id }),
        expenseRuleId: data.expenseRuleId,
        deductBreakfast: data.deductBreakfast,
        deductLunch: data.deductLunch,
        deductDinner: data.deductDinner,
        deductionDay: data.deductionDay,
        deductionOrder: data.deductionOrder,
        overnightAllowance: data.overnightAllowance,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        ...(data.version !== undefined && { version: data.version })
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleDeduction`, payload);
  }

  async deleteExpenseRuleDeduction(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleDeduction: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleDeduction`, payload);
  }

  async saveExpenseRuleGeneralExpense(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id;
    const payload = {
      expenseRuleGeneralExpense: {
        ...(hasId && { id: data.id }),
        expenseRuleId: data.expenseRuleId,
        code: data.code,
        expenseOrder: data.expenseOrder,
        taxValue: data.taxValue,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        expenseGroupRef: data.expenseGroupRef,
        ...(data.version !== undefined && { version: data.version })
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleGeneralExpense`, payload);
  }

  async deleteExpenseRuleGeneralExpense(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleGeneralExpense: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    };
    return this.post(`/${BASE_PATH}/saveExpenseRuleGeneralExpense`, payload);
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