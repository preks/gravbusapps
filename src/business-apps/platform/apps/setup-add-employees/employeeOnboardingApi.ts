import { env } from '@/common/env/EnvUtils'
import { ORGCHART_API_URL } from '@/common/utils/serviceResolver'
import { UserManagementClient } from '@/common/network/users/UserManagementClient'
import type { GetUsersResponse, User } from '@/common/network/users/types'
import { decodeAccessTokenSub } from '@/common/utils/decodeJwtSub'

function orgchartApiRoot(): string {
  return ORGCHART_API_URL.replace(/\/$/, '')
}

/**
 * Orgchart paths are under {@link ORGCHART_API_URL} (`resolveServiceUrl` + `/structures/…`).
 */

/** Kogito employee processes base (same host/path family as `createBasicEmployee`, `createBulkJobPosition`, `saveEmployee`). */
export function kogitoProcessesBaseUrl(): string {
  const u = env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') ?? ''
  return u.replace(/\/$/, '')
}

type NodeLike = {
  id?: string
  type?: string
  data?: {
    organizationalUnitData?: { organizationUnitId?: string; name?: string; type?: string }
  }
  parentNode?: string
}

export type OrgUnitOption = { id: string; name: string }

function collectOrgUnits(nodes: NodeLike[]): OrgUnitOption[] {
  const out: OrgUnitOption[] = []
  for (const n of nodes) {
    const ou = n.data?.organizationalUnitData
    if (ou?.organizationUnitId && ou.name) {
      out.push({ id: ou.organizationUnitId, name: ou.name })
    }
  }
  const seen = new Set<string>()
  return out.filter(o => {
    if (seen.has(o.id)) return false
    seen.add(o.id)
    return true
  })
}

export async function fetchStructureOrgUnits(structureId: string, accessToken: string): Promise<OrgUnitOption[]> {
  const url = `${orgchartApiRoot()}/structures/${encodeURIComponent(structureId)}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to load structure (${response.status})`)
  }
  const data = (await response.json()) as { nodes?: NodeLike[] }
  return collectOrgUnits(data.nodes ?? [])
}

export async function assignEmployeeToCompany(
  accessToken: string,
  input: {
    structureId: string
    employeeId: string
    companyId: string
    companyName: string
  }
): Promise<void> {
  const url = `${orgchartApiRoot()}/employee-assignments/company`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify([
      {
        structureId: input.structureId,
        employeeId: input.employeeId,
        companyId: input.companyId,
        companyName: input.companyName
      }
    ])
  })
  if (!res.ok) {
    throw new Error(`Company assignment failed (${res.status})`)
  }
}

/** Kogito output per employees.yaml CreateBulkJobPositionModelOutput (same shape as platform setup). */
type CreateJobPositionResponse = {
  jobPositions?: Array<{ id?: string }>
  data?: { jobPositions?: Array<{ id?: string }> }
}

/** Orgchart POST employee-assignments/organizational-unit response (OpenAPI list item may echo jobPositionId). */
type AssignEmployeesResponse = Array<{ jobPositionId?: string }>

/** Creates one job position via Kogito; returns its id (used by add-employee and edit-employee). */
export async function createSingleJobPositionByName(accessToken: string, jobPositionName: string): Promise<string> {
  const jpUrl = `${kogitoProcessesBaseUrl()}/employee/createBulkJobPosition`
  const jpRes = await fetch(jpUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      basicJobPosition: { name: jobPositionName || 'Employee' },
      count: 1
    })
  })
  if (!jpRes.ok) {
    throw new Error(`createBulkJobPosition failed (${jpRes.status})`)
  }
  const jpData = (await jpRes.json()) as CreateJobPositionResponse
  const jobPositionId = jpData?.data?.jobPositions?.[0]?.id ?? jpData?.jobPositions?.[0]?.id
  if (!jobPositionId) {
    throw new Error('No job position id returned')
  }
  return jobPositionId
}

/**
 * Mirrors gravity-platform `src/lib/modules/setup/server/orchestrate-setup.ts` → `createAndAssignJobPosition`:
 * Kogito `createBulkJobPosition`, then orgchart slot POST (no employeeId).
 */
