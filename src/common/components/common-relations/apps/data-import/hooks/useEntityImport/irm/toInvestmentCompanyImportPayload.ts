/**
 * Maps a Flowbot-extracted investment company row into the Java bulk-create
 * payload shape used by `createInvestmentCompanies` (same structure as
 * `buildCompanySubmitPayload` without picture handling).
 */

import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { buildInvestmentCompanyPayload } from '@/common/data/investment/types/investmentCompanyTypes'
import {
  investmentCompanyExecutiveFormFields,
  investmentCompanyGroupAssociationFormFields,
  investmentCompanyOwnershipFormFields,
  investmentCompanyStakeholderFormFields
} from '@/common/data/investment/types/investmentCompanyAssociationTypes'
import { isPlainRecord, nestFlatDottedKeys } from '../shared/dottedKeys'
import { normalizeEntityForImport, stripEmptyValues } from '../shared'

const OWNERSHIP_TOTAL_LIMIT = 100

type ExecutiveSource = Record<string, unknown>
type OwnershipSource = Record<string, unknown>
type StakeholderSource = Record<string, unknown>

function coercePercentage(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(parsed)) return undefined
  return parsed
}

function normalizeExecutiveRow(raw: ExecutiveSource): Record<string, unknown> | null {
  const employeeId = typeof raw.employeeId === 'string' ? raw.employeeId : undefined
  const investmentContactId = typeof raw.investmentContactId === 'string' ? raw.investmentContactId : undefined
  const executiveTypeRef = typeof raw.executiveTypeRef === 'string' ? raw.executiveTypeRef : undefined

  if (!employeeId && !investmentContactId) return null

  return stripEmptyValues(
    buildPayload(
      {
        id: typeof raw.id === 'string' ? raw.id : undefined,
        version: typeof raw.version === 'number' ? raw.version : undefined,
        employeeId,
        investmentContactId,
        executiveTypeRef
      },
      investmentCompanyExecutiveFormFields
    )
  )
}

function normalizeOwnershipRow(raw: OwnershipSource): Record<string, unknown> | null {
  let ownerInvestmentCompanyId: string | undefined
  if (typeof raw.ownerInvestmentCompanyId === 'string') {
    ownerInvestmentCompanyId = raw.ownerInvestmentCompanyId
  } else if (typeof raw.ownerInvestmentCompany === 'string') {
    ownerInvestmentCompanyId = raw.ownerInvestmentCompany
  }
  const percentage = coercePercentage(raw.percentage)

  if (!ownerInvestmentCompanyId || percentage === undefined) return null

  return stripEmptyValues(
    buildPayload(
      {
        id: typeof raw.id === 'string' ? raw.id : undefined,
        version: typeof raw.version === 'number' ? raw.version : undefined,
        ownerInvestmentCompanyId,
        percentage
      },
      investmentCompanyOwnershipFormFields
    )
  )
}

function readExecutiveRows(entity: Record<string, unknown>): ExecutiveSource[] {
  const fromRoot = entity.investmentCompanyExecutives
  if (Array.isArray(fromRoot)) return fromRoot.filter(isPlainRecord)
  const fromAlias = entity.executives
  if (Array.isArray(fromAlias)) return fromAlias.filter(isPlainRecord)
  return []
}

function readOwnershipRows(entity: Record<string, unknown>): OwnershipSource[] {
  const fromRoot = entity.investmentCompanyOwnership
  if (Array.isArray(fromRoot)) return fromRoot.filter(isPlainRecord)
  const fromAlias = entity.ownerships
  if (Array.isArray(fromAlias)) return fromAlias.filter(isPlainRecord)
  return []
}

function readStakeholderRows(entity: Record<string, unknown>): StakeholderSource[] {
  const fromRoot = (entity.investmentCompanyStakeholders as unknown) ?? (entity.investmentCompanyStakeholder as unknown)
  if (Array.isArray(fromRoot)) return fromRoot.filter(isPlainRecord)
  const fromAlias = entity.stakeholders
  if (Array.isArray(fromAlias)) return fromAlias.filter(isPlainRecord)
  return []
}

