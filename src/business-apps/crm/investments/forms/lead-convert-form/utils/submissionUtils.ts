import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'; // Still used in cancelConversionForm
import { ConvertLeadFormData, ConvertLeadFormDataLegacy } from '../types';
import { AccountFormValues } from '../../account-form/types';
import { ContactFormValues } from '../../contact-form/types';
import { InvestmentOpportunityFormValues } from '../../opportunity-form/types';

export const createSubmissionPayload = (
  data: ConvertLeadFormData,
  completeAccountData: Partial<AccountFormValues>,
  completeContactData: Partial<ContactFormValues>,
  completeOpportunityData: Partial<InvestmentOpportunityFormValues>,
  actualLeadId: string
) => {
  // Convert new form data to legacy format for submission - only using fields that exist in schema
  const legacyFormData: ConvertLeadFormDataLegacy = {
    accountOption: data.accountOption,
    selectedAccountId: data.selectedAccountId,
    selectedAccountName: data.selectedAccountName,
    accountData: {
      accountName: data.accountName,
      owner: data.accountOwner,
      legalForm: data.accountLegalForm,
      industry: data.accountIndustry,
      // Use basic fields from schema only
      email: data.accountName, // Will be populated by form wrapper
      phone: '', // Will be populated by form wrapper
    },
    contactOption: data.contactOption,
    selectedContactId: data.selectedContactId,
    selectedContactName: data.selectedContactName,
    contactData: {
      firstName: data.contactFirstName,
      lastName: data.contactLastName,
      email: data.contactEmail,
      ownerEmployeeId: data.contactOwnerEmployeeId,
      // Additional fields will be populated by form wrappers
    },
    createOpportunity: data.createOpportunity,
    opportunityData: {
      name: data.opportunityName,
      owner: data.opportunityOwner,
      pipeline: data.opportunityPipeline,
      pipelineStage: data.opportunityPipelineStage,
      estimatedAmount: data.opportunityEstimatedAmount,
      currency: data.opportunityCurrency,
      // Additional fields will be populated by form wrappers
    },
  };

  // Build the payload following the Investment API structure and expected schema
  const payload: any = {
    leadId: actualLeadId,
  };

  // Handle Account (following CRM pattern: minimal for match, complete for create)
  if (legacyFormData.accountOption === 'match' && legacyFormData.selectedAccountId) {
    // CRM pattern: For matching existing account, only send id and ownerEmployee
    payload.account = {
      id: legacyFormData.selectedAccountId,
      ownerEmployee: legacyFormData.accountData.owner || null,
    };
  } else if (legacyFormData.accountOption === 'create') {
    // For creating new account, use exact fields from current AccountFormComponent
    payload.account = {
      sourceApp: "IRM",
      name: completeAccountData.accountName || legacyFormData.accountData.accountName,
      code: completeAccountData.tickerSymbol || null,
      legalFormRef: completeAccountData.legalForm || null,
      industryClassRef: completeAccountData.industry || null,
      website: completeAccountData.website || null,
      mission: completeAccountData.description || null, // AccountFormComponent maps description → mission
      phone: completeAccountData.phone || null,
      email: completeAccountData.email || null,
      geographicPresence: completeAccountData.geographicPresence || null,
      accountAnnualRevenueBandRef: completeAccountData.annualRevenue || null,
      companySizeRef: completeAccountData.numberOfEmployees || null,
      foundationDate: completeAccountData.foundationDate || null,
      ownerEmployee: completeAccountData.owner || null,
      // Address and geographic information (filter and format like AccountFormComponent)
      addresses: completeAccountData.addresses?.filter(addr => 
        // Only include addresses that have some content
        addr.addressLines.some(line => line.trim()) || 
        addr.postalCode.trim() || 
        addr.locality.trim() ||
        addr.regionRef.trim() ||
        addr.countryRef.trim()
      ).map(addr => {
        const addressPayload: any = {
          addressType: "PRIMARY_ADDRESS", // Always set to PRIMARY_ADDRESS
          addressLine: addr.addressLines.filter(line => line.trim()).length > 0 
            ? { lines: addr.addressLines.filter(line => line.trim()) }
            : null,
          postalCode: addr.postalCode.trim() || null,
          locality: addr.locality.trim() || null,
          regionRef: addr.regionRef.trim() || null,
          countryRef: addr.countryRef.trim() || null,
        };

        // ✅ FIXED: Don't include ID for new accounts (lead conversion always creates new accounts)
        // This prevents the "default-address" ID from being sent to the backend
        // The backend will generate proper UUIDs for new addresses

        return addressPayload;
      }) || [],
      countryRef: completeAccountData.country || null,
      regionRef: completeAccountData.region || null,
      addressLine1: completeAccountData.addressLine1 || null,
      addressLine2: completeAccountData.addressLine2 || null,
      addressLine3: completeAccountData.addressLine3 || null,
      addressLine4: completeAccountData.addressLine4 || null,
      postalCode: completeAccountData.postalCode || null,
      city: completeAccountData.city || null,
      state: completeAccountData.state || null,
      // Fields not captured in current form but part of Investment schema
      specialty: null,
      liquidationDate: null,
      picture: null,
      pictureThumbnail: null,
      tags: [], // AccountFormComponent initializes this
    };
  }

  // Handle Contact (following CRM pattern: minimal for match, complete for create)
  if (legacyFormData.contactOption === 'match' && legacyFormData.selectedContactId) {
    // CRM pattern: For matching existing contact, only send id
    payload.contact = {
      id: legacyFormData.selectedContactId,
    };
  } else if (legacyFormData.contactOption === 'create') {
    // For creating new contact, use exact fields from current ContactFormComponent
    payload.contact = {
      firstName: completeContactData.firstName || legacyFormData.contactData.firstName,
      lastName: completeContactData.lastName || legacyFormData.contactData.lastName,
      fullName: completeContactData.fullName || `${legacyFormData.contactData.firstName || ""} ${legacyFormData.contactData.lastName || ""}`.trim(),
      type: completeContactData.type || 'UNKNOWN_CONTACT', // ✅ ADDED: Contact type field
      birthDate: completeContactData.birthDate || null,
      description: completeContactData.description || null,
      jobPosition: completeContactData.jobPosition || null,
      department: completeContactData.department || null,
      code: completeContactData.code || null,
      email: completeContactData.email || legacyFormData.contactData.email || null,
      phone: completeContactData.phone || null,
      ownerEmployee: completeContactData.ownerEmployeeId || legacyFormData.contactData.ownerEmployeeId || null,
      notesSummary: completeContactData.notesSummary || null,
      businessKey: completeContactData.businessKey || null,
      academicTitleRef: completeContactData.academicTitleRef || null,
      languageRef: completeContactData.languageRef || null,
      additionalProperties: completeContactData.additionalProperties || {},
    };

    // ✅ ADDED: Add communication channels for LinkedIn and Xing (matching ContactFormComponent)
    const communicationChannels = [];
    
    // Add LinkedIn communication channel if provided
    if (completeContactData.linkedinUrl && completeContactData.linkedinUrl.trim()) {
      communicationChannels.push({
        communicationChannelRef: "CommunicationChannel:v1:LinkedIn",
        value: completeContactData.linkedinUrl.trim(),
        valueExtension: null,
        source: "FORM_INPUT",
        activeFrom: new Date().toISOString(),
        activeTo: null,
      });
    }
    
    // Add Xing communication channel if provided
    if (completeContactData.xingUrl && completeContactData.xingUrl.trim()) {
      communicationChannels.push({
        communicationChannelRef: "CommunicationChannel:v1:Xing",
        value: completeContactData.xingUrl.trim(),
        valueExtension: null,
        source: "FORM_INPUT",
        activeFrom: new Date().toISOString(),
        activeTo: null,
      });
    }

    // Add communication channels to payload if any exist
    if (communicationChannels.length > 0) {
      payload.contact.communicationChannels = communicationChannels;
    }
  }

  // Handle Opportunity (using exact fields from current OpportunityFormComponent)
  if (legacyFormData.createOpportunity) {
    payload.opportunity = {
      sourceApp: "IRM",
      
      // Basic information (matching OpportunityFormComponent exactly)
      name: completeOpportunityData.name || legacyFormData.opportunityData.name,
      investmentName: completeOpportunityData.name || legacyFormData.opportunityData.name, // Same as name
      code: completeOpportunityData.code || null,
      businessKey: completeOpportunityData.businessKey || null,
      dealType: completeOpportunityData.dealType || "INVESTMENT_DEAL",
      
      // Financial information
      estimatedAmount: completeOpportunityData.estimatedAmount 
        ? parseFloat(completeOpportunityData.estimatedAmount) 
        : (legacyFormData.opportunityData.estimatedAmount 
            ? parseFloat(legacyFormData.opportunityData.estimatedAmount) 
            : undefined),
      currencyRef: completeOpportunityData.currencyRef || completeOpportunityData.currency || legacyFormData.opportunityData.currency || null,
      closeDate: completeOpportunityData.closeDate || null,
      
      // Pipeline information (correct field names from OpportunityFormComponent)
      opportunityPipelineRef: completeOpportunityData.pipeline || legacyFormData.opportunityData.pipeline || null,
      opportunityPipelineStageRef: completeOpportunityData.pipelineStage || legacyFormData.opportunityData.pipelineStage || null,
      
      // Status - Always set to OPEN for new opportunities created during lead conversion
      opportunityStatusRef: "InvestmentOpportunityStatus:v1:OPEN",
      
      // Notes summary
      notesSummary: completeOpportunityData.notesSummary || null,
      
      // Investment-specific financial fields (exact from OpportunityFormComponent)
      initialInvestmentAmount: completeOpportunityData.initialInvestmentAmount 
        ? parseFloat(completeOpportunityData.initialInvestmentAmount) 
        : undefined,
      forecastedProfitAmount: completeOpportunityData.forecastedProfitAmount 
        ? parseFloat(completeOpportunityData.forecastedProfitAmount) 
        : undefined,
      loanAmount: completeOpportunityData.loanAmount 
        ? parseFloat(completeOpportunityData.loanAmount) 
        : undefined,
      loanInterestRate: completeOpportunityData.loanInterestRate 
        ? parseFloat(completeOpportunityData.loanInterestRate) 
        : undefined,
      marketValue: completeOpportunityData.marketValue 
        ? parseFloat(completeOpportunityData.marketValue) 
        : undefined,
      requiredCapitalAmount: completeOpportunityData.requiredCapitalAmount 
        ? parseFloat(completeOpportunityData.requiredCapitalAmount) 
        : undefined,
      stakePercentage: completeOpportunityData.stakePercentage 
        ? parseFloat(completeOpportunityData.stakePercentage) 
        : undefined,
      annualNetColdRent: completeOpportunityData.annualNetColdRent 
        ? parseFloat(completeOpportunityData.annualNetColdRent) 
        : undefined,
      
      // Investment classification (catalog references from OpportunityFormComponent)
      investmentGroupRef: completeOpportunityData.investmentGroupRef || null,
      investmentTypeRef: completeOpportunityData.investmentTypeRef || null,
      investmentRoleRef: completeOpportunityData.investmentRoleRef || null,
      investmentStakeTypeRef: completeOpportunityData.investmentStakeTypeRef || null,
      
      // Relationships
      ownerEmployee: completeOpportunityData.owner || legacyFormData.opportunityData.owner || null,
      account: legacyFormData.selectedAccountId || completeOpportunityData.accountId || completeOpportunityData.account || null,
      
      // Additional fields from form
      description: completeOpportunityData.description || null,
      recordState: completeOpportunityData.recordState || "ACTIVE",
      
      // Additional properties (empty object as per OpportunityFormComponent)
      additionalProperties: completeOpportunityData.additionalProperties || {},
    };
  }

  return payload;
};

export const submitConversionForm = (payload: any, onSuccess?: (payload: any) => void) => {
  // NOTE: AppActionForm will handle dispatchProcessContinueEvent automatically
  // We don't need to call it here to avoid double execution
  
  // Trigger onSuccess to close modal
  if (onSuccess) {
    onSuccess(payload);
  }
};

export const cancelConversionForm = () => {
  // Use same cancel pattern as CRM convert lead form
  dispatchProcessContinueEvent("pse_pause", {});
};
