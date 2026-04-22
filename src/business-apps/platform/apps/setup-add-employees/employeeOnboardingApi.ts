import { env } from '@/common/env/EnvUtils'
import { ORGCHART_API_URL } from '@/common/utils/serviceResolver'
import { UserManagementClient } from '@/common/network/users/UserManagementClient'

function orgchartApiRoot(): string {
  return ORGCHART_API_URL.replace(/\/$/, '')
}

/**
 * Orgchart paths are under {@link ORGCHART_API_URL} (`resolveServiceUrl` + `/structures/…`).
 */

function kogitoBase(): string {
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

export async function createBasicEmployeeFlow(
  accessToken: string,
  input: {
    structureId: string
    organizationalUnitId: string
    jobPositionName: string
    firstName: string
    lastName: string
    email: string
  }
): Promise<{ employeeId: string }> {
  const bodyEmployee = {
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

  const jpUrl = `${kogitoBase()}/employee/createBulkJobPosition`
  const jpRes = await fetch(jpUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      basicJobPosition: { name: input.jobPositionName || 'Employee' },
      count: 1
    })
  })
  if (!jpRes.ok) {
    throw new Error(`createBulkJobPosition failed (${jpRes.status})`)
  }
  const jpData = (await jpRes.json()) as {
    jobPositions?: Array<{ id?: string }>
    data?: { jobPositions?: Array<{ id?: string }> }
  }
  const jobPositionId = jpData?.data?.jobPositions?.[0]?.id ?? jpData?.jobPositions?.[0]?.id
  if (!jobPositionId) {
    throw new Error('No job position id returned')
  }

  const assignSlotUrl = `${orgchartApiRoot()}/employee-assignments/organizational-unit`
  const assignSlotRes = await fetch(assignSlotUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify([
      {
        structureId: input.structureId,
        jobPositionId,
        organizationalUnitId: input.organizationalUnitId,
        jobPositionName: input.jobPositionName || 'Employee'
      }
    ])
  })
  if (!assignSlotRes.ok) {
    throw new Error(`Job position assignment failed (${assignSlotRes.status})`)
  }

  const empUrl = `${kogitoBase()}/employee/createBasicEmployee`
  const empRes = await fetch(empUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(bodyEmployee)
  })
  if (!empRes.ok) {
    throw new Error(`createBasicEmployee failed (${empRes.status})`)
  }
  const empData = (await empRes.json()) as { employee?: { id?: string }; data?: { employee?: { id?: string } } }
  const employeeId = empData?.data?.employee?.id ?? empData?.employee?.id
  if (!employeeId) {
    throw new Error('No employee id returned')
  }

  const assignEmpRes = await fetch(assignSlotUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify([
      {
        structureId: input.structureId,
        organizationalUnitId: input.organizationalUnitId,
        employeeId,
        jobPositionId
      }
    ])
  })
  if (!assignEmpRes.ok) {
    throw new Error(`Employee assignment failed (${assignEmpRes.status})`)
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
    const resp = await client.getUsers({ searchParam, limit: 20, offset: 0 })
    const match = resp.data?.find(u => matchesEmailQuery(u, normalized))
    if (match?.id) {
      return match.id
    }
    if (attempt < maxAttempts - 1) {
      await delay(delayBetweenMs)
    }
  }

  return null
}

export async function setInitialPassword(accessToken: string, userId: string, password: string): Promise<void> {
  const client = new UserManagementClient()
  client.setAccessToken(accessToken)
  await client.upsertUserPassword(userId, { password })
}
