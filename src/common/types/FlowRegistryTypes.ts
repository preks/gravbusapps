export enum FlowContextName {
    employeeEntity = 'employeeEntity',
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
    flowNameTranslation?: Record<string, string>;
    flowType: string;
    contexts: Context[];
    processName: string;
    domain: string;
    targetDesktop: string;
    targetMobile: string;
    rank?: number;
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