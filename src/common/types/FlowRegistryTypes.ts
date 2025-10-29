export enum FlowContextName {
  // Intranet
  contentEntryEntity = 'contentEntryEntity',
  contentEntryCreate = 'contentEntryCreate',
  contentEntryUpdate = 'contentEntryUpdate',
  contentEntryDelete = 'contentEntryDelete',
  contentEntryReact = 'contentEntryReact',
  contentEntryComment = 'contentEntryComment',

  // Human Resources
  employeeEntity = 'employeeEntity',
  jobPositionEntity = 'jobPositionEntity',

  // Customer Relations

  /// Customer Leads
  leadEntity = 'custopmerLeadEntity', // TODO: Obsolete
  customerLeadEntity = 'customerLeadEntity',
  customerLeadCreate = 'customerLeadCreate',

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

  transitionOpportunityStage = 'transitionOpportunityStage',
  saveOpportunityStageConditionStatus = 'saveOpportunityStageConditionStatus',

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
  customerNoteCreate = 'customerNoteCreate',
  customerNoteDelete = 'customerNoteDelete',

  /// Customer Documents
  createCustomerDocument = 'customerDocumentCreate',

  customerTaskEntity = 'customerTaskEntity',
  createCustomerTask = 'customerTaskCreate',
  customerTaskDelete = 'customerTaskDelete',

  // Investment Relations

  /// Investment Leads
  investmentLeadEntity = 'investmentLeadEntity',
  createInvestmentLead = 'investmentLeadCreate',
  updateInvestmentLead = 'investmentLeadUpdate',

  /// Investment Accounts
  investmentAccountEntity = 'investmentAccountEntity',
  createInvestmentAccount = 'investmentAccountCreate',
  updateInvestmentAccount = 'investmentAccountUpdate',

  /// Investment Contacts
  investmentContactEntity = 'investmentContactEntity',
  createInvestmentContact = 'investmentContactCreate',
  updateInvestmentContact = 'investmentContactUpdate',

  /// Investment Opportunities
  investmentOpportunityEntity = 'investmentOpportunityEntity',
  createInvestmentOpportunity = 'investmentOpportunityCreate',
  updateInvestmentOpportunity = 'investmentOpportunityUpdate',
  investmentOpportunityStageTransition = 'investmentOpportunityStageTransition',
  investmentOpportunityConditionUpdate = 'investmentOpportunityConditionUpdate',

  /// Investment Activities

  investmentActivityEntity = 'investmentActivityEntity',
  createInvestmentActivity = 'investmentActivityCreate',
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
  employeeAbsenceRecord = 'employeeAbsenceRecord',
  employeePerformanceGoal = 'employeePerformanceGoal',
  employeeGiveFeedback = 'employeeGiveFeedback',
  employeeRequestFeedback = 'employeeRequestFeedback',
  employeeSkills = 'employeeSkills',
  employeeProfilePicture = 'employeeProfilePicture',

  updateEmployeePersonalData = 'updateEmployeePersonalData',
  updateEmployeeAddress = 'updateEmployeeAddress',
  updateEmployeeCommunication = 'updateEmployeeCommunication',
  updateEmployeeRelationship = 'updateEmployeeRelationship',
  updateEmployeeBankAccount = 'updateEmployeeBankAccount',
  updateEmployeePicture = 'updateEmployeePicture',
  updateEmployeeSkill = 'updateEmployeeSkill',
  updateEmployeeWorkingCondition = 'updateEmployeeWorkingCondition',
  updateEmployeeWorkingHours = 'updateEmployeeWorkingHours',

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
