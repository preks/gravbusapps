export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  bio?: string;
  linkedinUrl?: string;
  xingUrl?: string;
  birthDate?: string;
  contactRole?: string;
  contactType?: string;
  academicTitle?: {
    id: string;
    value: string;
  };
  account?: {
    id: string;
    name: string;
  };
  accountId?: string;
  ownerEmployee?: {
    id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    pictureThumbnail?: string;
  };
  sourceApp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactStatisticsData {
  recentContacts: number;
  activeContacts: number;
  totalEmailEngagements: number;
  totalContactsThisYear: number;
}

export interface UseContactListDataReturn {
  contacts: Contact[];
  total: number;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (page: number, pageSize?: number, additionalFilters?: any) => Promise<void>;
  retry: () => void;
}

export interface UseContactStatisticsReturn {
  statistics: ContactStatisticsData;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} 