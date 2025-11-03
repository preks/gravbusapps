import { useEffect } from 'react'
import { useLeadFormContext } from '../context/LeadFormContext'
import { useInvestmentTypeDetection } from './useInvestmentTypeDetection'

export const useFormFieldClearing = () => {
  const { formValues, setFormValues, dependentInvestmentTypes } = useLeadFormContext()
  const {
    isEquityGroup,
    isRealEstateGroup,
    isExistingPropertiesType,
    isMezzanineLoansType,
    isProjectDevelopmentType,
    isOthersType,
    shouldShowInvestmentRole
  } = useInvestmentTypeDetection()

  // Clear investment role when conditions are not met
  useEffect(() => {
    // Only run clearing logic if we have dependent types loaded (or no group selected)
    const hasLoadedDependentTypes = !formValues.investmentGroup || dependentInvestmentTypes.length > 0

    if (hasLoadedDependentTypes && !shouldShowInvestmentRole && formValues.investmentRole) {
      setFormValues({ investmentRole: '' })
    }
  }, [
    shouldShowInvestmentRole,
    formValues.investmentRole,
    formValues.investmentGroup,
    dependentInvestmentTypes.length,
    setFormValues
  ])

  // Clear investment stake type when investment group is not equity
  useEffect(() => {
    // Only run clearing logic if we have dependent types loaded (or no group selected)
    const hasLoadedDependentTypes = !formValues.investmentGroup || dependentInvestmentTypes.length > 0

    if (hasLoadedDependentTypes && !isEquityGroup && formValues.investmentStakeType) {
      setFormValues({ investmentStakeType: '' })
    }
  }, [isEquityGroup, formValues.investmentGroup, dependentInvestmentTypes.length, setFormValues])

  // Clear equity-specific financial fields when investment group is not equity
  useEffect(() => {
    // Only run clearing logic if we have dependent types loaded (or no group selected)
    const hasLoadedDependentTypes = !formValues.investmentGroup || dependentInvestmentTypes.length > 0

    if (hasLoadedDependentTypes && !isEquityGroup) {
      const updates: any = {}
      if (formValues.stakePercentage) updates.stakePercentage = ''
      if (formValues.marketValue) updates.marketValue = ''

      if (Object.keys(updates).length > 0) {
        setFormValues(updates)
      }
    }
  }, [isEquityGroup, formValues.investmentGroup, dependentInvestmentTypes.length, setFormValues])

  // Clear real estate existing properties specific fields when not real estate group + existing properties
  useEffect(() => {
    // Only run clearing logic if we have dependent types loaded (or no group selected)
    const hasLoadedDependentTypes = !formValues.investmentGroup || dependentInvestmentTypes.length > 0

    if (hasLoadedDependentTypes && !(isRealEstateGroup && isExistingPropertiesType)) {
      const updates: any = {}
      if (formValues.buildingYear) updates.buildingYear = ''
      if (formValues.size) updates.size = ''
      if (formValues.measurementUnit) updates.measurementUnit = ''
      if (formValues.annualNetColdRent) updates.annualNetColdRent = ''

      if (Object.keys(updates).length > 0) {
        setFormValues(updates)
      }
    }
  }, [
    isRealEstateGroup,
    isExistingPropertiesType,
    formValues.investmentGroup,
    dependentInvestmentTypes.length,
    setFormValues
  ])

  // Clear real estate mezzanine loans specific fields when not real estate group + mezzanine loans
  useEffect(() => {
    // Only run clearing logic if we have dependent types loaded (or no group selected)
    const hasLoadedDependentTypes = !formValues.investmentGroup || dependentInvestmentTypes.length > 0

    if (hasLoadedDependentTypes && !(isRealEstateGroup && isMezzanineLoansType)) {
      const updates: any = {}
      if (formValues.loanAmount) updates.loanAmount = ''
      if (formValues.loanInterestRate) updates.loanInterestRate = ''

      if (Object.keys(updates).length > 0) {
        setFormValues(updates)
      }
    }
  }, [
    isRealEstateGroup,
    isMezzanineLoansType,
    formValues.investmentGroup,
    dependentInvestmentTypes.length,
    setFormValues
  ])

  // Clear real estate project development specific fields when not real estate group + project development
  useEffect(() => {
    // Only run clearing logic if we have dependent types loaded (or no group selected)
    const hasLoadedDependentTypes = !formValues.investmentGroup || dependentInvestmentTypes.length > 0

    if (hasLoadedDependentTypes && !(isRealEstateGroup && isProjectDevelopmentType)) {
      const updates: any = {}
      if (formValues.requiredCapitalAmount) updates.requiredCapitalAmount = ''
      // Note: forecastedProfitAmount is NOT cleared here because it's shared with Others type
      // It's handled by the dedicated forecastedProfitAmount clearing logic below

      if (Object.keys(updates).length > 0) {
        setFormValues(updates)
      }
    }
  }, [
    isRealEstateGroup,
    isProjectDevelopmentType,
    formValues.investmentGroup,
    dependentInvestmentTypes.length,
    setFormValues
  ])

  // Clear initialInvestmentAmount when neither equity nor real estate conditions are met (shared field)
  useEffect(() => {
    // Only run clearing logic if we have dependent types loaded (or no group selected)
    const hasLoadedDependentTypes = !formValues.investmentGroup || dependentInvestmentTypes.length > 0

    const shouldShowInitialInvestment =
      isEquityGroup || (isRealEstateGroup && isExistingPropertiesType) || (isRealEstateGroup && isOthersType)
    if (hasLoadedDependentTypes && !shouldShowInitialInvestment && formValues.initialInvestmentAmount) {
      setFormValues({ initialInvestmentAmount: '' })
    }
  }, [
    isEquityGroup,
    isRealEstateGroup,
    isExistingPropertiesType,
    isOthersType,
    formValues.investmentGroup,
    dependentInvestmentTypes.length,
    setFormValues
  ])

  // Clear forecastedProfitAmount when not real estate others or project development
  useEffect(() => {
    // Only run clearing logic if we have dependent types loaded (or no group selected)
    const hasLoadedDependentTypes = !formValues.investmentGroup || dependentInvestmentTypes.length > 0

    const shouldShowForecastedProfit =
      (isRealEstateGroup && isProjectDevelopmentType) || (isRealEstateGroup && isOthersType)
    if (hasLoadedDependentTypes && !shouldShowForecastedProfit && formValues.forecastedProfitAmount) {
      setFormValues({ forecastedProfitAmount: '' })
    }
  }, [
    isRealEstateGroup,
    isProjectDevelopmentType,
    isOthersType,
    formValues.investmentGroup,
    dependentInvestmentTypes.length,
    setFormValues
  ])
}
