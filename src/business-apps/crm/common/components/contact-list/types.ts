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
  pictureUrl?: string;
  pictureThumbnailUrl?: string;
  academicTitle?: {
    id: string;
    value: string;
    objectValue?: any;
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

export interface UseContactListDataReturn {
  contacts: Contact[];
  total: number;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (
    page: number,
    pageSize?: number,
    additionalFilters?: any
  ) => Promise<void>;
  retry: () => void;
}
