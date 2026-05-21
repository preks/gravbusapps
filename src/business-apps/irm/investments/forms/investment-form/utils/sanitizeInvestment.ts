import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import { mapFromSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'

const extractIdOrString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' ? id : undefined
  }
  return undefined
}

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

  const investmentRaw = (formData.investment ?? {}) as Record<string, unknown>

  // Sanitize entity reference IDs - extract ID string if passed as object
  const ownerEmployeeId = extractIdOrString(investmentRaw.ownerEmployeeId)
  const investmentCompanyId = extractIdOrString(investmentRaw.investmentCompanyId)
  const loanRecipientInvestmentAccountId = extractIdOrString(investmentRaw.loanRecipientInvestmentAccountId)

  // Sanitize investmentAccounts - extract investmentAccountId from nested objects
  const investmentAccounts = formData.investment?.investmentAccounts
    ?.map((acc: any) => {
      const investmentAccountId = extractIdOrString(acc.investmentAccountId) ?? extractIdOrString(acc.investmentAccount)

      if (!investmentAccountId) {
        return null
      }

      return {
        ...(acc.id && { id: acc.id }),
        ...(acc.version !== undefined && { version: acc.version }),
        investmentAccountId,
        ...(acc.investmentAccountTypeRef && { investmentAccountTypeRef: acc.investmentAccountTypeRef })
      }
    })
    .filter((account): account is NonNullable<typeof account> => account !== null)

  const investmentGroupRefFromForm =
    typeof formData.investment?.investmentGroupRef === 'string' ? formData.investment.investmentGroupRef : undefined

  const investmentWithoutTypeId = formData.investment
    ? Object.fromEntries(Object.entries(formData.investment).filter(([key]) => key !== 'investmentTypeId'))
    : undefined

  // Convert to Investment format
  const mergedData: Record<string, unknown> = {
    ...investmentWithoutTypeId,
    // Remove investmentTypeId from payload (not part of API) and replace it with group & type
    investmentGroupRef: groupId ?? investmentGroupRefFromForm ?? undefined,
    investmentTypeRef: typeId ?? undefined,
    // Sanitized entity reference IDs (extract ID string from objects)
    ownerEmployeeId,
    ...(investmentCompanyId !== undefined && { investmentCompanyId }),
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

  return mergedData as Partial<Investment>
}
