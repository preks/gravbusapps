export interface RolePermission {
  upload: boolean;
  download: boolean;
  view: boolean;
  edit: boolean;
  delete: boolean;
}

import { JSONValue } from '@/common/types/i18nTypes';

export interface DocumentType {
  parentEntryId: string;
  code: string;
  value: string;
  additionalValue1: string;
  objectValue: JSONValue | Record<string, any>; // Made more flexible
  catalogEntryLocalId: string;
  localeCode: string;
  id: string; // This will be constructed, e.g., DocumentType:v1:code
}

export interface Module {
  id: string;
  name: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}
