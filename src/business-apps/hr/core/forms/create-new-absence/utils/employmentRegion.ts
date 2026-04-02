type EmployeeRegionLookupResponse = {
  employee?: Array<{
    workingCondition?: Array<{
      regionRef?: string | null
      region?: {
        id?: string | null
      } | null
    }>
  }>
}

export const normalizeEmploymentRegionRef = (regionRef?: string | null): string | null => {
  const normalizedInput = String(regionRef ?? '').trim()
  if (normalizedInput === '') {
    return null
  }

  try {
    const segment = normalizedInput.split(':').pop() || ''
    if (segment.startsWith('RO') && segment !== 'ROU') {
      return 'EmploymentRegion:v1:ROU'
    }
  } catch {
    // Keep the original region ref if normalization fails.
  }

  return normalizedInput
}

export const resolveEmploymentRegionRef = (response: EmployeeRegionLookupResponse): string | null => {
  const workingCondition = response?.employee?.[0]?.workingCondition?.[0]
  const employmentRegionRef = workingCondition?.region?.id ?? workingCondition?.regionRef

  return normalizeEmploymentRegionRef(employmentRegionRef)
}
