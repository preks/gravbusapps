import { ORGCHART_API_URL } from '@/common/utils/serviceResolver'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { RestClient, type RequestOptions } from '../rest/RestClient'

type OrgchartQueryParams = Record<string, string | number | boolean>

function mergeRequestOptions(
  params?: OrgchartQueryParams,
  options: RequestOptions = {}
): Omit<RequestOptions, 'body'> & { params?: OrgchartQueryParams } {
  return {
    ...options,
    params
  }
}

export class OrgchartClient extends RestClient {
  constructor() {
    super(ORGCHART_API_URL, {})
  }

  getActiveStructureId(): string {
    const id = getCurrentActiveStructureId()
    if (!id) {
      throw new Error(
        '[OrgchartClient] No active structure ID available. ' +
          'Ensure window.lowcoder.activeStructureId or platformContext.structureId is set.'
      )
    }
    return id
  }

  private resolveStructureId(structureId: string | undefined): string {
    return structureId ?? this.getActiveStructureId()
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers.Authorization = setAccessTokenToAuthorizationHeader(accessToken)
  }

  getStructuresActive<T = any>(params?: OrgchartQueryParams, options: RequestOptions = {}) {
    return this.get<T>('/structures/active', mergeRequestOptions(params, options))
  }

  getStructure<T = any>(structureId: string | undefined, params?: OrgchartQueryParams, options: RequestOptions = {}) {
    const id = this.resolveStructureId(structureId)
    return this.get<T>(`/structures/${id}`, mergeRequestOptions(params, options))
  }

  getCompanies<T = any>(params?: OrgchartQueryParams, options: RequestOptions = {}) {
    return this.get<T>('/companies', mergeRequestOptions(params, options))
  }

  updateCompany<T = any>(companyId: string, body: unknown, options: RequestOptions = {}) {
    return this.put<T>(`/companies/${companyId}`, body, options)
  }

  createCompanyNode<T = any>(structureId: string | undefined, body: unknown, options: RequestOptions = {}) {
    const id = this.resolveStructureId(structureId)
    return this.post<T>(`/nodes/${id}`, body, options)
  }

  updateCompanyEdges<T = any>(operationsBody: unknown, params?: OrgchartQueryParams, options: RequestOptions = {}) {
    return this.post<T>('/edges/operations', operationsBody, mergeRequestOptions(params, options))
  }

