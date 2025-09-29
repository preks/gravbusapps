import { AccountFormValues } from '../../account-form/types';
import { ContactFormValues } from '../../contact-form/types';
import { InvestmentOpportunityFormValues } from '../../opportunity-form/types';
import { extractAddressFromObject } from '../../../../common/utils/addressUtils';


export const getAccountInitialValues = (leadData: any): Partial<AccountFormValues> => {
  if (!leadData) {
    console.log('⚠️ No lead data available for account initial values');
    return {};
  }

  console.log('🔍 Mapping lead data to account initial values:', leadData);
  console.log('🔍 Lead data has keys:', Object.keys(leadData));

  const initialValues = {
    // ===== COMPANY INFORMATION (from InvestmentLead company* fields) =====
    accountName: leadData.companyName || leadData.sourceCompanyName || '',
    website: leadData.companyWebsite || '',
    description: leadData.description || '',
    
    // ===== CONTACT INFORMATION (from InvestmentLead company* fields) =====
    email: leadData.companyEmail || '',
    phone: leadData.companyPhone || '',
    
    // ===== CATALOG REFERENCES (from InvestmentLead) =====
    legalForm: leadData.legalFormRef || leadData.legalForm?.id || '',
    industry: leadData.industryClassRef || leadData.industryClass?.id || '',
    numberOfEmployees: leadData.companySizeRef || leadData.companySize?.id || '',
    annualRevenue: leadData.accountAnnualRevenueBandRef || leadData.accountAnnualRevenueBand?.id || '',
    
    // ===== OWNER INFORMATION (from InvestmentLead) =====
    owner: leadData.ownerEmployeeId || leadData.ownerEmployee?.id || '',
    
    // ===== GEOGRAPHIC INFORMATION (from InvestmentLead direct fields) =====
    geographicPresence: leadData.locality || leadData.region?.value || '',
    country: leadData.countryRef || leadData.country?.id || '',
    region: leadData.regionRef || leadData.region?.id || '',
    addressLine1: extractAddressFromObject(leadData.addressLine) || '',
    addressLine2: '', // Not available in InvestmentLead
    addressLine3: '', // Not available in InvestmentLead
    addressLine4: '', // Not available in InvestmentLead
    postalCode: leadData.postalCode || '',
    city: leadData.locality || '',
    state: '', // Not available in InvestmentLead
    address: leadData.locality || '', // Legacy field
    
    
    // ===== ADDITIONAL FIELDS (from InvestmentLead) =====
    foundationDate: '', // Not available in InvestmentLead, user will fill
    tickerSymbol: leadData.code || '', // Use lead code as ticker symbol
    
    // ===== PARENT ACCOUNT (not available in InvestmentLead) =====
    parentAccount: '',
    
    // ===== SYSTEM FIELDS =====
    id: undefined, // New account
    version: undefined, // New account
  };
  
  // Add debug information about ALL account field mappings
  console.log('🔍 Complete account field mappings from InvestmentLead:', {
    // Company fields
    companyName: leadData.companyName,
    sourceCompanyName: leadData.sourceCompanyName,
    companyEmail: leadData.companyEmail,
    companyPhone: leadData.companyPhone,
    companyWebsite: leadData.companyWebsite,
    
    // Catalog fields
    industryClassRef: leadData.industryClassRef,
    industryClassValue: leadData.industryClass?.value,
    companySizeRef: leadData.companySizeRef, 
    companySizeValue: leadData.companySize?.value,
    legalFormRef: leadData.legalFormRef,
    legalFormValue: leadData.legalForm?.value,
    accountAnnualRevenueBandRef: leadData.accountAnnualRevenueBandRef,
    accountAnnualRevenueBandValue: leadData.accountAnnualRevenueBand?.value,
    
    // Geographic fields - Using direct fields
    countryRef: leadData.countryRef || leadData.country?.id,
    countryValue: leadData.country?.value,
    regionRef: leadData.regionRef || leadData.region?.id,
    regionValue: leadData.region?.value,
    locality: leadData.locality,
    postalCode: leadData.postalCode,
    addressLine: extractAddressFromObject(leadData.addressLine),
    
    // 🎯 Owner field - Pre-filled with lead's owner
    owner: leadData.ownerEmployeeId, // Main owner field for AccountFormValues
    ownerEmployeeId: leadData.ownerEmployeeId,
    ownerEmployeeName: leadData.ownerEmployee?.displayName,
    description: leadData.description,
    code: leadData.code
  });
  
  console.log('✅ Account initial values calculated:', initialValues);
  return initialValues;
};

