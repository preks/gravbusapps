import { buildInvestmentCompanyPayload } from '@/common/data/investment/types/investmentCompanyTypes'
import {
  investmentCompanyGroupAssociationFormFields,
  investmentCompanyOwnershipFormFields,
  investmentCompanyExecutiveFormFields
} from '@/common/data/investment/types/investmentCompanyAssociationTypes'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import {
  normalizeEntityForImport,
  resolveOwnerEmployeeId,
  stripEmptyValues
} from '@/common/components/common-relations/apps/data-import/hooks/useEntityImport/shared'
import type {
  InvestmentCompanyOwnershipUpdate,
  InvestmentCompanyExecutiveUpdate
} from '@/common/components/common-relations/apps/data-import/types'

export function toInvestmentCompanyPayload(entity: Record<string, any>, ownerEmployeeId?: string): Record<string, any> {
  const normalized = normalizeEntityForImport(entity)
  const resolvedOwnerEmployeeId = resolveOwnerEmployeeId(normalized, ownerEmployeeId)
  const investmentCompanyGroupRef =
    typeof normalized.investmentCompanyGroupRef === 'string' ? normalized.investmentCompanyGroupRef : undefined

  const companyPayload = buildInvestmentCompanyPayload(stripEmptyValues(normalized)).investmentCompany as Record<
    string,
    any
  >

  if (resolvedOwnerEmployeeId) {
    companyPayload.ownerEmployee = resolvedOwnerEmployeeId
  }

  if (investmentCompanyGroupRef) {
    companyPayload.investmentCompanyGroupAssociation = [
      buildPayload(
        {
          investmentCompanyGroupId: investmentCompanyGroupRef
        },
        investmentCompanyGroupAssociationFormFields
      )
    ]
  }

  return stripEmptyValues(companyPayload)
}

function getCreatedCompanyIdByName(
  createdCompanies: Record<string, any>[],
  sourceEntities: Record<string, any>[]
): Map<string, string> {
  const idByName = new Map<string, string>()

  createdCompanies.forEach((company, index) => {
    const id = typeof company.id === 'string' ? company.id : undefined
    const sourceName = sourceEntities[index]?.name
    const responseName = company.name
    const name = typeof responseName === 'string' ? responseName : sourceName

    if (id && typeof name === 'string' && name) {
      idByName.set(name.trim().toLocaleLowerCase(), id)
    }
  })

  return idByName
}

function getCompanyIdFromUpdate(
  update: InvestmentCompanyOwnershipUpdate,
  idByName: Map<string, string>
): string | undefined {
  if (update.companyId) return update.companyId
  if (!update.companyName) return undefined
  return idByName.get(update.companyName.trim().toLocaleLowerCase())
}

interface ResolvedRelationshipCompany {
  id: string
  percentage?: number
}

function getRelationshipCompanies(
  names: string[],
  ids: string[],
  percentages: (number | null)[] | undefined,
  idByName: Map<string, string>
): ResolvedRelationshipCompany[] {
  const resolved: ResolvedRelationshipCompany[] = []

  names.forEach((name, index) => {
    const id = ids[index] || idByName.get(name.trim().toLocaleLowerCase())
    if (!id) return

    const rawPercentage = percentages?.[index]
    const percentage = typeof rawPercentage === 'number' && !Number.isNaN(rawPercentage) ? rawPercentage : undefined

    resolved.push({ id, percentage })
  })

  return resolved
}

export function toInvestmentCompanyOwnershipPayloads(
  ownershipUpdates: InvestmentCompanyOwnershipUpdate[],
  createdCompanies: Record<string, any>[],
  sourceEntities: Record<string, any>[]
): Record<string, any>[] {
  const idByName = getCreatedCompanyIdByName(createdCompanies, sourceEntities)
  const ownerships: Record<string, any>[] = []
  const seen = new Set<string>()

  ownershipUpdates.forEach(update => {
    const companyId = getCompanyIdFromUpdate(update, idByName)
    if (!companyId) return

    const ownerCompanies = getRelationshipCompanies(
      update.ownerCompanyNames,
      update.ownerCompanyIds,
      update.ownerCompanyPercentages,
      idByName
    )
    ownerCompanies.forEach(({ id: ownerCompanyId, percentage }) => {
      const key = `${companyId}:${ownerCompanyId}`
      if (seen.has(key) || companyId === ownerCompanyId) return
      seen.add(key)
      ownerships.push(
        stripEmptyValues(
          buildPayload(
            {
              investmentCompanyId: companyId,
              ownerInvestmentCompanyId: ownerCompanyId,
              percentage
            },
            investmentCompanyOwnershipFormFields
          )
        )
      )
    })

    const ownedCompanies = getRelationshipCompanies(
      update.ownedCompanyNames,
      update.ownedCompanyIds,
      update.ownedCompanyPercentages,
      idByName
    )
    ownedCompanies.forEach(({ id: ownedCompanyId, percentage }) => {
      const key = `${ownedCompanyId}:${companyId}`
      if (seen.has(key) || companyId === ownedCompanyId) return
      seen.add(key)
      ownerships.push(
        stripEmptyValues(
          buildPayload(
            {
              investmentCompanyId: ownedCompanyId,
              ownerInvestmentCompanyId: companyId,
              percentage
            },
            investmentCompanyOwnershipFormFields
          )
        )
      )
    })
  })

  return ownerships
}