  deleteCompany<T = any>(companyId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/companies/${companyId}`, options)
  }

  getOrganizationalUnits<T = any>(params?: OrgchartQueryParams, options: RequestOptions = {}) {
    return this.get<T>('/organizational-units', mergeRequestOptions(params, options))
  }

  createOrganizationalUnitNode<T = any>(structureId: string | undefined, body: unknown, options: RequestOptions = {}) {
    const id = this.resolveStructureId(structureId)
    return this.post<T>(`/nodes/${id}`, body, options)
  }

  updateOrganizationalUnitNode<T = any>(structureId: string | undefined, body: unknown, options: RequestOptions = {}) {
    const id = this.resolveStructureId(structureId)
    return this.put<T>(`/nodes/${id}`, body, options)
  }

  deleteOrganizationalUnit<T = any>(organizationalUnitId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/organizational-units/${organizationalUnitId}`, options)
  }

  getMatrixUnits<T = any>(params?: OrgchartQueryParams, options: RequestOptions = {}) {
    return this.get<T>('/matrix-units', mergeRequestOptions(params, options))
  }

  createMatrixUnit<T = any>(body: unknown, options: RequestOptions = {}) {
    return this.post<T>('/matrix-units', body, options)
  }

  updateMatrixUnit<T = any>(matrixUnitId: string, body: unknown, options: RequestOptions = {}) {
    return this.put<T>(`/matrix-units/${matrixUnitId}`, body, options)
  }

  deleteMatrixUnit<T = any>(matrixUnitId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/matrix-units/${matrixUnitId}`, options)
  }

  getSiteLocations<T = any>(params?: OrgchartQueryParams, options: RequestOptions = {}) {
    return this.get<T>('/site-locations', mergeRequestOptions(params, options))
  }

  createSiteLocation<T = any>(body: unknown, options: RequestOptions = {}) {
    return this.post<T>('/site-locations', body, options)
  }

  updateSiteLocation<T = any>(siteLocationId: string, body: unknown, options: RequestOptions = {}) {
    return this.put<T>(`/site-locations/${siteLocationId}`, body, options)
  }

  deleteSiteLocation<T = any>(siteLocationId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/site-locations/${siteLocationId}`, options)
  }

  getCostCenters<T = any>(params?: OrgchartQueryParams, options: RequestOptions = {}) {
    return this.get<T>('/cost-centers', mergeRequestOptions(params, options))
  }

  updateCostCenter<T = any>(costCenterId: string, body: unknown, options: RequestOptions = {}) {
    return this.put<T>(`/cost-centers/${costCenterId}`, body, options)
  }

  createCostCenterNode<T = any>(structureId: string | undefined, body: unknown, options: RequestOptions = {}) {
    const id = this.resolveStructureId(structureId)
    return this.post<T>(`/nodes/${id}`, body, options)
  }

  deleteCostCenter<T = any>(costCenterId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/cost-centers/${costCenterId}`, options)
  }

  getEmployeesCostCenters<T = any>(costCenterId: string, options: RequestOptions = {}) {
    return this.get<T>(`/employees/cost-centers/${costCenterId}`, options)
  }

  getCapabilities<T = any>(params?: OrgchartQueryParams, options: RequestOptions = {}) {
    return this.get<T>('/capabilities', mergeRequestOptions(params, options))
  }

  getCapabilityLayers<T = any>(params?: OrgchartQueryParams, options: RequestOptions = {}) {
    return this.get<T>('/capabilities/layers', mergeRequestOptions(params, options))
  }

  getCapabilityGroups<T = any>(params?: OrgchartQueryParams, options: RequestOptions = {}) {
    return this.get<T>('/capabilities/groups', mergeRequestOptions(params, options))
  }

  createCapability<T = any>(body: unknown, options: RequestOptions = {}) {
    return this.post<T>('/capabilities', body, options)
  }

  updateCapability<T = any>(capabilityId: string, body: unknown, options: RequestOptions = {}) {
    return this.put<T>(`/capabilities/${capabilityId}`, body, options)
  }

  deleteCapability<T = any>(capabilityId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/capabilities/${capabilityId}`, options)
  }

  getProjects<T = any>(params?: OrgchartQueryParams, options: RequestOptions = {}) {
    return this.get<T>('/projects', mergeRequestOptions(params, options))
  }

  createProject<T = any>(body: unknown, options: RequestOptions = {}) {
    return this.post<T>('/projects', body, options)
  }

  updateProject<T = any>(projectId: string, body: unknown, options: RequestOptions = {}) {
    return this.put<T>(`/projects/${projectId}`, body, options)
  }

  deleteProject<T = any>(projectId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/projects/${projectId}`, options)
  }

  assignEmployeesToMatrixUnit<T = any>(assignmentsBody: unknown, options: RequestOptions = {}) {
    return this.post<T>('/employee-assignments/matrix-unit', assignmentsBody, options)
  }

  updateMatrixUnitEmployeeAssignment<T = any>(assignmentId: string, body: unknown, options: RequestOptions = {}) {
    return this.put<T>(`/employee-assignments/matrix-unit/${assignmentId}`, body, options)
  }

  deleteMatrixUnitEmployeeAssignment<T = any>(assignmentId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/employee-assignments/matrix-unit/${assignmentId}`, options)
  }

  assignEmployeesToOrganizationalUnit<T = any>(assignmentsBody: unknown, options: RequestOptions = {}) {
    return this.post<T>('/employee-assignments/organizational-unit', assignmentsBody, options)
  }

  createGeoZone<T = any>(body: unknown, options: RequestOptions = {}) {
    return this.post<T>('/geo-zones', body, options)
  }

  updateGeoZone<T = any>(geoZoneId: string, body: unknown, options: RequestOptions = {}) {
    return this.put<T>(`/geo-zones/${geoZoneId}`, body, options)
  }

  deleteGeoZone<T = any>(geoZoneId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/geo-zones/${geoZoneId}`, options)
  }
}

export const orgchartClient = new OrgchartClient()
