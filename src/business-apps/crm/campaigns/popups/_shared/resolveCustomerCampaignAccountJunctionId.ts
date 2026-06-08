type ParamsRecord = Record<string, unknown> | undefined

function readStringParam(record: ParamsRecord, key: string): string | undefined {
  const value = record?.[key]
  return typeof value === 'string' ? value : undefined
}

function readNestedCampaignAccountId(record: ParamsRecord, key: string): string | undefined {
  const nested = record?.[key]
  if (!nested || typeof nested !== 'object') {
    return undefined
  }
  const id = (nested as { id?: unknown }).id
  return typeof id === 'string' ? id : undefined
}

/**
 * Resolves the CustomerCampaignAccount junction row id for update/delete flows.
 *
 * Do not read top-level `additionalData.accountId` — in CRM that often means
 * CustomerAccount id (URL/context leak). Row actions and flows should pass
 * `customerCampaignAccountId` or `psi_initialParameters.accountId`.
 */
export function resolveCustomerCampaignAccountJunctionId(additionalData: ParamsRecord): string | undefined {
  const init = additionalData?.psi_taskPayload as ParamsRecord
  const initialParameters = init?.psi_initialParameters as ParamsRecord

  return (
    readStringParam(additionalData, 'customerCampaignAccountId') ||
    readStringParam(initialParameters, 'customerCampaignAccountId') ||
    readNestedCampaignAccountId(additionalData, 'customerCampaignAccount') ||
    readNestedCampaignAccountId(initialParameters, 'customerCampaignAccount') ||
    readStringParam(initialParameters, 'accountId')
  )
}
