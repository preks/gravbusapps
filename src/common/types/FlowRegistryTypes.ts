export enum FlowContextName {
  // Human Resources
  employeeEntity = "employeeEntity",
  jobPositionEntity = "jobPositionEntity",


  // Customer Relations

  /// Customer Leads
  leadEntity = "custopmerLeadEntity", // TODO: Obsolete
  customerLeadEntity = "customerLeadEntity",
  customerLeadCreate = "customerLeadCreate",

  /// Customer Accounts
  accountEntity = "customerAccountEntity", // TODO: Obsolete
  customerAccountEntity = "customerAccountEntity", // TODO: Check
  customerAccountCreate = "customerAccountCreate", // TODO: Replace startProcess
  customerAccountUpdate = "customerAccountUpdate", // TODO: Replace startProcess

  /// Customer Contacts
  contactEntity = "customerContactEntity", // TODO: Rename
  customerContactEntity = "customerContactEntity",
  customerContactCreate = "customerContactCreate", // TODO: Replace startProcess
  customerContactUpdate = "customerContactUpdate", // TODO: Replace startProcess

  /// Customer Opportunities
  opportunityEntity = "customerOpportunityEntity", // TODO: Obsolete
  customerOpportunityEntity = "customerOpportunityEntity",
  customerOpportunityCreate = "customerOpportunityCreate", // TODO: Replace startProcess
  customerOpportunityUpdate = "customerOpportunityUpdate", // TODO: Replace startProcess

  transitionOpportunityStage = "transitionOpportunityStage",
  saveOpportunityStageConditionStatus='saveOpportunityStageConditionStatus',

  /// Customer Campaigns
  customerCampaignEntity = "customerCampaignEntity",
  customerCampaignCreate = "customerCampaignCreate",
  customerCampaignUpdate = "customerCampaignUpdate",

  /// Customer Activities
  customerActivityEntity = "customerActivityEntity",
  customerActivityCreate = "customerActivityCreate",
  customerActivityUpdate = "customerActivityUpdate",

  /// Customer Documents
  createCustomerDocument = "customerDocumentCreate",
  

  customerTaskEntity = 'customerTaskEntity',
  createCustomerTask = 'customerTaskCreate',


  // Investment Relations

  /// Investment Leads
  investmentLeadEntity = "investmentLeadEntity",
  createInvestmentLead = "investmentLeadCreate",
  updateInvestmentLead = "investmentLeadUpdate",

  /// Investment Accounts
  investmentAccountEntity = "investmentAccountEntity",
  createInvestmentAccount = "investmentAccountCreate",
  updateInvestmentAccount = "investmentAccountUpdate",

  /// Investment Contacts
  investmentContactEntity = "investmentContactEntity",
  createInvestmentContact = "investmentContactCreate",
  updateInvestmentContact = "investmentContactUpdate",

  /// Investment Opportunities
  investmentOpportunityEntity = "investmentOpportunityEntity",
  createInvestmentOpportunity = "investmentOpportunityCreate",
  updateInvestmentOpportunity = "investmentOpportunityUpdate",
  investmentOpportunityStageTransition = "investmentOpportunityStageTransition",


  /// Investment Activities

  investmentActivityEntity = "investmentActivityEntity",
  createInvestmentActivity = "investmentActivityCreate",

  /// Investment Tasks

  investmentTaskEntity = "investmentTaskEntity",
  investmentTaskCreate = "investmentTaskCreate",
  investmentTaskUpdate = "investmentTaskUpdate",
  /// Investment Notes

  investmentNoteEntity = "investmentNoteEntity",
  
  /// Investment Documents
  investmentDocumentEntity = "investmentDocumentEntity",
  investmentDocumentCreate = "investmentDocumentCreate",
  investmentDocumentUpdate = "investmentDocumentUpdate",

  /// Investments
  createInvestment = "investmentCreate", // TODO: Obsolete
  investmentCreate = "investmentCreate", // TODO: Replace startProcess
  investmentEntity = "investmentEntity",

  equityInvestmentEntity = "equityInvestmentEntity", // TODO: Check
  privateEquityInvestmentEntity = "privateEquityInvestmentEntity", // TODO: Check
  realEstateInvestmentEntity = "realEstateInvestmentEntity", // TODO: Check
  liquidFundInvestmentEntity = "liquidFundInvestmentEntity", // TODO: Check

  /// Investment Reports
  investmentReportUpload = "investmentReportUpload",
  investmentReportEntity = "investmentReportEntity", // Integrate


















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

  updateEmployeePersonalData = "updateEmployeePersonalData",
  updateEmployeeAddress = "updateEmployeeAddress",
  updateEmployeeCommunication = "updateEmployeeCommunication",
  updateEmployeeRelationship = "updateEmployeeRelationship",
  updateEmployeeBankAccount = "updateEmployeeBankAccount",
  updateEmployeePicture = "updateEmployeePicture",
  updateEmployeeSkill = "updateEmployeeSkill",
  updateEmployeeWorkingCondition = "updateEmployeeWorkingCondition",
  updateEmployeeWorkingHours = "updateEmployeeWorkingHours",

  createEmployee = "createEmployee",
  createJobPosition = "createJobPosition",

}

export type ContextData = {
  id?: string | null;
  contextDataName: string;
  contextDataType: string;
};

export type Context = {
  id?: string | null;
  contextName: string;
  contextData?: ContextData[] | null;
  contextDataType?: string;
  contextDataName?: string;
  contextId?: string;
  isDeleted?: boolean;
  rank?: number;
};

export type FlowItemReduced = {
  id?: string | null;
  flowName: string;
  flowNameTranslation?: Record<string, string> | string;
  flowType: string;
  context?: Context; // Single context object from API
  contexts?: Context[]; // For backward compatibility
  processName: string;
  domain: string;
  targetDesktop: string;
  targetMobile: string;
  rank?: number;
  builderType?: string;
};

export type GetPermissionFlowItemsV1Params = {
  contexts: FlowContextName[];
};

export type GetPermissionFlowItemsV2Body = {
  contexts: {
    contextName: FlowContextName;
    mainContextDataId: string;
  }[];
};

export type GetMainContextDataBody = {
  contextNames: FlowContextName[];
};

export type GetPermissionFlowItemsResponse = {
  flowItems: FlowItemReduced[];
};

export type GetMainContextDataResponse = {
  contextData: {
    mainContextDataName: string;
    contextName: string;
  }[];
};
