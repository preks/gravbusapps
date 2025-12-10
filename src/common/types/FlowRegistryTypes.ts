export enum FlowContextName {
  // Intranet
  contentEntryEntity = 'contentEntryEntity',
  contentEntryCreate = 'contentEntryCreate',
  contentEntryUpdate = 'contentEntryUpdate',
  contentEntryDelete = 'contentEntryDelete',
  contentEntryReact = 'contentEntryReact',
  contentEntryComment = 'contentEntryComment',
  contentEntryAccept = 'contentEntryAccept',
  contentDocumentCreate = 'contentDocumentCreate',
  contentDocumentUpdate = 'contentDocumentUpdate',
  contentDocumentDelete = 'contentDocumentDelete',

  // Human Resources
  employeeEntity = 'employeeEntity',
  jobPositionEntity = 'jobPositionEntity',
  assetEntity = 'assetEntity',

  // HR Notes
  createEmployeeNote = 'createEmployeeNote',
  updateEmployeeNote = 'updateEmployeeNote',
  deleteEmployeeNote = 'deleteEmployeeNote',

  // Customer Relations

  /// Customer Leads
  customerLeadEntity = 'customerLeadEntity',
  customerLeadCreate = 'customerLeadCreate',
  customerLeadStatusUpdate = 'customerLeadStatusUpdate', // Status change context

  /// Customer Accounts
  customerAccountEntity = 'customerAccountEntity',
  customerAccountCreate = 'customerAccountCreate', // TODO: Replace startProcess
  customerAccountUpdate = 'customerAccountUpdate', // TODO: Replace startProcess

  /// Customer Contacts
  customerContactEntity = 'customerContactEntity',
  customerContactCreate = 'customerContactCreate', // TODO: Replace startProcess
  customerContactUpdate = 'customerContactUpdate', // TODO: Replace startProcess

  /// Customer Opportunities
  customerOpportunityEntity = 'customerOpportunityEntity',
  customerOpportunityCreate = 'customerOpportunityCreate', // TODO: Replace startProcess
  customerOpportunityUpdate = 'customerOpportunityUpdate', // TODO: Replace startProcess
  customerOpportunityStatusUpdate = 'customerOpportunityStatusUpdate', // Status change context
  customerOpportunityStageTransition = 'customerOpportunityStageTransition',
  customerOpportunityConditionUpdate = 'customerOpportunityConditionUpdate',

  /// Customer Campaigns
  customerCampaignEntity = 'customerCampaignEntity',
  customerCampaignCreate = 'customerCampaignCreate',
  customerCampaignUpdate = 'customerCampaignUpdate',

  /// Customer Activities
  customerActivityEntity = 'customerActivityEntity',
  customerActivityCreate = 'customerActivityCreate',
  customerActivityUpdate = 'customerActivityUpdate',
  customerActivityDelete = 'customerActivityDelete',

  /// Customer Notes
  customerNoteEntity = 'customerNoteEntity',
  customerNoteCreate = 'customerNoteCreate',
  customerNoteDelete = 'customerNoteDelete',

  /// Customer Documents
  customerDocumentCreate = 'customerDocumentCreate',

  customerTaskEntity = 'customerTaskEntity',
  customerTaskCreate = 'customerTaskCreate',
  customerTaskDelete = 'customerTaskDelete',

  // Investment Relations

  /// Investment Leads
  investmentLeadEntity = 'investmentLeadEntity',
  investmentLeadCreate = 'investmentLeadCreate',
  investmentLeadUpdate = 'investmentLeadUpdate',
  investmentLeadReject = 'investmentLeadReject',
  investmentLeadStatusUpdate = 'investmentLeadStatusUpdate', // Status change context

  /// Investment Accounts
  investmentAccountEntity = 'investmentAccountEntity',
  investmentAccountCreate = 'investmentAccountCreate',
  investmentAccountUpdate = 'investmentAccountUpdate',

  /// Investment Contacts
  investmentContactEntity = 'investmentContactEntity',
  investmentContactCreate = 'investmentContactCreate',
  investmentContactUpdate = 'investmentContactUpdate',

  /// Investment Opportunities
  investmentOpportunityEntity = 'investmentOpportunityEntity',
  investmentOpportunityCreate = 'investmentOpportunityCreate',
  investmentOpportunityUpdate = 'investmentOpportunityUpdate',
  investmentOpportunityStatusUpdate = 'investmentOpportunityStatusUpdate', // Status change context
  investmentOpportunityStageTransition = 'investmentOpportunityStageTransition',
  investmentOpportunityConditionUpdate = 'investmentOpportunityConditionUpdate',
  investmentOpportunityReject = 'investmentOpportunityReject',

  /// Investment Activities

  investmentActivityEntity = 'investmentActivityEntity',
  investmentActivityCreate = 'investmentActivityCreate',
  investmentActivityDelete = 'investmentActivityDelete',

  /// Investment Tasks

  investmentTaskEntity = 'investmentTaskEntity',
  investmentTaskCreate = 'investmentTaskCreate',
  investmentTaskUpdate = 'investmentTaskUpdate',
  investmentTaskDelete = 'investmentTaskDelete',
  /// Investment Notes

  investmentNoteEntity = 'investmentNoteEntity',
  investmentNoteCreate = 'investmentNoteCreate',
  investmentNoteDelete = 'investmentNoteDelete',

  /// Investment Documents
  investmentDocumentEntity = 'investmentDocumentEntity',
  investmentDocumentCreate = 'investmentDocumentCreate',
  createInvestmentDocument = 'createInvestmentDocument',
  investmentDocumentUpdate = 'investmentDocumentUpdate',
  investmentDocumentDelete = 'investmentDocumentDelete',

  /// Investments
  investmentCreate = 'investmentCreate', // TODO: Replace startProcess
  investmentEntity = 'investmentEntity',
  investmentTileUpdate = 'investmentTileUpdate',
  investmentKpiTilesUpdate = 'investmentKpiTilesUpdate',
  investmentStatusUpdate = 'investmentStatusUpdate',
  investmentPlanExit = 'investmentPlanExit',

  equityInvestmentEntity = 'equityInvestmentEntity', // TODO: Check
  privateEquityInvestmentEntity = 'privateEquityInvestmentEntity', // TODO: Check
  realEstateInvestmentEntity = 'realEstateInvestmentEntity', // TODO: Check
  liquidFundInvestmentEntity = 'liquidFundInvestmentEntity', // TODO: Check

  /// Investment Equity Round
  investmentEquityInvestmentRoundCreate = 'investmentEquityInvestmentRoundCreate',
  investmentEquityInvestmentRoundUpdate = 'investmentEquityInvestmentRoundUpdate',
  investmentEquityInvestmentRoundDelete = 'investmentEquityInvestmentRoundDelete',

  /// Investment Shareholders
  investmentShareholderUpdate = 'investmentShareholderUpdate',

  /// Investment Liquidity Preferences
  investmentLiquidityPreferenceUpdate = 'investmentLiquidityPreferenceUpdate',

  /// Investment PPM Forecasts
  investmentPpmForecastUpdate = 'investmentPpmForecastUpdate',

  /// Investment KPI Forecasts
  investmentKpiForecastUpdate = 'investmentKpiForecastUpdate',

  /// Investment Liquidity Forecasts (Real Estate)
  investmentLiquidityForecastUpdate = 'investmentLiquidityForecastUpdate',

  /// Investment Reports
  investmentReportUpload = 'investmentReportUpload',
  investmentReportEntity = 'investmentReportEntity', // Integrate
  investmentReportGenerate = 'investmentReportGenerate',

  expenseItems = 'expenseItems',
  expensePlans = 'expensePlans',
  expenseRequests = 'expenseRequests',
  advancePayments = 'advancePayments',
  employeeExpenses = 'employeeExpenses',
  catalog = 'catalog',
  flow = 'flow',
  flowEntity = 'flowEntity',
  flowInstance = 'flowInstance',

  documentPersonal = 'documentPersonal',
  employeeDocumentDelete = 'employeeDocumentDelete',
  employeeAbsenceRecord = 'employeeAbsenceRecord',
  employeePerformanceGoal = 'employeePerformanceGoal',
  employeeGiveFeedback = 'employeeGiveFeedback',
  employeeRequestFeedback = 'employeeRequestFeedback',
  employeeSkills = 'employeeSkills',
  employeeAdditionalProperties = 'updateEmployeeAdditionalAttributes',
  employeeProfilePicture = 'employeeProfilePicture',
  employeeAttendanceCorrectionRequest = 'employeeAttendanceCorrectionRequest',
  employeeBenefitRequest = 'employeeBenefitRequest',

  updateEmployeePersonalData = 'updateEmployeePersonalData',
  updateEmployeeAddress = 'updateEmployeeAddress',
  updateEmployeeCommunication = 'updateEmployeeCommunication',
  updateEmployeeRelationship = 'updateEmployeeRelationship',
  updateEmployeeBankAccount = 'updateEmployeeBankAccount',
  updateEmployeePicture = 'updateEmployeePicture',
  updateEmployeeSkill = 'updateEmployeeSkill',
  updateEmployeeWorkingCondition = 'updateEmployeeWorkingCondition',
  updateEmployeeWorkingHours = 'updateEmployeeWorkingHours',
  adjustEmployeeSalary = 'adjustEmployeeSalary',
  grantEmployeeBonus = 'grantEmployeeBonus',

  createEmployee = 'createEmployee',
  createJobPosition = 'createJobPosition'
}

export type ContextData = {
  id?: string | null
  contextDataName: string
  contextDataType: string
}

export type Context = {
  id?: string | null
  contextName: string
  contextData?: ContextData[] | null
  contextDataType?: string
  contextDataName?: string
  contextId?: string
  isDeleted?: boolean
  rank?: number
}

export type FlowItemReduced = {
  id?: string | null
  flowName: string
  flowNameTranslation?: Record<string, string> | string
  flowType: string
  context?: Context // Single context object from API
  contexts?: Context[] // For backward compatibility
  processName: string
  domain: string
  targetDesktop: string
  targetMobile: string
  rank?: number
  builderType?: string
}

export type GetPermissionFlowItemsV1Params = {
  contexts: FlowContextName[]
}

export type GetPermissionFlowItemsV2Body = {
  contexts: {
    contextName: FlowContextName
    mainContextDataId: string
  }[]
}

export type GetMainContextDataBody = {
  contextNames: FlowContextName[]
}

export type GetPermissionFlowItemsResponse = {
  flowItems: FlowItemReduced[]
}

export type GetMainContextDataResponse = {
  contextData: {
    mainContextDataName: string
    contextName: string
  }[]
}
