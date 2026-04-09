/**
 * GraphQL query strings for board entity data import.
 *
 * IMPORTANT: Only use fields that are confirmed to exist in the actual
 * Hasura schema. The TypeScript types in this codebase may define fields
 * that don't exist in every environment (CRM vs IRM vs HR schemas differ).
 * When in doubt, use only fields that appear in hardcoded production queries.
 */

export const EMPLOYEE_QUERY = `
query BoardGetEmployees($where: EmployeeBoolExp, $limit: Int, $offset: Int, $orderBy: [EmployeeOrderBy!]) {
  Employee(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    firstName
    lastName
    displayName
    fullName
    code
    userId
    birthDate
    pictureThumbnail
    createdAt
    updatedAt
    communication(where: {isDeleted: {_eq: false}}) {
      value
      purpose
      channel { value code }
    }
    employeePosition {
      jobPosition { id name }
      organizationalUnit { id name }
      supervisor { id displayName }
      costCenter { id name }
    }
    workingCondition(limit: 1, orderBy: {hireDate: DESC_NULLS_LAST}) {
      hireDate
      exitDate
      contractType { value }
      employmentType { value }
    }
    gender { value }
    nationality { value }
  }
  EmployeeAggregate(where: $where) { aggregate { count } }
}`

export const EMPLOYEE_ABSENCE_QUERY = `
query BoardGetAbsences($where: EmployeeAbsenceBoolExp!, $limit: Int!, $offset: Int!, $orderBy: [EmployeeAbsenceOrderBy!]) {
  EmployeeAbsence(where: $where, offset: $offset, limit: $limit, orderBy: $orderBy) {
    id
    startDate
    endDate
    status
    calendarDays
    effectiveDays
    createdAt
    type { id value }
    employee {
      id firstName lastName displayName
      employeePosition { organizationalUnit { id name } }
    }
  }
  EmployeeAbsenceAggregate(where: $where) { aggregate { count } }
}`

export const ACCOUNT_QUERY = `
query BoardGetAccounts($where: AccountBoolExp, $limit: Int, $offset: Int, $orderBy: [AccountOrderBy!]) {
  Account(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    code
    name
    website
    prospective
    foundationDate
    createdAt
    updatedAt
    ownerEmployee { id displayName pictureThumbnail }
    ownerEmployeeId
    accountPriority { value }
    legalForm { value }
  }
  AccountAggregate(where: $where) { aggregate { count } }
}`

export const CONTACT_QUERY = `
query BoardGetContacts($where: ContactBoolExp, $limit: Int, $offset: Int, $orderBy: [ContactOrderBy!]) {
  Contact(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    code
    firstName
    lastName
    department
    jobTitle
    contactType
    createdAt
    updatedAt
    ownerEmployee { id displayName pictureThumbnail }
    ownerEmployeeId
  }
  ContactAggregate(where: $where) { aggregate { count } }
}`

export const LEAD_QUERY = `
query BoardGetLeads($where: LeadBoolExp, $limit: Int, $offset: Int, $orderBy: [LeadOrderBy!]) {
  Lead(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    code
    firstName
    lastName
    email
    companyName
    companyEmail
    description
    createdAt
    updatedAt
    leadStatus { value }
    leadRating { value }
    leadSource { value }
    ownerEmployee { id displayName pictureThumbnail }
    ownerEmployeeId
  }
  LeadAggregate(where: $where) { aggregate { count } }
}`

export const OPPORTUNITY_QUERY = `
query BoardGetOpportunities($where: OpportunityBoolExp, $limit: Int, $offset: Int, $orderBy: [OpportunityOrderBy!]) {
  Opportunity(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    code
    name
    estimatedAmount
    winningChance
    closeDate
    createdAt
    updatedAt
    currency { code value }
    opportunityStatus { value }
    salesPipeline { value }
    salesPipelineStage { value }
    ownerEmployee { id displayName pictureThumbnail }
    ownerEmployeeId
    company { id name }
    companyId
  }
  OpportunityAggregate(where: $where) { aggregate { count } }
}`

export const SALES_ACTIVITY_QUERY = `
query BoardGetSalesActivities($where: SalesActivityBoolExp, $limit: Int, $offset: Int, $orderBy: [SalesActivityOrderBy!]) {
  SalesActivity(where: $where, offset: $offset, limit: $limit, orderBy: $orderBy) {
    id
    title
    description
    source
    createdAt
    occurredAt
    ownerEmployeeId
    ownerEmployee { fullName pictureThumbnail }
    activityType { value }
    account { name }
    contact { firstName lastName }
    lead { firstName lastName }
    opportunity { name }
  }
  SalesActivityAggregate(where: $where) { aggregate { count } }
}`