export const getContactInitialValues = (leadData: any): Partial<ContactFormValues> => {
  if (!leadData) {
    console.log('⚠️ No lead data available for contact initial values');
    return {};
  }

  console.log('🔍 Mapping lead data to contact initial values:', leadData);
  console.log('🔍 Lead data has keys:', Object.keys(leadData));

  const initialValues = {
    // ===== PERSONAL INFORMATION (from InvestmentLead) =====
    firstName: leadData.firstName || leadData.sourceIndividualName || '', // ✅ Direct mapping
    lastName: leadData.lastName || '', // ✅ Direct mapping
    fullName: leadData.firstName && leadData.lastName 
      ? `${leadData.firstName} ${leadData.lastName}` 
      : (leadData.firstName || leadData.lastName || leadData.sourceIndividualName || ''),
    email: leadData.email || '', // ✅ Direct mapping
    
    // ===== PROFESSIONAL INFORMATION (from InvestmentLead) =====
    jobPosition: leadData.position || '', // ✅ position -> jobPosition mapping
    code: leadData.code || '',
    department: '', // Not available in InvestmentLead - user will need to fill
    
    // ===== CONTACT INFORMATION (from InvestmentLead) =====
    phone: leadData.phoneNumber || '', // ✅ phoneNumber -> phone mapping
    
    // ===== CATALOG REFERENCES (from InvestmentLead) =====
    academicTitleRef: leadData.academicTitleRef || leadData.academicTitle?.id || '', // ✅ academicTitle{id,value} -> academicTitleRef mapping
    languageRef: '', // Not available in InvestmentLead - user will need to select
    
    // ===== OWNER INFORMATION (from InvestmentLead) =====
    ownerEmployeeId: leadData.ownerEmployeeId || leadData.ownerEmployee?.id || '',
    owner: leadData.ownerEmployeeId || leadData.ownerEmployee?.id || '',
    
    // ===== ADDITIONAL INFORMATION (from InvestmentLead) =====
    description: leadData.description || '',
    notesSummary: leadData.description || '', // Use lead description as initial notes
    businessKey: leadData.businessKey || leadData.code || '', // Use businessKey first, fallback to code
    
    // ===== DATE INFORMATION =====
    birthDate: '', // Not available in InvestmentLead - user will need to fill
    
    // ===== SYSTEM FIELDS =====
    additionalProperties: {},
    id: undefined, // New contact
    version: undefined, // New contact
    createdAt: '', // New contact
    createdBy: '', // New contact
  };
  
  // Add debug information about ALL contact field mappings
  console.log('🔍 Complete contact field mappings from InvestmentLead (USER REQUESTED FIELDS):', {
    // ===== USER REQUESTED CORE FIELDS =====
    '✅ firstName': leadData.firstName,
    '✅ lastName': leadData.lastName,
    '✅ email': leadData.email,
    '✅ phoneNumber': leadData.phoneNumber,
    '✅ position (-> jobPosition)': leadData.position,
    
    // ===== USER REQUESTED ACADEMIC TITLE FIELDS =====
    '✅ academicTitleRef': leadData.academicTitleRef,
    '✅ academicTitle.id': leadData.academicTitle?.id,
    '✅ academicTitle.value': leadData.academicTitle?.value,
    
    // ===== ADDITIONAL PERSONAL FIELDS =====
    sourceIndividualName: leadData.sourceIndividualName,
    
    // ===== PROFESSIONAL FIELDS =====
    code: leadData.code,
    businessKey: leadData.businessKey,
    description: leadData.description,
    
    // ===== OTHER CATALOG FIELDS =====
    salutationRef: leadData.salutationRef,
    salutationValue: leadData.salutation?.value,
    
    // ===== OWNER FIELDS - Pre-filled with lead's owner =====
    owner: leadData.ownerEmployeeId, // Main owner field for ContactFormValues
    ownerEmployeeId: leadData.ownerEmployeeId,
    ownerEmployeeName: leadData.ownerEmployee?.displayName
  });
  
  console.log('✅ Contact initial values calculated:', initialValues);
  return initialValues;
};

