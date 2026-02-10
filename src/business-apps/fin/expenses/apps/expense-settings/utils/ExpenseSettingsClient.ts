import { RestClient } from '@/common/network/rest/RestClient'
import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { SaveExpenseRuleAssignmentInput } from '../types/ExpenseRuleTypes'
import { MileageRuleFormData, MileageRuleDetailFormData } from '../forms/mileage-rule-form'

const BASE_PATH = 'employee-expense'

export class ExpenseSettingsClient extends RestClient {
  constructor() {
    let url: string = env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT')!
    if (!url.endsWith('/')) {
      url += '/'
    }
    super(url, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  // Expense Rule Assignment Operations
  async saveExpenseRuleAssignment(data: SaveExpenseRuleAssignmentInput): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.expenseRuleAssignment.id
    const payload = {
      ...data,
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleAssignment`, payload)
  }

  async deleteExpenseRuleAssignment(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleAssignment: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleAssignment`, payload)
  }

  async getExpenseRuleAssignmentSchema(): Promise<any> {
    return this.get(`/${BASE_PATH}/saveExpenseRuleAssignment/schema`)
  }

  // Mileage Rule Operations
  async saveMileageRule(data: MileageRuleFormData): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id
    const payload = {
      mileageRule: {
        ...(hasId && { id: data.id }),
        ...(data.version !== undefined && { version: data.version }),
        code: data.code,
        name: data.ruleName, // API expects 'name', not 'ruleName'
        rulePeriod: data.rulePeriod,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        businessKey: data.code || '', // Optional field, use code as fallback
        additionalProperties: {}, // Optional empty object
        details:
          data.details?.map((detail: MileageRuleDetailFormData) => ({
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
    }

    return this.post(`/${BASE_PATH}/saveMileageRule`, payload)
  }

  async deleteMileageRule(id: string, version?: number): Promise<any> {
    const payload = {
      mileageRule: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveMileageRule`, payload)
  }

  // Mileage Rule Detail Operations
  async saveMileageRuleDetail(data: MileageRuleDetailFormData): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id
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
    }

    return this.post(`/${BASE_PATH}/saveMileageRuleDetail`, payload)
  }

  async deleteMileageRuleDetail(id: string, version?: number): Promise<any> {
    const payload = {
      mileageRuleDetail: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveMileageRuleDetail`, payload)
  }

  // Allowance Region Rule Operations (Travel Rules)
  async saveAllowanceRegionRule(data: any): Promise<any> {
    // Check if this is a direct API payload (for assignment) or form data
    if (data.allowanceRegionRule && data.changeMode) {
      // Direct API payload - pass through as is
      return this.post(`/${BASE_PATH}/saveAllowanceRegionRule`, data)
    }

    // Form data - transform to API payload
    const hasId = data.id
    const payload = {
      allowanceRegionRule: {
        ...(hasId && { id: data.id }),
        code: data.code,
        name: data.name,
        description: data.description,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        // Handle both old and new field structures
        ...(data.regionType && { regionType: data.regionType }),
        ...(data.countryCode && { countryCode: data.countryCode }),
        ...(data.cityName && { cityName: data.cityName }),
        ...(data.details && { allowanceRegionRuleDetail: data.details }), // Changed: use allowanceRegionRuleDetail instead of details
        ...(data.travelRegionSetRef && { travelRegionSetRef: data.travelRegionSetRef }),
        ...(data.ruleOrder !== undefined && { ruleOrder: data.ruleOrder }),
        ...(data.additionalProperties && { additionalProperties: data.additionalProperties }),
        ...(data.businessKey && { businessKey: data.businessKey }),
        ...(data.version !== undefined && { version: data.version })
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    }

    return this.post(`/${BASE_PATH}/saveAllowanceRegionRule`, payload)
  }

  async deleteAllowanceRegionRule(id: string, version?: number): Promise<any> {
    const payload = {
      allowanceRegionRule: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveAllowanceRegionRule`, payload)
  }

  // Allowance Region Rule Detail Operations
  async saveAllowanceRegionRuleDetail(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id

    // Extract country code from travelRegionRef (e.g., "TravelRegion:v1:RO" -> "RO")
    let countryRef = data.countryRef
    if (!countryRef && data.travelRegionRef) {
      const parts = data.travelRegionRef.split(':')
      const countryCode = parts[parts.length - 1] // Get last part (e.g., "RO")
      countryRef = `Country:v1:${countryCode}`
    }

    const payload = {
      allowanceRegionRuleDetail: {
        ...(hasId && { id: data.id }),
        amount: data.amount,
        currencyRef: data.currencyRef,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        travelRegionRef: data.travelRegionRef,
        countryRef: countryRef, // Required field
        allowanceRegionRuleId: data.allowanceRegionRuleRef, // Changed from allowanceRegionRuleRef to allowanceRegionRuleId
        ...(data.version !== undefined && { version: data.version })
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    }

    return this.post(`/${BASE_PATH}/saveAllowanceRegionRuleDetail`, payload)
  }

  async deleteAllowanceRegionRuleDetail(detailData: {
    id: string
    version?: number
    allowanceRegionRuleId?: string
    travelRegionRef?: string
    currencyRef?: string
    countryRef?: string
    amount?: number
    activeFrom?: string
    activeTo?: string
  }): Promise<any> {
    const payload = {
      allowanceRegionRuleDetail: {
        id: detailData.id,
        ...(detailData.version !== undefined && { version: detailData.version }),
        ...(detailData.allowanceRegionRuleId && { allowanceRegionRuleId: detailData.allowanceRegionRuleId }),
        ...(detailData.travelRegionRef && { travelRegionRef: detailData.travelRegionRef }),
        ...(detailData.currencyRef && { currencyRef: detailData.currencyRef }),
        ...(detailData.countryRef && { countryRef: detailData.countryRef }),
        ...(detailData.amount !== undefined && { amount: detailData.amount }),
        ...(detailData.activeFrom && { activeFrom: detailData.activeFrom }),
        ...(detailData.activeTo && { activeTo: detailData.activeTo })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveAllowanceRegionRuleDetail`, payload)
  }

  // Expense Rule Operations
  async saveExpenseRuleOtherInfo(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id
    const payload = {
      expenseRuleOtherInfo: {
        ...(hasId && { id: data.id }),
        ...(data.version !== undefined && { version: data.version }),
        businessKey: data.businessKey,
        activeTo: data.activeTo,
        additionalProperties: data.additionalProperties || {},
        source: data.source,
        infoValue: data.infoValue,
        mandatory: data.mandatory,
        activeFrom: data.activeFrom,
        expenseRule: data.expenseRuleId,
        expenseRuleMileage: data.expenseRuleMileageId,
        expenseRuleGeneralExpense: data.expenseRuleGeneralExpenseId
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleOtherInfo`, payload)
  }

  async deleteExpenseRuleOtherInfo(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleOtherInfo: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleOtherInfo`, payload)
  }

  async saveExpenseRuleOtherCalc(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id
    const payload = {
      expenseRuleOtherCalc: {
        ...(hasId && { id: data.id }),
        ...(data.version !== undefined && { version: data.version }),
        businessKey: data.businessKey,
        activeTo: data.activeTo,
        additionalProperties: data.additionalProperties || {},
        source: data.source,
        reimbursablePercent: data.reimbursablePercent,
        activeFrom: data.activeFrom,
        expenseRule: data.expenseRuleId,
        expenseRuleMileage: data.expenseRuleMileageId,
        expenseRuleGeneralExpense: data.expenseRuleGeneralExpenseId,
        expenseRuleAllowanceCode: data.expenseRuleAllowanceCodeId,
        costCenter: data.costCenterId
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleOtherCalc`, payload)
  }

  async deleteExpenseRuleOtherCalc(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleOtherCalc: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleOtherCalc`, payload)
  }

  // Calculation Rule Operations (uses saveExpenseRule endpoint)
  async saveCalculationRule(data: any): Promise<any> {
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
    }

    return this.post(`/${BASE_PATH}/saveExpenseRule`, payload)
  }

  async deleteCalculationRule(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRule: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRule`, payload)
  }

  async saveExpenseRuleMileage(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id
    const payload = {
      expenseRuleMileage: {
        ...(hasId && { id: data.id }),
        ...(data.version !== undefined && { version: data.version }),
        businessKey: data.businessKey,
        activeTo: data.activeTo,
        additionalProperties: data.additionalProperties || {},
        code: data.code,
        name: data.name,
        mileageOrder: data.mileageOrder,
        reimbursable: data.reimbursable,
        measurementUnitRef: data.measurementUnitRef,
        unitPrice: data.unitPrice,
        taxValue: data.taxValue,
        taxCodeRef: data.taxCodeRef,
        wageCode: data.wageCode,
        expenseGroupRef: data.expenseGroupRef,
        activeFrom: data.activeFrom,
        expenseRule: data.expenseRuleId,
        mileageRule: data.mileageRuleId
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleMileage`, payload)
  }

  async deleteExpenseRuleMileage(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleMileage: {
        id,
        version
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleMileage`, payload)
  }

  // Expense Rule Allowance Code Operations
  async saveExpenseRuleAllowanceCode(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id

    // Helper to check if a value should be included (not undefined and not empty string for strings)
    const hasValue = (val: any) => val !== undefined && val !== null && val !== ''

    // Build payload - for UPDATE, always include relationship fields even if null
    const expenseRuleAllowanceCode: any = {
      ...(hasId && { id: data.id }),
      ...(data.version !== undefined && { version: data.version }),
      ...(hasValue(data.businessKey) && { businessKey: data.businessKey }),
      ...(data.activeTo !== undefined && { activeTo: data.activeTo }),
      additionalProperties: data.additionalProperties || {},
      ...(hasValue(data.code) && { code: data.code }),
      ...(hasValue(data.name) && { name: data.name }),
      ...(data.reimbursable !== undefined && { reimbursable: data.reimbursable }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(hasValue(data.calculationRef) && { calculationRef: data.calculationRef }),
      ...(hasValue(data.firstWageCode) && { firstWageCode: data.firstWageCode }),
      ...(hasValue(data.secondWageCode) && { secondWageCode: data.secondWageCode }),
      ...(hasValue(data.expenseGroupRef) && { expenseGroupRef: data.expenseGroupRef }),
      ...(data.activeFrom !== undefined && { activeFrom: data.activeFrom }),
      ...(hasValue(data.travelLocation) && { travelLocation: data.travelLocation }),
      ...(data.codeOrder !== undefined && { codeOrder: data.codeOrder }),
      ...(data.expenseRuleId && { expenseRule: data.expenseRuleId })
    }

    // Include relationship fields AND their percents ONLY as pairs
    // Backend expects: if you send the percent, you MUST send the rule ID (and vice versa)
    if (hasValue(data.firstAllowanceRegionRuleId)) {
      expenseRuleAllowanceCode.firstAllowanceRegionRule = data.firstAllowanceRegionRuleId
      expenseRuleAllowanceCode.firstAllowanceRegionRulePercent = data.firstAllowanceRegionRulePercent ?? 0
    }
    if (hasValue(data.secondAllowanceRegionRuleId)) {
      expenseRuleAllowanceCode.secondAllowanceRegionRule = data.secondAllowanceRegionRuleId
      expenseRuleAllowanceCode.secondAllowanceRegionRulePercent = data.secondAllowanceRegionRulePercent ?? 0
    }

    const payload = {
      expenseRuleAllowanceCode,
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    }

    return this.post(`/${BASE_PATH}/saveExpenseRuleAllowanceCode`, payload)
  }

  async deleteExpenseRuleAllowanceCode(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleAllowanceCode: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleAllowanceCode`, payload)
  }

  // Expense Rule Deduction Operations
  async saveExpenseRuleDeduction(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id

    // Helper to check if a value should be included
    const hasValue = (val: any) => val !== undefined && val !== null && val !== ''

    // Build payload with only defined fields to support restricted edit mode
    const expenseRuleDeduction: any = {
      ...(hasId && { id: data.id }),
      ...(data.version !== undefined && { version: data.version }),
      ...(data.expenseRuleId && { expenseRuleId: data.expenseRuleId }),
      ...(data.deductBreakfast !== undefined && { deductBreakfast: data.deductBreakfast }),
      ...(data.deductLunch !== undefined && { deductLunch: data.deductLunch }),
      ...(data.deductDinner !== undefined && { deductDinner: data.deductDinner }),
      ...(hasValue(data.deductionDay) && { deductionDay: data.deductionDay }),
      ...(data.deductionOrder !== undefined && { deductionOrder: data.deductionOrder }),
      ...(data.overnightAllowance !== undefined && { overnightAllowance: data.overnightAllowance }),
      ...(data.activeFrom !== undefined && { activeFrom: data.activeFrom }),
      ...(data.activeTo !== undefined && { activeTo: data.activeTo }),
      ...(data.taxBreakfast !== undefined && { taxBreakfast: data.taxBreakfast }),
      ...(data.taxLunch !== undefined && { taxLunch: data.taxLunch }),
      ...(data.taxDinner !== undefined && { taxDinner: data.taxDinner })
    }

    const payload = {
      expenseRuleDeduction,
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleDeduction`, payload)
  }

  async deleteExpenseRuleDeduction(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleDeduction: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleDeduction`, payload)
  }

  async saveExpenseRuleGeneralExpense(data: any): Promise<any> {
    // Determine if this is create or update based on presence of id
    const hasId = data.id

    // Helper to check if a value should be included (not undefined and not empty string for strings)
    const hasValue = (val: any) => val !== undefined && val !== null && val !== ''

    // Build payload with only defined, non-empty fields to support restricted edit mode
    const expenseRuleGeneralExpense: any = {
      ...(hasId && { id: data.id }),
      ...(data.version !== undefined && { version: data.version }),
      ...(hasValue(data.businessKey) && { businessKey: data.businessKey }),
      ...(data.activeTo !== undefined && { activeTo: data.activeTo }),
      additionalProperties: data.additionalProperties || {},
      ...(hasValue(data.code) && { code: data.code }),
      ...(hasValue(data.name) && { name: data.name }),
      ...(data.reimbursable !== undefined && { reimbursable: data.reimbursable }),
      ...(data.taxValue !== undefined && { taxValue: data.taxValue }),
      ...(hasValue(data.taxCodeRef) && { taxCodeRef: data.taxCodeRef }),
      ...(hasValue(data.wageCode) && { wageCode: data.wageCode }),
      ...(hasValue(data.expenseGroupRef) && { expenseGroupRef: data.expenseGroupRef }),
      ...(data.activeFrom !== undefined && { activeFrom: data.activeFrom }),
      ...(data.expenseOrder !== undefined && { expenseOrder: data.expenseOrder }),
      ...(data.expenseRuleId && { expenseRule: data.expenseRuleId })
    }

    const payload = {
      expenseRuleGeneralExpense,
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    }

    return this.post(`/${BASE_PATH}/saveExpenseRuleGeneralExpense`, payload)
  }

  async deleteExpenseRuleGeneralExpense(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleGeneralExpense: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleGeneralExpense`, payload)
  }

  async deleteExpenseRuleAllowancePeriod(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleAllowancePeriod: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleAllowancePeriod`, payload)
  }

  async deleteExpenseRuleAllowanceSetup(id: string, version?: number): Promise<any> {
    const payload = {
      expenseRuleAllowanceSetup: {
        id,
        ...(version !== undefined && { version })
      },
      changeMode: 'DELETE'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleAllowanceSetup`, payload)
  }

  // Expense Rule Allowance Period Operations
  async saveExpenseRuleAllowancePeriod(data: any): Promise<any> {
    const hasId = data.id
    const payload = {
      expenseRuleAllowancePeriod: {
        ...(hasId && { id: data.id }),
        ...(data.version !== undefined && { version: data.version }),
        businessKey: data.businessKey,
        activeTo: data.activeTo,
        additionalProperties: data.additionalProperties || {},
        code: data.code,
        name: data.name,
        overnightAccomodation: data.overnightAccomodation,
        fromTime: data.fromTime,
        toTime: data.toTime,
        minHours: data.minHours,
        midnightRule: data.midnightRule,
        startAfter: data.startAfter,
        returnBefore: data.returnBefore,
        activeFrom: data.activeFrom,
        periodOrder: data.periodOrder,
        expenseRule: data.expenseRuleId
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleAllowancePeriod`, payload)
  }

  async saveBulkExpenseRuleAllowancePeriod(list: any[]): Promise<any> {
    const payload = {
      expenseRuleAllowancePeriodList: list.map(item => ({
        ...(item.id && { id: item.id }),
        ...(item.version !== undefined && { version: item.version }),
        businessKey: item.businessKey,
        activeTo: item.activeTo,
        additionalProperties: item.additionalProperties || {},
        code: item.code,
        name: item.name,
        overnightAccomodation: item.overnightAccomodation,
        fromTime: item.fromTime,
        toTime: item.toTime,
        minHours: item.minHours,
        midnightRule: item.midnightRule,
        startAfter: item.startAfter,
        returnBefore: item.returnBefore,
        activeFrom: item.activeFrom,
        periodOrder: item.periodOrder,
        expenseRule: item.expenseRuleId
      }))
    }
    return this.post(`/${BASE_PATH}/saveBulkExpenseRuleAllowancePeriod`, payload)
  }

  // Expense Rule Allowance Setup Operations
  async saveExpenseRuleAllowanceSetup(data: any): Promise<any> {
    const hasId = data.id
    const payload = {
      expenseRuleAllowanceSetup: {
        ...(hasId && { id: data.id }),
        ...(data.version !== undefined && { version: data.version }),
        businessKey: data.businessKey,
        activeTo: data.activeTo,
        additionalProperties: data.additionalProperties || {},
        name: data.name,
        issue: data.issue,
        onlyTax: data.onlyTax,
        activeFrom: data.activeFrom,
        setupOrder: data.setupOrder,
        expenseRule: data.expenseRuleId,
        allowancePeriod: data.allowancePeriodId,
        allowanceCode: data.allowanceCodeId
      },
      changeMode: hasId ? 'UPDATE' : 'INSERT'
    }
    return this.post(`/${BASE_PATH}/saveExpenseRuleAllowanceSetup`, payload)
  }

  // Calculation and Utility Operations
  async getEmployeeRule(employeeId: string, allowanceDate: string): Promise<any> {
    return this.get(`/${BASE_PATH}/getEmployeeRule/${employeeId}/${allowanceDate}`)
  }

  async calculateAllowance(requestId: string): Promise<any> {
    return this.get(`/${BASE_PATH}/calculateAllowance/${requestId}`)
  }

  // Validation and Conflict Detection
  async validateRuleAssignment(data: SaveExpenseRuleAssignmentInput): Promise<any> {
    // This would call a validation endpoint if available
    // For now, we can implement client-side validation
    return this.validateAssignmentConflicts(data)
  }

  private validateAssignmentConflicts(data: SaveExpenseRuleAssignmentInput): any {
    // Client-side validation logic
    const conflicts = []
    const warnings = []

    // Validate date ranges
    const activeFrom = new Date(data.expenseRuleAssignment.activeFrom)
    const activeTo = new Date(data.expenseRuleAssignment.activeTo)

    if (activeFrom >= activeTo) {
      conflicts.push({
        type: 'PERIOD_OVERLAP',
        severity: 'ERROR',
        message: 'Active from date must be before active to date',
        affectedRules: [data.expenseRuleAssignment.expenseRule],
        resolution: 'Adjust the date range'
      })
    }

    // Validate assignment order
    if (data.expenseRuleAssignment.assignmentOrder < 1) {
      conflicts.push({
        type: 'ORDER_CONFLICT',
        severity: 'ERROR',
        message: 'Assignment order must be greater than 0',
        affectedRules: [data.expenseRuleAssignment.expenseRule],
        resolution: 'Set a valid assignment order'
      })
    }

    // Add future date validation
    const today = new Date()
    if (activeTo < today) {
      warnings.push('Rule assignment will be inactive (end date is in the past)')
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings
    }
  }

  // Bulk Operations - Using individual calls approach (reliable)
  async saveBulkExpenseRuleAssignment(assignments: SaveExpenseRuleAssignmentInput[]): Promise<any> {
    const results = []
    const errors = []

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i]
      try {
        // Use the reliable individual save endpoint
        const result = await this.saveExpenseRuleAssignment(assignment)
        results.push({
          success: true,
          data: result,
          assignment: assignment.expenseRuleAssignment.id,
          order: assignment.expenseRuleAssignment.assignmentOrder
        })
      } catch (error) {
        console.error(`❌ Failed to save assignment ${assignment.expenseRuleAssignment.id}:`, error)
        errors.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          assignment: assignment.expenseRuleAssignment.id,
          order: assignment.expenseRuleAssignment.assignmentOrder
        })
      }
    }

    // Return summary of all operations
    const summary = {
      totalProcessed: assignments.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    }

    // If there were any failures, throw an error with details
    if (errors.length > 0) {
      const errorMessage = `Bulk save partially failed: ${errors.length}/${assignments.length} assignments failed to save`
      const error = new Error(errorMessage)
      ;(error as any).details = summary
      throw error
    }

    return summary
  }

  async bulkUpdateAssignments(assignments: SaveExpenseRuleAssignmentInput[]): Promise<any> {
    const results = []
    for (const assignment of assignments) {
      try {
        const result = await this.saveExpenseRuleAssignment(assignment)
        results.push({ success: true, data: result, assignment })
      } catch (error) {
        results.push({ success: false, error, assignment })
      }
    }
    return results
  }

  async bulkDeleteAssignments(assignmentIds: string[]): Promise<any> {
    const results = []
    for (const id of assignmentIds) {
      try {
        const result = await this.deleteExpenseRuleAssignment(id)
        results.push({ success: true, data: result, id })
      } catch (error) {
        results.push({ success: false, error, id })
      }
    }
    return results
  }
}

// Create a singleton instance
export const expenseSettingsClient = new ExpenseSettingsClient()