export const EXPENSE_REQUEST_QUERY = `
query BoardGetExpenseRequests($where: ExpenseRequestBoolExp, $limit: Int, $offset: Int, $orderBy: [ExpenseRequestOrderBy!]) {
  ExpenseRequest(where: $where, orderBy: $orderBy, limit: $limit, offset: $offset) {
    id
    code
    title
    status
    requestDate
    createdAt
    totalAmount
    startDate
    endDate
    employeeId
    currency { code }
    requestType { value }
    employee {
      id firstName lastName code
      employeePosition {
        costCenter { name }
        organizationalUnit { name }
      }
    }
  }
  ExpenseRequestAggregate(where: $where) { aggregate { count } }
}`

export const EXPENSE_PLAN_QUERY = `
query BoardGetExpensePlans($where: ExpensePlanBoolExp, $limit: Int, $offset: Int, $orderBy: [ExpensePlanOrderBy!]) {
  ExpensePlan(where: $where, orderBy: $orderBy, limit: $limit, offset: $offset) {
    id
    code
    title
    status
    startDate
    endDate
    totalAmount
    createdAt
    currency { code value }
    requestType { value }
    employee {
      id firstName lastName code
      employeePosition { organizationalUnit { name } }
    }
  }
  ExpensePlanAggregate(where: $where) { aggregate { count } }
}`

export const SALES_TASK_QUERY = `
query BoardGetSalesTasks($where: SalesTaskBoolExp, $limit: Int, $offset: Int, $orderBy: [SalesTaskOrderBy!]) {
  SalesTask(where: $where, offset: $offset, limit: $limit, orderBy: $orderBy) {
    id
    code
    name
    description
    dueDate
    startDate
    endDate
    createdAt
    type { value }
    priority { value }
    status { value }
    creatorEmployee { id displayName }
    account { id name }
    contact { id firstName lastName }
    opportunity { id name }
  }
  SalesTaskAggregate(where: $where) { aggregate { count } }
}`

export const SALES_CAMPAIGN_QUERY = `
query BoardGetSalesCampaigns($where: SalesCampaignBoolExp, $limit: Int, $offset: Int, $orderBy: [SalesCampaignOrderBy!]) {
  SalesCampaign(where: $where, offset: $offset, limit: $limit, orderBy: $orderBy) {
    id
    name
    description
    startDate
    endDate
    createdAt
    updatedAt
    typeRef
  }
  SalesCampaignAggregate(where: $where) { aggregate { count } }
}`

export const ASSET_QUERY = `
query BoardGetAssets($where: AssetBoolExp, $limit: Int, $offset: Int, $orderBy: [AssetOrderBy!]) {
  Asset(where: $where, offset: $offset, limit: $limit, orderBy: $orderBy) {
    id
    model
    serialNumber
    acquisitionDate
    warrantyPeriodMonths
    inventoryValue
    assetStatus
    notes
    createdAt
    updatedAt
    currency { code value }
    assetBrand { value }
    assetCategory { value }
    siteLocation { id name }
  }
  AssetAggregate(where: $where) { aggregate { count } }
}`

export const CONTENT_ENTRY_QUERY = `
query BoardGetContentEntries($where: ContentEntryBoolExp, $limit: Int, $offset: Int, $orderBy: [ContentEntryOrderBy!]) {
  ContentEntry(where: $where, offset: $offset, limit: $limit, orderBy: $orderBy) {
    id
    title
    preview
    createdAt
    updatedAt
    contentGroup
    contentType { id name nameI18n }
    language { value }
    creatorEmployee { id displayName }
  }
  ContentEntryAggregate(where: $where) { aggregate { count } }
}`

export const PERFORMANCE_GOAL_QUERY = `
query BoardGetPerformanceGoals($where: EmployeePerformanceGoalBoolExp, $limit: Int, $offset: Int, $orderBy: [EmployeePerformanceGoalOrderBy!]) {
  EmployeePerformanceGoal(where: $where, offset: $offset, limit: $limit, orderBy: $orderBy) {
    id
    title
    status
    progressPercent
    startDate
    dueDate
    completionDate
    employeeId
    createdAt
    updatedAt
  }
  EmployeePerformanceGoalAggregate(where: $where) { aggregate { count } }
}`

export const JOB_POSITION_QUERY = `
query BoardGetJobPositions($where: JobPositionBoolExp, $limit: Int, $offset: Int, $orderBy: [JobPositionOrderBy!]) {
  JobPosition(where: $where, offset: $offset, limit: $limit, orderBy: $orderBy) {
    id
    name
    jobProfile { id name }
    jobFunction { id name }
    jobLevel { id name }
    contractType { value }
    employmentType { value }
  }
  JobPositionAggregate(where: $where) { aggregate { count } }
}`