/**
 * Groups flat ownership link payloads under each owned company for
 * `updateInvestmentCompanies` — same nested shape as CompanyForm.
 */
export function groupOwnershipPayloadsByCompany(
  ownershipPayloads: Record<string, any>[],
  createdCompanies: Record<string, any>[]
): Record<string, any>[] {
  const versionById = new Map<string, number>()
  createdCompanies.forEach(company => {
    if (typeof company.id === 'string' && typeof company.version === 'number') {
      versionById.set(company.id, company.version)
    }
  })

  const ownershipByCompanyId = new Map<string, Record<string, any>[]>()

  ownershipPayloads.forEach(payload => {
    const companyId = payload.investmentCompany
    if (typeof companyId !== 'string' || !companyId) {
      return
    }
    const existing = ownershipByCompanyId.get(companyId) ?? []
    existing.push(payload)
    ownershipByCompanyId.set(companyId, existing)
  })

  return Array.from(ownershipByCompanyId.entries()).map(([id, investmentCompanyOwnership]) => {
    const companyPayload: Record<string, any> = { id, investmentCompanyOwnership }
    const version = versionById.get(id)
    if (version !== undefined) {
      companyPayload.version = version
    }
    return companyPayload
  })
}

export function toInvestmentCompanyExecutivesForCompany(
  executiveUpdates: InvestmentCompanyExecutiveUpdate[],
  companyIndex: number,
  companyName: string | undefined
): Record<string, any>[] {
  const normalizedCompanyName = companyName?.trim().toLocaleLowerCase()
  const matchingUpdate = executiveUpdates.find((update, idx) => {
    if (update.rowIndex === companyIndex) return true
    if (normalizedCompanyName && update.companyName?.trim().toLocaleLowerCase() === normalizedCompanyName) return true
    return idx === companyIndex
  })

  if (!matchingUpdate || matchingUpdate.executiveNames.length === 0) {
    return []
  }

  const executives: Record<string, any>[] = []

  matchingUpdate.executiveNames.forEach((_, index) => {
    const sourceType = matchingUpdate.executiveSourceTypes[index]
    const employeeId = matchingUpdate.executiveEmployeeIds[index]
    const contactId = matchingUpdate.executiveContactIds[index]

    if (!sourceType || (!employeeId && !contactId)) {
      return
    }

    const executivePayload = buildPayload(
      {
        employeeId: sourceType === 'employee' ? employeeId : undefined,
        investmentContactId: sourceType === 'investmentContact' ? contactId : undefined,
        executiveTypeRef: matchingUpdate.executiveTypeRef || undefined
      },
      investmentCompanyExecutiveFormFields
    )

    if (executivePayload.employee || executivePayload.investmentContact) {
      executives.push(executivePayload)
    }
  })

  return executives
}

function getEmbeddedExecutivesFromRecord(entity: Record<string, any>): Record<string, any>[] {
  const raw = entity.investmentCompanyExecutives ?? entity.executives ?? entity.investmentCompanyExecutive
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.filter(
    (item): item is Record<string, any> =>
      Boolean(item) &&
      typeof item === 'object' &&
      (Boolean(item.employee) ||
        Boolean(item.employeeId) ||
        Boolean(item.investmentContact) ||
        Boolean(item.investmentContactId))
  )
}

export function toInvestmentCompanyPayloadWithExecutives(
  entity: Record<string, any>,
  ownerEmployeeId: string | undefined,
  executiveUpdates: InvestmentCompanyExecutiveUpdate[],
  entityIndex: number
): Record<string, any> {
  const companyPayload = toInvestmentCompanyPayload(entity, ownerEmployeeId)
  const embeddedExecutives = getEmbeddedExecutivesFromRecord(entity)
  const executives =
    embeddedExecutives.length > 0
      ? embeddedExecutives
      : toInvestmentCompanyExecutivesForCompany(executiveUpdates, entityIndex, entity.name)

  if (executives.length > 0) {
    companyPayload.investmentCompanyExecutives = executives
  }

  return companyPayload
}
