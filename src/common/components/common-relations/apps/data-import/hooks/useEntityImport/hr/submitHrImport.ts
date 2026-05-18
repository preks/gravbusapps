/**
 * HR (employee) submission strategy.
 *
 * Flowbot's `extract-from-file` endpoint already returns the canonical Java
 * payload shape — see the HR Employee `ImportProfile`:
 * `{ employee: { code, firstName, lastName, communication: [], workingCondition: [] },
 *    assignment: { organizationalUnitId, organizationalUnitName, managerCode, ... } }`.
 *
 * This strategy is therefore a thin POSTer. The new BE endpoint that wraps
 * `EmployeeImportService.saveListOfEmployees` + the orgchart-service
 * `POST /employee-assignments/organizational-unit` calls is owned by the
 * backend team. Until they confirm the operation name, we POST to a single
 * named constant gated behind a TODO so we can ship the FE behind a feature
 * flag.
 *
 * See https://newwork-dev.newwork.com/processes/employee/swagger-ui/index.html
 *   #/import-list-of-employees-resource/createResource_importListOfEmployees
 */

import type { ImportConfig, ImportResult } from '@/common/components/common-relations/apps/data-import/types'
import { extractErrorMessage } from '../shared'
import type { ImportSubmissionContext, ImportSubmissionStrategy } from '../types'

/**
 * Path for the new BE endpoint that takes the canonical
 * `{ employee, assignment }` payload, creates/updates `Employee` records,
 * triggers `createUser`, and writes the orgchart assignment in one shot.
 *
 * TODO(BE): replace with the final operation name once the backend ticket
 * lands (sibling of `importListOfEmployees`). Tracked in AIML-XXX.
 */
export const HR_EMPLOYEE_IMPORT_ENDPOINT = '/processes/employee/importListOfEmployeesWithAssignment'

interface HrImportRequestBody {
  employees: Record<string, any>[]
  /** Forwarded to `EmployeeImportService` so it triggers `employee.createUser`. */
  createUser: boolean
}

/**
 * The generic ``useEntityImport.importToBackend`` machinery decorates every
 * record with ``ownerEmployee`` / ``salesCampaign`` because that's how CRM &
 * IRM imports attribute ownership. Those keys have no semantics for HR
 * Employee imports (an employee doesn't own themselves), and a strict
 * Kogito JSON schema may reject them.  Strip them just before POST so the
 * payload we send matches the canonical
 * ``{ employee, assignment, additionalProperties }`` shape exactly.
 */
function stripCrmOwnershipFields(entity: Record<string, any>): Record<string, any> {
  const rest: Record<string, any> = { ...entity }
  delete rest.ownerEmployee
  delete rest.ownerEmployeeId
  delete rest.salesCampaign
  return rest
}

function processHrImportResponse(response: any, requestSize: number): ImportResult {
  const hasErrors = response?.validationResponse?.errors?.length > 0
  const errors = hasErrors
    ? response.validationResponse.errors.map((err: any, idx: number) => ({
        rowIndex: idx,
        entityData: {},
        error: `${err.code || 'ERROR'}: ${err.detail || err.title || 'Unknown error'}`
      }))
    : []

  const employeeCodesAndIds =
    response?.employeeCodesAndIds && typeof response.employeeCodesAndIds === 'object'
      ? response.employeeCodesAndIds
      : {}
  const createdIds = Object.values(employeeCodesAndIds).filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  )

  const successCount =
    typeof response?.successCount === 'number'
      ? response.successCount
      : createdIds.length || (hasErrors ? 0 : requestSize)

  return {
    success: !hasErrors && successCount > 0,
    successCount,
    errorCount: errors.length,
    errors,
    createdIds: createdIds.length > 0 ? createdIds : undefined
  }
}

async function submit(entities: Record<string, any>[], ctx: ImportSubmissionContext): Promise<ImportResult> {
  const { restClient, accessToken } = ctx
  const body: HrImportRequestBody = {
    employees: entities.map(stripCrmOwnershipFields),
    createUser: true
  }
  const response = await restClient.post(HR_EMPLOYEE_IMPORT_ENDPOINT, body, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return processHrImportResponse(response, entities.length)
}

function normalizeHrImportError(error: unknown): string | undefined {
  const base = extractErrorMessage(error)
  if (/not\s+found/i.test(base) && /endpoint|route|operation/i.test(base)) {
    return `Import failed: backend HR import endpoint is not yet available (${HR_EMPLOYEE_IMPORT_ENDPOINT}).`
  }
  return undefined
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for parity with createCrm/IrmImportStrategy and future per-config behaviour
export function createHrImportStrategy(_config: ImportConfig): ImportSubmissionStrategy {
  return {
    submit,
    normalizeError: normalizeHrImportError
  }
}