async function createAndAssignJobPosition(
  accessToken: string,
  structureId: string,
  jobPositionName: string,
  organizationalUnitId: string
): Promise<string> {
  const resolvedName = jobPositionName || 'Employee'
  const jobPositionId = await createSingleJobPositionByName(accessToken, resolvedName)

  const url = `${orgchartApiRoot()}/employee-assignments/organizational-unit`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify([
      {
        structureId,
        jobPositionId,
        organizationalUnitId,
        jobPositionName: resolvedName
      }
    ])
  })
  if (!res.ok) {
    throw new Error(`Job position assignment failed (${res.status})`)
  }
  const assignmentResponse = (await res.json()) as AssignEmployeesResponse
  return assignmentResponse?.[0]?.jobPositionId ?? jobPositionId
}

/** Same payload as gravity-platform `orchestrate-setup.ts` → `createEmployee`. */
async function createEmployeeCreateBasic(
  accessToken: string,
  input: {
    firstName: string
    lastName: string
    email: string
  }
): Promise<string> {
  const body = {
    basicEmployee: {
      businessPartnerPerson: {
        firstName: input.firstName,
        lastName: input.lastName,
        picture: null
      },
      communication: [
        {
          purpose: 'INTERNAL',
          typeRef: 'CommunicationType:v1:1',
          channelRef: 'CommunicationChannel:v1:e-mail',
          value: input.email,
          valueExtension: 'string'
        },
        {
          purpose: 'PRIVATE',
          typeRef: 'CommunicationType:v1:1',
          channelRef: 'CommunicationChannel:v1:Mobile',
          value: '',
          valueExtension: 'string'
        }
      ],
      workingCondition: {
        contractType: null,
        employmentType: null
      },
      pictureThumbnail: null
    },
    createUser: true
  }

  const empUrl = `${kogitoProcessesBaseUrl()}/employee/createBasicEmployee`
  const empRes = await fetch(empUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!empRes.ok) {
    throw new Error(`createBasicEmployee failed (${empRes.status})`)
  }
  const empData = (await empRes.json()) as { employee?: { id?: string }; data?: { employee?: { id?: string } } }
  const employeeId = empData?.data?.employee?.id ?? empData?.employee?.id
  if (!employeeId) {
    throw new Error('Failed to create employee')
  }
  return employeeId
}

/** Mirrors gravity-platform `orchestrate-setup.ts` → `assignEmployeeToDepartment`. */
async function assignEmployeeToDepartment(
  accessToken: string,
  structureId: string,
  employeeId: string,
  jobPositionId: string,
  organizationalUnitId: string,
  organizationalUnitRole?: 'Manager'
): Promise<void> {
  const body: Record<string, string> = {
    structureId,
    organizationalUnitId,
    employeeId,
    jobPositionId
  }
  if (organizationalUnitRole) {
    body.role = organizationalUnitRole
  }
  const url = `${orgchartApiRoot()}/employee-assignments/organizational-unit`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify([body])
  })
  if (!res.ok) {
    throw new Error(`Employee assignment failed (${res.status})`)
  }
}

/**
 * People / setup-add-employees onboarding: same sequence as Gravity Platform setup
 * (`orchestrate-setup.ts` → `createAndAssignCurrentUser` / `createAndAssignAdditionalEmployee`):
 * 1. `createAndAssignJobPosition` — Kogito job position + orgchart OU slot (no employeeId)
 * 2. `createEmployee` — `employee/createBasicEmployee` with `createUser: true`
 * 3. `assignEmployeeToDepartment` — orgchart OU assignment with employeeId + jobPositionId
 *
 * Does not call company or capability assignments (not used in People).
 */
