export const GET_ORG_ENTITLEMENTS_OVERVIEW = `
  query GetOrgEntitlementsOverview(
    $where: EntitlementUsageSnapshotViewBoolExp!
    $offset: Int!
    $limit: Int!
    $orderBy: [EntitlementUsageSnapshotViewOrderBy!]
  ) {
    snapshotRows: EntitlementUsageSnapshotView(
      where: $where
      offset: $offset
      limit: $limit
      orderBy: $orderBy
    ) {
      employeeId
      typeRef
      totalEntitlement
      usedApproved
      usedPending
      remaining
      periodStart
      periodEnd
    }
    snapshotAggregate: EntitlementUsageSnapshotViewAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

export const GET_ENTITLEMENT_EMPLOYEES_BY_IDS = `
  query GetEntitlementEmployeesByIds($employeeIds: [uuid!]!) {
    Employee(where: { _and: [{ id: { _in: $employeeIds } }, { isDeleted: { _eq: false } }] }) {
      id
      firstName
      lastName
      displayName
      pictureThumbnail
      employeePosition {
        organizationalUnit {
          id
          name
        }
        company {
          id
          name
        }
        siteLocation {
          id
          name
        }
      }
    }
  }
`

export const GET_ENTITLEMENT_ABSENCE_TYPES_BY_IDS = `
  query GetEntitlementAbsenceTypesByIds($typeRefs: [String!]!) {
    CatalogEntry(where: { _and: [{ id: { _in: $typeRefs } }, { isDeleted: { _eq: false } }] }) {
      id
      value
      parentEntryId
    }
  }
`

export interface EntitlementUsageSnapshotRow {
  employeeId?: string | null
  typeRef?: string | null
  totalEntitlement?: number | string | null
  usedApproved?: number | string | null
  usedPending?: number | string | null
  remaining?: number | string | null
  periodStart?: string | null
  periodEnd?: string | null
}

const toSnapshotNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null
  }

  const numeric = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(numeric) ? numeric : null
}

export const mapSnapshotRowToOrgEntitlementRow = (row: EntitlementUsageSnapshotRow): OrgEntitlementRow => {
  const total = toSnapshotNumber(row.totalEntitlement)
  const approved = toSnapshotNumber(row.usedApproved)
  const pending = toSnapshotNumber(row.usedPending)
  const remaining = toSnapshotNumber(row.remaining)
  const fallbackRemaining = remaining ?? (total !== null ? Math.max(0, total - (approved ?? 0) - (pending ?? 0)) : null)
  const employeeId = row.employeeId ?? null
  const typeRef = row.typeRef ?? null
  const periodStart = row.periodStart ?? null
  const periodEnd = row.periodEnd ?? null

  return {
    id: [employeeId, typeRef, periodStart, periodEnd].filter(Boolean).join(':') || 'snapshot-row',
    employeeId,
    total,
    approved,
    pending,
    available: fallbackRemaining,
    remaining: fallbackRemaining,
    validFrom: periodStart,
    validTo: periodEnd,
    typeRef,
    type: typeRef ? { id: typeRef, value: typeRef } : null,
    employee: null
  }
}

export interface OrgEntitlementRow {
  id: string
  employeeId?: string | null
  total?: number | null
  available?: number | null
  remaining?: number | null
  approved?: number | null
  pending?: number | null
  validFrom?: string | null
  validTo?: string | null
  typeRef?: string | null
  type?: { id: string; value: string; parentEntryId?: string | null } | null
  employee?: {
    id: string
    firstName: string
    lastName: string
    displayName?: string | null
    pictureThumbnail?: string | null
    employeePosition?: {
      organizationalUnit?: { id: string; name: string } | null
      company?: { id: string; name: string } | null
      siteLocation?: { id: string; name: string } | null
    } | null
  } | null
}
