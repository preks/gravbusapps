import { buildInvestmentCompanyPayload } from '@/common/data/investment/types/investmentCompanyTypes'
import type { CompanyFormData } from './companyFormTypes'

type InvestmentCompanyMutationPayload = Record<string, unknown> & {
  investmentCompanyExecutives?: unknown[]
  executives?: unknown[]
  investmentCompanyGroupAssociation?: unknown[]
  investmentCompanyGroupAssociations?: unknown[]
  groupAssociations?: unknown[]
  investmentCompanyOwnership?: unknown[]
  investmentCompanyOwnerships?: unknown[]
  ownerships?: unknown[]
  picture?: string
  pictureThumbnail?: string
}

type RelationPayload = Record<string, unknown>
const isDefined = <T>(value: T | null): value is T => value !== null

export const buildCompanySubmitPayload = async (
  data: CompanyFormData,
  pictureFile: File | null,
  picturePreview: string | null,
  readFile: (file: File) => Promise<string>
) => {
  const investmentCompany: InvestmentCompanyMutationPayload = buildInvestmentCompanyPayload({
    id: data.id,
    version: data.version,
    name: data.name.trim(),
    code: data.code.trim(),
    commercialRegistrationNumber: data.commercialRegistrationNumber?.trim() || undefined,
    taxIdentificationNumber: data.taxIdentificationNumber?.trim() || undefined,
    taxNumber: data.taxNumber?.trim() || undefined,
    valueAddedTaxNumber: data.valueAddedTaxNumber?.trim() || undefined,
    currencyRef: data.currencyRef || undefined,
    ownerEmployeeId: data.ownerEmployeeId || undefined,
    ownsProperty: data.ownsProperty,
    addresses: data.addresses
  }).investmentCompany

  const executives =
    data.executives
      ?.map(executive => {
        const employeeId = executive.sourceType === 'employee' ? executive.employeeId : undefined
        const investmentContactId =
          executive.sourceType === 'investmentContact' ? executive.investmentContactId : undefined

        if (!employeeId && !investmentContactId) {
          return null
        }

        return {
          id: executive.id,
          version: executive.version,
          investmentCompanyId: data.id,
          investmentCompany: data.id,
          employeeId,
          employee: employeeId,
          investmentContactId,
          investmentContact: investmentContactId,
          executiveTypeRef: executive.executiveTypeRef
        } satisfies RelationPayload
      })
      .filter(isDefined) || []

  if (data.executives !== undefined) {
    investmentCompany.investmentCompanyExecutives = executives
    investmentCompany.executives = executives.map(executive => ({
      id: executive.id,
      version: executive.version,
      investmentCompany: executive.investmentCompany,
      investmentContact: executive.investmentContact,
      employee: executive.employee,
      executiveTypeRef: executive.executiveTypeRef
    }))
  }

  if (data.investmentCompanyGroupId) {
    const groupAssociations: RelationPayload[] = [
      {
        id: data.investmentCompanyGroupAssociationId,
        version: data.investmentCompanyGroupAssociationVersion,
        investmentCompanyId: data.id,
        investmentCompany: data.id,
        investmentCompanyGroupId: data.investmentCompanyGroupId,
        investmentCompanyGroup: data.investmentCompanyGroupId
      }
    ]
    investmentCompany.investmentCompanyGroupAssociation = groupAssociations
    investmentCompany.investmentCompanyGroupAssociations = groupAssociations
    investmentCompany.groupAssociations = groupAssociations
  }

  const ownerships =
    data.ownerships
      ?.map(ownership => {
        const ownerInvestmentCompanyId = ownership.ownerInvestmentCompanyId
        if (!ownerInvestmentCompanyId || ownership.percentage === undefined) {
          return null
        }

        return {
          id: ownership.id,
          version: ownership.version,
          investmentCompanyId: data.id,
          investmentCompany: data.id,
          ownerInvestmentCompanyId,
          ownerInvestmentCompany: ownerInvestmentCompanyId,
          percentage: ownership.percentage
        } satisfies RelationPayload
      })
      .filter(isDefined) || []

  if (data.ownerships !== undefined) {
    investmentCompany.investmentCompanyOwnership = ownerships
    investmentCompany.investmentCompanyOwnerships = ownerships
    investmentCompany.ownerships = ownerships.map(ownership => ({
      id: ownership.id,
      version: ownership.version,
      investmentCompany: ownership.investmentCompany,
      ownerInvestmentCompany: ownership.ownerInvestmentCompany,
      percentage: ownership.percentage
    }))
  }

  if (pictureFile) {
    investmentCompany.picture = await readFile(pictureFile)
  } else if (data.pictureModified && !picturePreview) {
    investmentCompany.picture = ''
    investmentCompany.pictureThumbnail = ''
  }

  const investmentCompanyExecutives = data.executives === undefined ? undefined : executives
  const investmentCompanyOwnerships = data.ownerships === undefined ? undefined : ownerships

  return {
    investmentCompany,
    investmentCompanyExecutives,
    investmentCompanyOwnerships,
    investmentCompanyGroupAssociations: data.investmentCompanyGroupId
      ? investmentCompany.investmentCompanyGroupAssociations
      : undefined,
    changeMode: data.id ? 'UPDATE' : 'INSERT'
  }
}