export const getOpportunityInitialValues = (leadData: any): Partial<InvestmentOpportunityFormValues> => {
  if (!leadData) {
    console.log('⚠️ No lead data available for opportunity initial values');
    return {};
  }

  console.log('🔍 Mapping lead data to opportunity initial values:', leadData);

  const initialValues = {
    // Investment Information (directly from InvestmentLead)
    name: leadData.investmentName || leadData.companyName || '',
    investmentName: leadData.investmentName || '',
    dealType: 'INVESTMENT_DEAL', // Default investment deal type
    code: leadData.code || '',
    businessKey: leadData.businessKey || leadData.code || '',
    
    // Financial Information (directly from InvestmentLead)
    estimatedAmount: leadData.initialInvestmentAmount?.toString() || '',
    forecastedProfitAmount: leadData.forecastedProfitAmount?.toString() || '',
    initialInvestmentAmount: leadData.initialInvestmentAmount?.toString() || '',
    stakePercentage: leadData.stakePercentage?.toString() || '',
    loanAmount: leadData.loanAmount?.toString() || '',
    loanInterestRate: leadData.loanInterestRate?.toString() || '',
    marketValue: leadData.marketValue?.toString() || '',
    requiredCapitalAmount: leadData.requiredCapitalAmount?.toString() || '',
    annualNetColdRent: leadData.annualNetColdRent?.toString() || '',
    
    // Catalog references (use both Ref and ID for maximum compatibility)
    investmentGroupRef: leadData.investmentGroupRef || leadData.investmentGroup?.id || '',
    investmentRoleRef: leadData.investmentRoleRef || leadData.investmentRole?.id || '',
    investmentStakeTypeRef: leadData.investmentStakeTypeRef || leadData.investmentStakeType?.id || '',
    investmentTypeRef: leadData.investmentTypeRef || leadData.investmentType?.id || '',
    
    // Owner information (use ownerEmployeeId for consistency)
    owner: leadData.ownerEmployeeId || leadData.ownerEmployee?.id || '',
    
    // Additional information
    notesSummary: leadData.description || '',
    description: leadData.description || '',
    
    // System fields
    sourceApp: 'IRM',
    recordState: 'ACTIVE',
    additionalProperties: {},
    
    // Fields that need to be filled by user
    currency: '',
    currencyRef: '',
    closeDate: '',
    pipeline: '',
    pipelineStage: '',
    account: '', // Will be filled with created/selected account
    accountId: '', // Will be filled with created/selected account
  };
  
  // Add debug information about catalog values
  console.log('🔍 Catalog mappings for opportunity:', {
    investmentGroupRef: leadData.investmentGroupRef,
    investmentGroupValue: leadData.investmentGroup?.value,
    investmentTypeRef: leadData.investmentTypeRef,
    investmentTypeValue: leadData.investmentType?.value,
    investmentRoleRef: leadData.investmentRoleRef,
    investmentRoleValue: leadData.investmentRole?.value,
    // 🎯 Owner field - Pre-filled with lead's owner
    owner: leadData.ownerEmployeeId, // Main owner field for InvestmentOpportunityFormValues
    ownerEmployeeId: leadData.ownerEmployeeId,
    ownerEmployeeName: leadData.ownerEmployee?.displayName,
    investmentName: leadData.investmentName
  });
  
  console.log('✅ Opportunity initial values calculated:', initialValues);
  return initialValues;
};