function normalizeStakeholderRow(raw: StakeholderSource): Record<string, unknown> | null {
  const investmentContactId =
    typeof raw.investmentContactId === 'string'
      ? raw.investmentContactId
      : typeof raw.investmentContact === 'string'
        ? (raw.investmentContact as string)
        : undefined
  const investmentAccountId =
    typeof raw.investmentAccountId === 'string'
      ? raw.investmentAccountId
      : typeof raw.investmentAccount === 'string'
        ? (raw.investmentAccount as string)
        : undefined
  const name = typeof raw.name === 'string' ? raw.name.trim() : undefined
  const investmentCompanyStakeholderTypeRef =
    typeof raw.investmentCompanyStakeholderTypeRef === 'string' ? raw.investmentCompanyStakeholderTypeRef : undefined

  // External stakeholders are valid with just a name; the other two require an id.
  if (!investmentContactId && !investmentAccountId && !name) return null

  return stripEmptyValues(
    buildPayload(
      {
        id: typeof raw.id === 'string' ? raw.id : undefined,
        version: typeof raw.version === 'number' ? raw.version : undefined,
        investmentContactId,
        investmentAccountId,
        name: !investmentContactId && !investmentAccountId ? name : undefined,
        investmentCompanyStakeholderTypeRef
      },
      investmentCompanyStakeholderFormFields
    )
  )
}

function buildOwnershipPayload(rows: OwnershipSource[]): Record<string, unknown>[] {
  const ownerships = rows.map(normalizeOwnershipRow).filter((row): row is Record<string, unknown> => Boolean(row))

  const total = ownerships.reduce((sum, row) => sum + (Number(row.percentage) || 0), 0)
  if (total > OWNERSHIP_TOTAL_LIMIT) {
    throw new Error(`Import failed: ownership percentages exceed ${OWNERSHIP_TOTAL_LIMIT}% for a company row.`)
  }

  return ownerships
}

export function toInvestmentCompanyImportPayload(
  entity: Record<string, any>,
  investmentCompanyGroupId?: string
): Record<string, unknown> {
  const nested = nestFlatDottedKeys(normalizeEntityForImport(entity) as Record<string, unknown>)
  const addresses = Array.isArray(nested.addresses) ? nested.addresses : undefined

  const investmentCompany = buildInvestmentCompanyPayload({
    name: typeof nested.name === 'string' ? nested.name : undefined,
    code: typeof nested.code === 'string' ? nested.code : undefined,
    description: typeof nested.description === 'string' ? nested.description : undefined,
    commercialRegistrationNumber:
      typeof nested.commercialRegistrationNumber === 'string' ? nested.commercialRegistrationNumber : undefined,
    taxIdentificationNumber:
      typeof nested.taxIdentificationNumber === 'string' ? nested.taxIdentificationNumber : undefined,
    taxNumber: typeof nested.taxNumber === 'string' ? nested.taxNumber : undefined,
    valueAddedTaxNumber: typeof nested.valueAddedTaxNumber === 'string' ? nested.valueAddedTaxNumber : undefined,
    currencyRef: typeof nested.currencyRef === 'string' ? nested.currencyRef : undefined,
    addresses
  }).investmentCompany as Record<string, unknown>

  const executives = readExecutiveRows(nested)
    .map(normalizeExecutiveRow)
    .filter((row): row is Record<string, unknown> => Boolean(row))

  if (executives.length > 0) {
    investmentCompany.investmentCompanyExecutives = executives
  }

  const ownerships = buildOwnershipPayload(readOwnershipRows(nested))
  if (ownerships.length > 0) {
    investmentCompany.investmentCompanyOwnership = ownerships
  }

  const stakeholders = readStakeholderRows(nested)
    .map(normalizeStakeholderRow)
    .filter((row): row is Record<string, unknown> => Boolean(row))
  if (stakeholders.length > 0) {
    investmentCompany.investmentCompanyStakeholder = stakeholders
  }

  const resolvedGroupId =
    investmentCompanyGroupId ||
    (typeof nested.investmentCompanyGroupId === 'string' ? nested.investmentCompanyGroupId : undefined)

  if (resolvedGroupId) {
    investmentCompany.investmentCompanyGroupAssociation = [
      buildPayload({ investmentCompanyGroupId: resolvedGroupId }, investmentCompanyGroupAssociationFormFields)
    ]
  }

  return stripEmptyValues(investmentCompany) as Record<string, unknown>
}
