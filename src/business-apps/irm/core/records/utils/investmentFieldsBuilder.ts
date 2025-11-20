/**
 * Investment Fields Builder
 *
 * Transforms catalog referenceFields (flat paths for Lead/Opportunity)
 * into formFields format that InvestmentSection expects.
 *
 * ONLY uses referenceFields - if they don't exist, returns empty array.
 */

/**
 * Extracts referenceFields from catalog objectValue and transforms to formFields format.
 * ONLY uses referenceFields - if they don't exist, returns empty array.
 *
 * @param investmentType - Investment type catalog entry with objectValue
 * @param investmentGroup - Investment group catalog entry with objectValue (fallback)
 * @returns Transformed formFields array ready for InvestmentSection, or empty array if no referenceFields found
 */
export const buildFormFieldsFromCatalogData = (
  investmentType?: { objectValue?: any },
  investmentGroup?: { objectValue?: any }
): any[] => {
  // Parse Type objectValue
  let typeParsed: any = null
  if (investmentType?.objectValue) {
    try {
      typeParsed =
        typeof investmentType.objectValue === 'string'
          ? JSON.parse(investmentType.objectValue)
          : investmentType.objectValue
    } catch (err) {
      console.error('Error parsing type objectValue:', err)
    }
  }

  // Parse Group objectValue
  let groupParsed: any = null
  if (investmentGroup?.objectValue) {
    try {
      groupParsed =
        typeof investmentGroup.objectValue === 'string'
          ? JSON.parse(investmentGroup.objectValue)
          : investmentGroup.objectValue
    } catch (err) {
      console.error('Error parsing group objectValue:', err)
    }
  }

  // Try Type first, fallback to Group for referenceFields
  const referenceFields = typeParsed?.referenceFields || groupParsed?.referenceFields || []

  if (!Array.isArray(referenceFields) || referenceFields.length === 0) {
    return []
  }

  // Transform referenceFields to formFields format
  const transformedFields = [
    {
      groupId: 'prospectDetails',
      groupLabel: 'Investment Details',
      displayOrder: 1,
      fields: referenceFields.map((field: any) => ({
        property: field.property, // Keep flat path as-is (e.g., "stakePercentage")
        label: field.label,
        type: field.type,
        displayOrder: field.displayOrder,
        record: true, // Mark all prospect fields as record fields
        required: false, // Leads/Opportunities don't enforce required fields
        prefix: field.prefix,
        suffix: field.suffix
      }))
    }
  ]

  return transformedFields
}
