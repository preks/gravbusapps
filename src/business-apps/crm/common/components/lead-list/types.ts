export interface Lead {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  position?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  countryRef?: string;
  country?: {
    id: string;
    code: string;
    value: string;
  };
  regionRef?: string;
  region?: {
    id: string;
    code: string;
    value: string;
  };
  city?: string;
  addressLine?: string;
  postalCode?: string;
  leadSource?: {
    id: string;
    code: string;
    value: string;
  };
  leadStatus?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  leadRating?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  industry?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  ownerEmployeeId?: string;
  ownerEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    picture?: string | null;
    pictureThumbnail?: string | null;
  };
  account?: {
    id: string;
    name: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    pictureUrl: string;
    pictureThumbnailUrl: string;
  };
}

export interface LeadQueryVariables {
  offset?: number;
  limit?: number;
  orderBy?: Array<any>;
  where?: any;
}

export interface LeadListResponse {
  Lead: Lead[];
  LeadAggregate: {
    aggregate: {
      count: number;
    };
  };
}
