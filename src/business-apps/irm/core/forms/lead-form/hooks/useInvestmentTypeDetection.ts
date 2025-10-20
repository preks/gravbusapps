import { useMemo } from 'react'
import { useLeadFormContext } from '../context/LeadFormContext'

export const useInvestmentTypeDetection = () => {
  const { formValues, investmentGroupsSearchable, dependentInvestmentTypes } = useLeadFormContext()

  // Check if selected investment group is equity
  const isEquityGroup = useMemo(() => {
    if (!formValues.investmentGroup) return false

    // Find the selected investment group in the searchable groups
    const selectedGroup = investmentGroupsSearchable.find(group => group.value === formValues.investmentGroup)

    if (!selectedGroup) return false

    // Check if the group name/label contains "equity" (case-insensitive)
    const groupLabel = selectedGroup.label.toLowerCase()
    const groupName = selectedGroup.name.toLowerCase()

    return groupLabel.includes('equity') || groupName.includes('equity')
  }, [formValues.investmentGroup, investmentGroupsSearchable])

  // Check if selected investment type is equity
  const isEquityType = useMemo(() => {
    if (!formValues.investmentType) return false

    // Find the selected investment type in the dependent types
    const selectedType = dependentInvestmentTypes.find(type => type.value === formValues.investmentType)

    if (!selectedType) return false

    // Check if the type name/label contains "equity" (case-insensitive)
    const typeLabel = selectedType.label.toLowerCase()
    const typeName = selectedType.name.toLowerCase()

    return typeLabel.includes('equity') || typeName.includes('equity')
  }, [formValues.investmentType, dependentInvestmentTypes])

  // Check if selected investment group is real estate
  const isRealEstateGroup = useMemo(() => {
    if (!formValues.investmentGroup) return false

    // Find the selected investment group in the searchable groups
    const selectedGroup = investmentGroupsSearchable.find(group => group.value === formValues.investmentGroup)

    if (!selectedGroup) {
      return false
    }

    // Check if the group name/label contains "real estate" or "realestate" (case-insensitive)
    const groupLabel = selectedGroup.label.toLowerCase()
    const groupName = selectedGroup.name.toLowerCase()

    const result =
      groupLabel.includes('real estate') ||
      groupName.includes('real estate') ||
      groupLabel.includes('realestate') ||
      groupName.includes('realestate')

    return result
  }, [formValues.investmentGroup, investmentGroupsSearchable])

  // Check if selected investment type is existing properties
  const isExistingPropertiesType = useMemo(() => {
    if (!formValues.investmentType) return false

    // Find the selected investment type in the dependent types
    const selectedType = dependentInvestmentTypes.find(type => type.value === formValues.investmentType)

    if (!selectedType) {
      return false
    }

    // Check if the type name/label contains "existing properties" (case-insensitive)
    const typeLabel = selectedType.label.toLowerCase()
    const typeName = selectedType.name.toLowerCase()

    const result = typeLabel.includes('existing propert') || typeName.includes('existing propert')

    return result
  }, [formValues.investmentType, dependentInvestmentTypes])

  // Check if selected investment type is mezzanine loans (for real estate group)
  const isMezzanineLoansType = useMemo(() => {
    if (!formValues.investmentType) return false

    // Find the selected investment type in the dependent types
    const selectedType = dependentInvestmentTypes.find(type => type.value === formValues.investmentType)

    if (!selectedType) {
      return false
    }

    // Check if the type name/label contains "mezzanine" (case-insensitive)
    const typeLabel = selectedType.label.toLowerCase()
    const typeName = selectedType.name.toLowerCase()

    const result = typeLabel.includes('mezzanine') || typeName.includes('mezzanine')

    return result
  }, [formValues.investmentType, dependentInvestmentTypes])

  // Check if selected investment type is project development (for real estate group)
  const isProjectDevelopmentType = useMemo(() => {
    if (!formValues.investmentType) return false

    // Find the selected investment type in the dependent types
    const selectedType = dependentInvestmentTypes.find(type => type.value === formValues.investmentType)

    if (!selectedType) {
      return false
    }

    // Check if the type name/label contains "project development" (case-insensitive)
    const typeLabel = selectedType.label.toLowerCase()
    const typeName = selectedType.name.toLowerCase()

    const result =
      typeLabel.includes('project development') ||
      typeName.includes('project development') ||
      typeLabel.includes('project') ||
      typeName.includes('project')

    return result
  }, [formValues.investmentType, dependentInvestmentTypes])

  // Check if selected investment type is others (for real estate group)
  const isOthersType = useMemo(() => {
    if (!formValues.investmentType) return false

    // Find the selected investment type in the dependent types
    const selectedType = dependentInvestmentTypes.find(type => type.value === formValues.investmentType)

    if (!selectedType) {
      return false
    }

    // Check if the type name/label contains "others" or "other" (case-insensitive)
    const typeLabel = selectedType.label.toLowerCase()
    const typeName = selectedType.name.toLowerCase()

    const result =
      typeLabel.includes('others') ||
      typeName.includes('others') ||
      typeLabel.includes('other') ||
      typeName.includes('other')

    return result
  }, [formValues.investmentType, dependentInvestmentTypes])

  // Show investment role if either group OR type contains equity, OR if real estate + existing properties (NOT for mezzanine loans)
  const shouldShowInvestmentRole = isEquityGroup || isEquityType || (isRealEstateGroup && isExistingPropertiesType)

  return {
    isEquityGroup,
    isEquityType,
    isRealEstateGroup,
    isExistingPropertiesType,
    isMezzanineLoansType,
    isProjectDevelopmentType,
    isOthersType,
    shouldShowInvestmentRole
  }
}
