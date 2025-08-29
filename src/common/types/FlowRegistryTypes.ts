export enum FlowContextName {
  employeeEntity = "employeeEntity",
  jobPositionEntity = "jobPositionEntity",
  leadEntity = "leadEntity",
  accountEntity = "accountEntity",
  contactEntity = "contactEntity",
  opportunityEntity = "opportunityEntity",
  updateOpportunity = "updateOpportunity",
  // Investment Relations
  investmentLeadEntity = "investmentLeadEntity",
  createInvestmentLead = "createInvestmentLead",
  updateInvestmentLead = "updateInvestmentLead",

  investmentAccountEntity = "investmentAccountEntity",
  createInvestmentAccount = "createInvestmentAccount",
  updateInvestmentAccount = "updateInvestmentAccount",

  investmentContactEntity = "investmentContactEntity",
  createInvestmentContact = "createInvestmentContact",
  updateInvestmentContact = "updateInvestmentContact",

  investmentOpportunityEntity = "investmentOpportunityEntity",
  createInvestmentOpportunity = "createInvestmentOpportunity",
  updateInvestmentOpportunity = "updateInvestmentOpportunity",

  investmentTaskEntity = "investmentTaskEntity",
  investmentActivityEntity = "investmentActivityEntity",
  investmentNoteEntity = "investmentNoteEntity",
  investmentDocumentEntity = "investmentDocumentEntity",
  uploadInvestmentReport = "uploadInvestmentReport",

  createInvestment = "createInvestment",
  investmentEntity = "investmentEntity",

  equityInvestmentEntity = "equityInvestmentEntity",
  privateEquityInvestmentEntity = "privateEquityInvestmentEntity",
  realEstateInvestmentEntity = "realEstateInvestmentEntity",
  liquidFundInvestmentEntity = "liquidFundInvestmentEntity",
  expenseItems = 'expenseItems',
  expensePlans = 'expensePlans',
  expenseRequests = 'expenseRequests',
  advancePayments = 'advancePayments',
  employeeExpenses = 'employeeExpenses',
  catalog = 'catalog',
  flow = 'flow',
  flowEntity = 'flowEntity',
  flowInstance = 'flowInstance',
  taskInstance = 'taskInstance',
  documentPersonal = 'documentPersonal',
  employeeAbsenceRecord = 'employeeAbsenceRecord',
  employeePerformanceGoal = 'employeePerformanceGoal',
  employeeGiveFeedback = 'employeeGiveFeedback',
  employeeRequestFeedback = 'employeeRequestFeedback',
  employeeSkills = 'employeeSkills',
  employeeProfilePicture = 'employeeProfilePicture',
  saveOpportunityStageConditionStatus='saveOpportunityStageConditionStatus',
  updateEmployeePersonalData = "updateEmployeePersonalData",
  updateEmployeeAddress = "updateEmployeeAddress",
  updateEmployeeCommunication = "updateEmployeeCommunication",
  updateEmployeeRelationship = "updateEmployeeRelationship",
  updateEmployeeBankAccount = "updateEmployeeBankAccount",
  updateEmployeePicture = "updateEmployeePicture",
  updateEmployeeSkill = "updateEmployeeSkill",
  updateEmployeeWorkingCondition = "updateEmployeeWorkingCondition",
  updateEmployeeWorkingHours = "updateEmployeeWorkingHours",
  updateAccount = "updateAccount",
  transitionOpportunityStage = "transitionOpportunityStage",
  createEmployee = "createEmployee",
  createJobPosition = "createJobPosition",
  createCustomerDocument = "createCustomerDocument",
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
