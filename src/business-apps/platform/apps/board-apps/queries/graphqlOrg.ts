/**
 * GraphQL query strings for org-chart, recruiting, and benefits entity imports.
 *
 * Separated from graphql.ts to keep files under 300 lines.
 * Only use fields confirmed to exist in the Hasura schema.
 */

export const ORGANIZATIONAL_UNIT_QUERY = `
query BoardGetOrgUnits($where: OrganizationalUnitBoolExp, $limit: Int, $offset: Int, $orderBy: [OrganizationalUnitOrderBy!]) {
  OrganizationalUnit(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    name
    code
    type
    description
    createdAt
    updatedAt
    company { id name }
    companyId
  }
  OrganizationalUnitAggregate(where: $where) { aggregate { count } }
}`

export const MATRIX_UNIT_QUERY = `
query BoardGetMatrixUnits($where: MatrixUnitBoolExp, $limit: Int, $offset: Int, $orderBy: [MatrixUnitOrderBy!]) {
  MatrixUnit(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    name
    description
    rank
    createdAt
    updatedAt
  }
  MatrixUnitAggregate(where: $where) { aggregate { count } }
}`

export const CAPABILITY_QUERY = `
query BoardGetCapabilities($where: CapabilityBoolExp, $limit: Int, $offset: Int, $orderBy: [CapabilityOrderBy!]) {
  Capability(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    name
    description
    createdAt
    updatedAt
  }
  CapabilityAggregate(where: $where) { aggregate { count } }
}`

export const COMPANY_QUERY = `
query BoardGetCompanies($where: CompanyBoolExp, $limit: Int, $offset: Int, $orderBy: [CompanyOrderBy!]) {
  Company(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    name
    code
    description
    commercialRegistrationNumber
    createdAt
    updatedAt
    director { id displayName }
    directorId
    currency { code value }
    currencyRef
  }
  CompanyAggregate(where: $where) { aggregate { count } }
}`

export const SITE_LOCATION_QUERY = `
query BoardGetSiteLocations($where: SiteLocationBoolExp, $limit: Int, $offset: Int, $orderBy: [SiteLocationOrderBy!]) {
  SiteLocation(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    name
    code
    locality
    postalCode
    deskCapacity
    createdAt
    updatedAt
    country { value }
    countryRef
    region { value }
    regionRef
  }
  SiteLocationAggregate(where: $where) { aggregate { count } }
}`

export const COST_CENTER_QUERY = `
query BoardGetCostCenters($where: CostCenterBoolExp, $limit: Int, $offset: Int, $orderBy: [CostCenterOrderBy!]) {
  CostCenter(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    name
    code
    description
    createdAt
    updatedAt
  }
  CostCenterAggregate(where: $where) { aggregate { count } }
}`

export const JOB_CANDIDATE_QUERY = `
query BoardGetJobCandidates($where: JobCandidateBoolExp, $limit: Int, $offset: Int, $orderBy: [JobCandidateOrderBy!]) {
  JobCandidate(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    code
    displayName
    firstName
    lastName
    birthDate
    jobCandidateStatus
    createdAt
    updatedAt
    gender { value }
    nationality { value }
  }
  JobCandidateAggregate(where: $where) { aggregate { count } }
}`

export const JOB_APPLICATION_QUERY = `
query BoardGetJobApplications($where: JobApplicationBoolExp, $limit: Int, $offset: Int, $orderBy: [JobApplicationOrderBy!]) {
  JobApplication(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    applicationDate
    recordState
    createdAt
    updatedAt
    jobApplicationPipeline { value }
    jobApplicationPipelineRef
    jobApplicationStage { value }
    jobApplicationStageRef
    jobCandidate { id displayName }
    jobCandidateId
    jobPosting { id title }
    jobPostingId
  }
  JobApplicationAggregate(where: $where) { aggregate { count } }
}`

export const JOB_POSTING_QUERY = `
query BoardGetJobPostings($where: JobPostingBoolExp, $limit: Int, $offset: Int, $orderBy: [JobPostingOrderBy!]) {
  JobPosting(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    title
    recordState
    createdAt
    updatedAt
    jobApplicationPipeline { value }
  }
  JobPostingAggregate(where: $where) { aggregate { count } }
}`

export const EMPLOYEE_BENEFIT_QUERY = `
query BoardGetEmployeeBenefits($where: EmployeeBenefitBoolExp, $limit: Int, $offset: Int, $orderBy: [EmployeeBenefitOrderBy!]) {
  EmployeeBenefit(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
    id
    benefitStatus
    startDate
    endDate
    employeeMonthlyContribution
    employeeYearlyContribution
    createdAt
    updatedAt
    benefitType { value }
    benefitTypeRef
    benefitProvider { value }
    benefitProviderRef
    currency { code value }
    currencyRef
    employee { id displayName }
    employeeId
  }
  EmployeeBenefitAggregate(where: $where) { aggregate { count } }
}`
