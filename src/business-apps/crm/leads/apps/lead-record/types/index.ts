export interface Note {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  important: boolean;
  leadId: string;
}

export interface Opportunity {
  id: string;
  name: string;
  value: number;
  stage: "Discovery" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";
  probability: number;
  expectedCloseDate: string;
  owner: string;
  stageColor: string;
}

export interface Contact {
  id: string;
  version: string;
  email: string;
  name: string;
  phone: string;
  pictureUrl: string;
  jobTitle: string;
}

export interface Lead {
  id: string;
  name: string;
  logo?: string;
  status: string;
  leadName: string;
  version: string;
  statusRef?: string;
  source: {
    id: string;
    type: string;
    value: string;
    code: string;
  };
  sourceRef: string;
  rating: string;
  industryRef?: string;
  industry: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  country?: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  numberOfEmployeesRef?: string;
  numberOfEmployees?: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  companyWebsite: string;
  address: string;
  revenue: string;
  ownerEmployeeId: string;
  ownerEmployee: {
    firstName: string;
    lastName: string;
  }
  ownerOrganization: {
    name: string;
  }
  annualRevenueRef?: string;
  annualRevenue?: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  regionRef?: string;
  legalForm?: string | {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  legalFormRef?: string;
  accountId: string;
  account?: {
    id: string;
    version: string;
    name: string;
    industryRef: string;
    industry: {
      code: string;
      id: string;
      type: string;
      value: string;
    };
    numberOfEmployees: {
      type: string;
      value: string;
      id: string;
      code: string;
    };
    numberOfEmployeesRef: string;
    addressLine: string;
    foundationDate: string;
    annualRevenueRef: string;
    annualRevenue: {
      type: string;
      value: string;
      id: string;
      code: string;
    };
    website: string;
    ownerEmployeeId?: string;
    ownerEmployee?: {
      firstName: string;
      lastName: string;
    };
  } | null;
  leadRating: {
    id: string;
    type: string;
    value: string;
    code: string;
  };
  leadRatingRef: string;
  contact: Contact;
  activities: LeadActivity[];
  opportunities: Opportunity[];
  aiSummary: {
    text: string;
    insights: string[];
    recommendations: string[];
  };
}

export interface LeadActivity {
  id: string;
  version: string;
  title: string;
  leadId: string;
  opportunityId: string;
  ownerEmployeeId: string;
  ownerEmployee: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  description: string;
  activityType: {
    code: string;
    id: string;
    type: string;
    value: string;
  };
}

export interface ReferenceData {
  id: string;
  code: string;
  value: string;
} 