export async function createBasicEmployeeFlow(
  accessToken: string,
  input: {
    structureId: string
    organizationalUnitId: string
    jobPositionName: string
    firstName: string
    lastName: string
    email: string
    /** When set, OU assignment includes org-chart Manager role (setup passes `organizationalUnitRole: 'Manager'`). */
    assignManagerRole?: boolean
    /** When set, assigns the employee to this company after OU flow succeeds (optional; platform add-employee UI omits this). */
    companyId?: string
    companyName?: string
  }
): Promise<{ employeeId: string }> {
  const assignedJobPositionId = await createAndAssignJobPosition(
    accessToken,
    input.structureId,
    input.jobPositionName || 'Employee',
    input.organizationalUnitId
  )

  const employeeId = await createEmployeeCreateBasic(accessToken, {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim()
  })

  await assignEmployeeToDepartment(
    accessToken,
    input.structureId,
    employeeId,
    assignedJobPositionId,
    input.organizationalUnitId,
    input.assignManagerRole ? 'Manager' : undefined
  )

  if (input.companyId?.trim() && input.companyName?.trim()) {
    await assignEmployeeToCompany(accessToken, {
      structureId: input.structureId,
      employeeId,
      companyId: input.companyId.trim(),
      companyName: input.companyName.trim()
    })
  }

  return { employeeId }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

function matchesEmailQuery(
  u: { email?: string | null; preferredUsername?: string | null },
  normalizedEmail: string
): boolean {
  return u.email?.toLowerCase() === normalizedEmail || u.preferredUsername?.toLowerCase() === normalizedEmail
}

/** Upper bound per `getUsers` call (see {@link RestClient} — no default fetch timeout). */
const USER_MANAGEMENT_EMAIL_LOOKUP_TIMEOUT_MS = 15_000

async function getUsersForEmailLookupWithTimeout(
  client: UserManagementClient,
  searchParam: string
): Promise<GetUsersResponse> {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), USER_MANAGEMENT_EMAIL_LOOKUP_TIMEOUT_MS)
  try {
    return await client.getUsers({ searchParam, limit: 20, offset: 0 }, { signal: controller.signal })
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}

/**
 * Single User Management search (no polling). Matches the same email / preferred-username rules as
 * {@link resolveUserIdByEmail} and employee flows that align Keycloak preferred username with employee email.
 */
export async function findUserManagementUserMatchingEmployeeEmail(
  accessToken: string,
  email: string
): Promise<User | null> {
  const normalized = email.trim().toLowerCase()
  const searchParam = email.trim()
  if (!normalized) return null

  const client = new UserManagementClient()
  client.setAccessToken(accessToken)

  const resp = await getUsersForEmailLookupWithTimeout(client, searchParam)
  const match = resp.data?.find(u => matchesEmailQuery(u, normalized))
  return match ?? null
}

/**
 * Resolves User Management `userId` for an email. After `createUser` from employee flows, Keycloak often has the
 * account before this service’s search index returns the user — poll with backoff instead of failing on first empty result.
 */
export async function resolveUserIdByEmail(accessToken: string, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase()
  const searchParam = email.trim()
  if (!normalized) return null

  const client = new UserManagementClient()
  client.setAccessToken(accessToken)

  const maxAttempts = 15
  const delayBetweenMs = 1000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const resp = await getUsersForEmailLookupWithTimeout(client, searchParam)
      const match = resp.data?.find(u => matchesEmailQuery(u, normalized))
      if (match?.id) {
        return match.id
      }
    } catch {
      // Timeout or transient error — same backoff as waiting for the search index.
    }
    if (attempt < maxAttempts - 1) {
      await delay(delayBetweenMs)
    }
  }

  return null
}

export async function setInitialPassword(accessToken: string, userId: string, password: string): Promise<void> {
  const actorUserId = decodeAccessTokenSub(accessToken)
  const selfReset = Boolean(actorUserId && actorUserId === userId)
  const temporary = !selfReset

  if (temporary) {
    console.info(
      '[UserManagement]',
      JSON.stringify({
        message: 'Password reset (user will pick a new password at next sign-in)',
        actorUserId: actorUserId ?? '(unknown)',
        targetUserId: userId
      })
    )
  } else {
    console.info(
      '[UserManagement]',
      JSON.stringify({
        message: 'Password change for your own account (saved as your regular password)',
        actorUserId: actorUserId ?? '(unknown)',
        targetUserId: userId
      })
    )
  }

  const client = new UserManagementClient()
  client.setAccessToken(accessToken)
  await client.upsertUserPassword(userId, { password, temporary })
}
