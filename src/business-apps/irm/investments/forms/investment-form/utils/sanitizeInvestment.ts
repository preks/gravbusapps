import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import { mapFromSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'

/**
 * Sanitizes InvestmentFormValues for API payload
 * - Converts investmentTypeId back to groupId/typeId/liquidFundTypeId
 * - Removes investmentTypeId (not part of API)
 * - Converts subtype objects to arrays
 * - Adds liquidFundTypeId to liquidFundInvestment
 */
export const sanitizeInvestment = (
  formData: InvestmentFormValues,
  getPathByType: (typeId: string | null | undefined) => InvestmentType[]
): Partial<Investment> => {
  // Convert investmentTypeId back to group/type/liquidFundType for payload
  const investmentTypeId = formData.investment?.investmentTypeId ?? null
  const { groupId, typeId, liquidFundTypeId } = mapFromSingleInvestmentTypeId(investmentTypeId, getPathByType)

  // Sanitize entity reference IDs - extract ID string if passed as object
  const ownerEmployeeId =
    typeof formData.investment?.ownerEmployeeId === 'object' && formData.investment?.ownerEmployeeId?.id
      ? formData.investment.ownerEmployeeId.id
      : formData.investment?.ownerEmployeeId

  const companyId =
    typeof formData.investment?.companyId === 'object' && formData.investment?.companyId?.id
      ? formData.investment.companyId.id
      : formData.investment?.companyId

  const loanRecipientInvestmentAccountId =
    typeof formData.investment?.loanRecipientInvestmentAccountId === 'object' &&
    formData.investment?.loanRecipientInvestmentAccountId?.id
      ? formData.investment.loanRecipientInvestmentAccountId.id
      : formData.investment?.loanRecipientInvestmentAccountId

  // Sanitize investmentAccounts - extract investmentAccountId from nested objects
  const investmentAccounts = formData.investment?.investmentAccounts?.map((acc: any) => ({
    ...(acc.id && { id: acc.id }),
    ...(acc.version !== undefined && { version: acc.version }),
    investmentAccountId: acc.investmentAccount?.id || acc.investmentAccountId || acc.investmentAccount,
    ...(acc.investmentAccountTypeRef && { investmentAccountTypeRef: acc.investmentAccountTypeRef }),
    ...(acc.isDeleted !== undefined && { isDeleted: acc.isDeleted })
  }))

  // Convert to Investment format
  const mergedData: Partial<Investment> = {
    ...formData.investment,
    // Remove investmentTypeId from payload (not part of API) and replace it with group & type
    investmentTypeId: undefined,
    investmentGroupRef: groupId ?? undefined,
    investmentTypeRef: typeId ?? undefined,
    // Sanitized entity reference IDs (extract ID string from objects)
    ownerEmployeeId,
    ...(companyId !== undefined && { companyId }),
    ...(loanRecipientInvestmentAccountId !== undefined && { loanRecipientInvestmentAccountId }),
    ...(investmentAccounts && { investmentAccounts }),
    // Include investmentOpportunityId if present (for creating investment from opportunity)
    ...(formData.investment?.investmentOpportunityId && {
      investmentOpportunityId: formData.investment.investmentOpportunityId
    }),
    // Convert subtype objects to arrays (matching Investment interface)
    ...(formData.equityInvestment
      ? {
          equityInvestment: [formData.equityInvestment]
        }
      : {}),
    ...(formData.realEstateInvestment
      ? {
          realEstateInvestment: [formData.realEstateInvestment]
        }
      : {}),
    ...(formData.liquidFundInvestment
      ? {
          liquidFundInvestment: [
            {
              ...formData.liquidFundInvestment,
              // Add liquidFundTypeId if present
              ...(liquidFundTypeId ? { investmentLiquidFundTypeRef: liquidFundTypeId } : {})
            }
          ]
        }
      : {})
  }

  return mergedData
}
