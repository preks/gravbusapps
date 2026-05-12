import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { buildInvestmentCompanyPayload } from '@/common/data/investment/types/investmentCompanyTypes'
import {
  investmentCompanyExecutiveFormFields,
  investmentCompanyGroupAssociationFormFields,
  investmentCompanyOwnershipFormFields
} from '@/common/data/investment/types/investmentCompanyAssociationTypes'
import type { CompanyFormData } from './companyFormTypes'

type InvestmentCompanyMutationPayload = Record<string, unknown> & {
  investmentCompanyExecutives?: unknown[]
  investmentCompanyGroupAssociation?: unknown[]
  investmentCompanyOwnership?: unknown[]
  picture?: Record<string, string>
  pictureThumbnail?: string
}

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
    addresses: data.addresses
  }).investmentCompany

  const executives =
    data.executives
      ?.map(executive => {
        const executivePayload = buildPayload(
          {
            id: executive.id,
            version: executive.version,
            investmentCompanyId: data.id,
            employeeId: executive.sourceType === 'employee' ? executive.employeeId : undefined,
            investmentContactId:
              executive.sourceType === 'investmentContact' ? executive.investmentContactId : undefined,
            executiveTypeRef: executive.executiveTypeRef
          },
          investmentCompanyExecutiveFormFields
        )
        return executivePayload.employee || executivePayload.investmentContact ? executivePayload : null
      })
      .filter(Boolean) || []

  if (data.executives !== undefined) {
    investmentCompany.investmentCompanyExecutives = executives
  }

  if (data.investmentCompanyGroupId) {
    investmentCompany.investmentCompanyGroupAssociation = [
      buildPayload(
        {
          id: data.investmentCompanyGroupAssociationId,
          version: data.investmentCompanyGroupAssociationVersion,
          investmentCompanyId: data.id,
          investmentCompanyGroupId: data.investmentCompanyGroupId
        },
        investmentCompanyGroupAssociationFormFields
      )
    ]
  }

  const ownerships =
    data.ownerships
      ?.map(ownership =>
        buildPayload(
          {
            id: ownership.id,
            version: ownership.version,
            investmentCompanyId: data.id,
            ownerInvestmentCompanyId: ownership.ownerInvestmentCompanyId,
            percentage: ownership.percentage
          },
          investmentCompanyOwnershipFormFields
        )
      )
      .filter(ownership => ownership.ownerInvestmentCompany && ownership.percentage !== undefined) || []

  if (data.ownerships !== undefined) {
    investmentCompany.investmentCompanyOwnership = ownerships
  }

  if (pictureFile) {
    investmentCompany.picture = { additionalProp1: await readFile(pictureFile) }
  } else if (data.pictureModified && !picturePreview) {
    investmentCompany.picture = {}
    investmentCompany.pictureThumbnail = ''
  }

  return {
    investmentCompanies: [investmentCompany],
    changeMode: data.id ? 'UPDATE' : 'INSERT'
  }
}
