/**
 * IRM investment batch payload builder.
 *
 * Accepts entities that carry flat dotted keys (e.g. `investment.name`,
 * `liquidFundInvestment.additionalProperties.isin`) and produces the nested
 * shape expected by `investment-relations/createInvestments`:
 *
 *   { investmentRequests: [{ investment: {...}, [payloadKey]: {...} }, ...] }
 *
 * Group-specific value coercions (e.g. parsing the real-estate
 * `liquidityForecast` JSON string) run as `config.payloadExtensions` at the
 * end of each request's assembly — structural re-nesting is automatic via
 * `nestFlatDottedKeys`.
 */

import type { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { nestFlatDottedKeys, normalizeEntityForImport, resolveOwnerEmployeeId, toRecordObject } from '../shared'

export function toInvestmentBatchPayload(
  entities: Record<string, any>[],
  investmentType: string,
  ownerEmployeeId: string | undefined,
  defaultInvestmentGroupRef: string,
  config: ImportConfig
): { investmentRequests: Record<string, any>[] } {
  const investmentRequests = entities.map(entity => {
    // Convert flat dotted keys back into the nested payload shape expected by
    // the Java endpoint, then run the shared address/JSON normalization so
    // values like `realEstateInvestment.addressLine` get parsed.
    const nested = nestFlatDottedKeys(entity)
    const normalized = normalizeEntityForImport(nested)

    const investmentData = toRecordObject(normalized.investment)
    const specificInvestmentData = toRecordObject(normalized[investmentType])

    const resolvedOwnerEmployeeId =
      resolveOwnerEmployeeId(investmentData, ownerEmployeeId) ?? resolveOwnerEmployeeId(normalized, ownerEmployeeId)

    const investment = {
      ...investmentData,
      investmentGroupRef: investmentData.investmentGroupRef || defaultInvestmentGroupRef,
      investmentStatusRef: investmentData.investmentStatusRef || 'InvestmentStatus:v1:ACTIVE',
      ownerEmployee: resolvedOwnerEmployeeId || investmentData.ownerEmployee
    }

    config.payloadExtensions?.forEach(extension =>
      extension({ investment, specific: specificInvestmentData, payloadKey: investmentType })
    )

    return {
      investment,
      [investmentType]: specificInvestmentData
    }
  })

  return { investmentRequests }
}
