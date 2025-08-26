import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export type FileManagerEntityType = 'account' | 'contact' | 'lead';

export interface FileManagerEntityRef {
  type: FileManagerEntityType;
  id: string;
}

export interface FileManagerUiOptions {
  initialView?: 'tree' | 'list';
  showFilters?: boolean;
  showColumnConfig?: boolean;
  title?: string;
}

export interface FileManagerPermissions {
  canUpload?: boolean;
  canCreateFolder?: boolean;
  canDelete?: boolean;
  canRename?: boolean;
  canMove?: boolean;
}

export interface FileManagerProps {
  context: BusinessAppContextProps;
  entity: FileManagerEntityRef;
  ui?: FileManagerUiOptions;
  permissions?: FileManagerPermissions;
  'data-testid'?: string;
}

// Normalized document type used internally
export interface DocumentNode {
  id: string;
  version: number;
  name: string;
  createdAt: string;
  expirationDate?: string | null;
  documentType?: { id: string; value: string; code?: string } | null;
  documentGroup?: { id: string; value: string; code?: string } | null;
  file?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  createdBy?: string | null;
  format?: string | null; // 'FILE' or folder-like
  parentDocument?: string | null; // parent folder id
}

export interface DocumentQueryResult {
  documents: DocumentNode[];
}

export const isFileDocument = (doc: DocumentNode): boolean => {
  const fmt = (doc.format || '').toUpperCase();
  return fmt === 'FILE' || !!doc.mimeType || !!doc.file;
};

export const getEntityPayloadKey = (type: FileManagerEntityType): 'account' | 'contact' | 'lead' => {
  return type;
};

export const getEntityGraphQlField = (type: FileManagerEntityType): 'accountId' | 'contactId' | 'leadId' => {
  switch (type) {
    case 'account':
      return 'accountId';
    case 'contact':
      return 'contactId';
    case 'lead':
      return 'leadId';
  }
};

export const getEntityFilesPath = (type: FileManagerEntityType): 'accounts' | 'contacts' | 'leads' => {
  switch (type) {
    case 'account':
      return 'accounts';
    case 'contact':
      return 'contacts';
    case 'lead':
      return 'leads';
  }
};




