import React, { useMemo, useState } from 'react';
import { Button, Input, Alert, AlertDescription, Spinner, Textarea, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useDocumentCatalogs } from '@/business-apps/crm/common/forms/document-upload-form/hooks/useDocumentCatalogs';
import { fileClient } from '@/common/network/files/FileClient';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export type InvestmentDocumentEntityType = 'account' | 'contact' | 'lead' | 'opportunity';

export interface InvestmentDocumentCreationPopupValues {
  entityType: InvestmentDocumentEntityType;
  entityId: string;
  parentDocument?: string | null;
  folder: boolean;
  name?: string;
}

export interface InvestmentDocumentCreationPopupProps extends BusinessAppContextProps {
  initialValues?: Partial<InvestmentDocumentCreationPopupValues>;
}

const prefixDataTestId = 'InvestmentDocumentCreationPopup';

const InvestmentDocumentCreationPopup: React.FC<InvestmentDocumentCreationPopupProps> = ({ initialValues = {}, ...props }) => {
  const values = useMemo<InvestmentDocumentCreationPopupValues>(() => {
    const src = { ...(props as any), ...(initialValues as any) } as any;
    const ad = src?.additionalData || {};
    const payload = ad?.payload || ad?.psi_taskPayload?.psi_initialParameters?.payload || ad?.psi_taskPayload?.initialParameters?.payload || {};
    const invFromAd = ad?.investmentDocument || ad?.psi_taskPayload?.psi_initialParameters?.investmentDocument || ad?.psi_taskPayload?.initialParameters?.investmentDocument || payload?.investmentDocument;
    const inv = src?.investmentDocument || invFromAd || {};
    const accountId = src?.accountId || src?.account || inv?.account || '';
    const contactId = src?.contactId || src?.contact || inv?.contact || '';
    const leadId = src?.leadId || src?.lead || inv?.lead || '';
    const opportunityId = src?.opportunityId || src?.opportunity || inv?.opportunity || '';

    let entityType: InvestmentDocumentEntityType = 'account';
    let entityId = '';
    if (accountId) { entityType = 'account'; entityId = String(accountId); }
    else if (contactId) { entityType = 'contact'; entityId = String(contactId); }
    else if (leadId) { entityType = 'lead'; entityId = String(leadId); }
    else if (opportunityId) { entityType = 'opportunity'; entityId = String(opportunityId); }

    const computedFolder = Boolean(
      src?.folder === true || src?.createFolder === true || src?.createFolder === 'true' ||
      (ad?.folder === true) || (ad?.createFolder === true) || (ad?.createFolder === 'true') ||
      (ad?.psi_taskPayload?.psi_initialParameters?.createFolder === true) ||
      (ad?.psi_taskPayload?.psi_initialParameters?.createFolder === 'true') ||
      (ad?.psi_taskPayload?.initialParameters?.createFolder === true) ||
      (ad?.psi_taskPayload?.initialParameters?.createFolder === 'true') ||
      (payload?.folder === true) || (payload?.createFolder === true) || (payload?.createFolder === 'true') ||
      (inv?.format === 'FOLDER')
    );
    const parentDocument = src?.parentDocument ?? ad?.parentDocument ?? ad?.psi_taskPayload?.psi_initialParameters?.parentDocument ?? ad?.psi_taskPayload?.initialParameters?.parentDocument ?? payload?.parentDocument ?? inv?.parentDocument ?? null;
    const name = inv?.name ?? src?.name ?? '';

    return { entityType, entityId, parentDocument, folder: computedFolder, name } as InvestmentDocumentCreationPopupValues;
  }, [initialValues, props]);

  const [name, setName] = useState<string>(values.name || '');
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentGroupRef, setDocumentGroupRef] = useState<string>('');
  const [documentTypeRef, setDocumentTypeRef] = useState<string>('');
  const [parentFolderId, setParentFolderId] = useState<string>(values.parentDocument || '');
  const { documentGroups, filteredDocumentTypes } = useDocumentCatalogs(props.accessToken || '', documentGroupRef);
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [groupOpen, setGroupOpen] = useState<boolean>(false);
  const [typeOpen, setTypeOpen] = useState<boolean>(false);
  const [parentOpen, setParentOpen] = useState<boolean>(false);
  const [parentFolders, setParentFolders] = useState<{ id: string; name: string }[]>([]);
  const [parentLoading, setParentLoading] = useState<boolean>(false);
  const graphqlClient = useGraphQLClient(props.accessToken || '');

  // Determine if we are in rename mode via additionalData / payload
  const renameMode = useMemo(() => {
    const src = { ...(props as any), ...(initialValues as any) } as any;
    const ad = src?.additionalData || {};
    const payload = ad?.payload || ad?.psi_taskPayload?.psi_initialParameters?.payload || ad?.psi_taskPayload?.initialParameters?.payload || {};
    const modeFromAd = ad?.mode || ad?.psi_taskPayload?.psi_initialParameters?.mode || ad?.psi_taskPayload?.initialParameters?.mode;
    return (src?.mode === 'rename') || (payload?.mode === 'rename') || (modeFromAd === 'rename');
  }, [initialValues, props]);

  React.useEffect(() => {
    if (renameMode) return; // no need to load folders for simple rename
    const loadParents = async () => {
      if (!props.accessToken || !values.entityId) return;
      setParentLoading(true);
      try {
        const idField = (() => {
          switch (values.entityType) {
            case 'account': return 'account';
            case 'contact': return 'contact';
            case 'lead': return 'lead';
            case 'opportunity': return 'opportunity';
            default: return 'account';
          }
        })();
        const query = `
          query GetParentFolders($id: uuid!) {
            InvestmentDocument(where: { ${idField}: { id: { _eq: $id } }, format: { _eq: "FOLDER" }, isDeleted: { _eq: false } }) {
              id
              name
            }
          }
        `;
        const result = await graphqlClient.request<{ InvestmentDocument: { id: string; name: string }[] }>(query, { id: values.entityId });
        setParentFolders(Array.isArray(result?.InvestmentDocument) ? result.InvestmentDocument : []);
      } catch (e) {
        setParentFolders([]);
      } finally {
        setParentLoading(false);
      }
    };
    loadParents();
  }, [props.accessToken, values.entityId, values.entityType, graphqlClient, renameMode]);

  const isUpdateMode = !!(initialValues as any)?.investmentDocument?.id;
  const title = useMemo(() => {
    if (renameMode) return 'Rename Document';
    return isUpdateMode ? 'Update Document' : (values.folder ? 'Create Folder' : 'Create Document');
  }, [isUpdateMode, values.folder, renameMode]);
  const actionLabel = useMemo(() => (renameMode ? 'Save' : (isUpdateMode ? 'Save' : 'Create')), [isUpdateMode, renameMode]);

  const entityIdKey = useMemo(() => {
    switch (values.entityType) {
      case 'account': return 'accountId';
      case 'contact': return 'contactId';
      case 'lead': return 'leadId';
      case 'opportunity': return 'opportunityId';
      default: return 'accountId';
    }
  }, [values.entityType]);

  const getExtensionFromFile = (f: File): string | null => {
    const match = /\.([^.]+)$/.exec(f.name || '');
    if (match && match[1]) return match[1].toLowerCase();
    const map: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'text/plain': 'txt',
      'text/csv': 'csv',
      'application/json': 'json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/vnd.ms-powerpoint': 'ppt',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/zip': 'zip',
    };
    return map[f.type] || null;
  };

  const ensureNameHasExtension = (baseName: string, f?: File | null): string => {
    const nameHasExt = /\.[^.]+$/.test(baseName);
    if (nameHasExt) return baseName;
    if (f) {
      const ext = getExtensionFromFile(f);
      if (ext) return `${baseName}.${ext}`;
    }
    return baseName;
  };

  const handleSubmit = async () => {
    setError(null);
    const trimmed = (name || '').trim();
    if (!trimmed) {
      setError('Please provide a name.');
      return;
    }
    if (!renameMode && !values.folder && !file) {
      setError('Please select a file.');
      return;
    }
    try {
      setSubmitting(true);
      const entityBindingKey = (() => {
        switch (values.entityType) {
          case 'account': return 'account';
          case 'contact': return 'contact';
          case 'lead': return 'lead';
          case 'opportunity': return 'opportunity';
          default: return 'account';
        }
      })();

      const source = { ...(props as any), ...(initialValues as any) } as any;
      const urlParams = new URLSearchParams(window.location.search);
      const idFromUrl = (() => {
        switch (values.entityType) {
          case 'account': return urlParams.get('accountId');
          case 'contact': return urlParams.get('contactId');
          case 'lead': return urlParams.get('leadId');
          case 'opportunity': return urlParams.get('opportunityId');
          default: return null;
        }
      })();
      const resolvedId = values.entityId || source?.investmentDocument?.[entityBindingKey] || source?.[entityBindingKey] || source?.accountId || source?.contactId || source?.leadId || source?.opportunityId || source?.account || source?.contact || source?.lead || source?.opportunity || idFromUrl || '';

      const investmentDocument: Record<string, any> = { [entityBindingKey]: resolvedId };

      if (renameMode || (initialValues && (initialValues as any)?.investmentDocument?.id)) {
        const existing = (initialValues as any)?.investmentDocument || {};
        investmentDocument.id = existing.id;
        investmentDocument.version = existing.version ?? 0;
        investmentDocument.name = trimmed;
        if (parentFolderId || values.parentDocument) {
          investmentDocument.parentDocument = parentFolderId || values.parentDocument;
        }
      } else {
        investmentDocument.version = 0;
        investmentDocument.name = values.folder ? trimmed : ensureNameHasExtension(trimmed, file);
        investmentDocument.parentDocument = (parentFolderId || values.parentDocument) || undefined;
        investmentDocument.format = values.folder ? 'FOLDER' : 'FILE';
      }

      if (!renameMode) {
        if (documentGroupRef) investmentDocument.documentGroupRef = documentGroupRef;
        if (documentTypeRef) investmentDocument.documentTypeRef = documentTypeRef;
        if (description) investmentDocument.description = description;
      }

      if (!renameMode && !values.folder && file) {
        if (props.accessToken) {
          fileClient.setAccessToken(props.accessToken);
        }
        const folderEntity = (() => {
          switch (values.entityType) {
            case 'account': return 'accounts';
            case 'contact': return 'contacts';
            case 'lead': return 'leads';
            case 'opportunity': return 'opportunities';
            default: return 'accounts';
          }
        })();

        const pathParams = { accessScope: 'public' } as const;
        const queryParams = { appName: 'irm', folderPath: `/${folderEntity}/${resolvedId}/documents` } as const;
        const uploadResponse = await fileClient.uploadFile(file, pathParams, queryParams);
        investmentDocument.file = uploadResponse.fileInfo.fileId;
        investmentDocument.fileSize = file.size;
        investmentDocument.mimeType = file.type || undefined;
      }

      dispatchProcessContinueEvent('pse_submit', {
        [entityIdKey]: resolvedId,
        folder: values.folder,
        name: trimmed,
        parentDocument: investmentDocument.parentDocument,
        investmentDocument,
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to submit');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {});
  };

  return (
    <div className="gba:max-w-md gba:mx-auto gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
      {error && (
        <Alert variant="destructive" className="gba:mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="gba:mb-4">
        <h2 className="gba:text-xl gba:font-semibold" data-testid={formatDataTestId(prefixDataTestId, 'Title')}>{title}</h2>
      </div>

      {renameMode ? (
        <div className="gba:mb-4">
          <Input
            placeholder="Document name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid={formatDataTestId(prefixDataTestId, 'RenameNameInput')}
          />
        </div>
      ) : values.folder ? (
        <div className="gba:mb-4">
          <Input
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
          />
        </div>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-3 gba:mb-4">
          <Input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              if (f && !name) {
                setName(f.name);
              }
            }}
            data-testid={formatDataTestId(prefixDataTestId, 'FileInput')}
          />
          <div className="gba:flex gba:flex-col gba:gap-2">
            <label className="gba:text-sm">Document Group</label>
            <Select value={documentGroupRef || undefined} onValueChange={(v) => { setDocumentGroupRef(v as string); setDocumentTypeRef(''); }} data-testid={formatDataTestId(prefixDataTestId, 'DocumentGroupSelect')} open={groupOpen} onOpenChange={setGroupOpen}>
              <SelectTrigger>
                <SelectValue placeholder="Select group..." />
              </SelectTrigger>
              <SelectContent className="gba:z-[10000]" style={{ zIndex: 100000 }}>
                {documentGroups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gba:flex gba:flex-col gba:gap-2">
            <label className="gba:text-sm">Document Type</label>
            <Select value={documentTypeRef || undefined} onValueChange={(v) => setDocumentTypeRef(v as string)} data-testid={formatDataTestId(prefixDataTestId, 'DocumentTypeSelect')} open={typeOpen} onOpenChange={setTypeOpen}>
              <SelectTrigger disabled={!documentGroupRef} onClick={() => { if (!documentGroupRef) return; }}>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent className="gba:z-[10000]" style={{ zIndex: 100000 }}>
                {filteredDocumentTypes.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gba:flex gba:flex-col gba:gap-2">
            <label className="gba:text-sm">Parent Folder (optional)</label>
            <Select value={parentFolderId || undefined} onValueChange={(v) => setParentFolderId(v as string)} data-testid={formatDataTestId(prefixDataTestId, 'ParentFolderSelect')} open={parentOpen} onOpenChange={setParentOpen}>
              <SelectTrigger>
                <SelectValue placeholder={parentLoading ? 'Loading...' : 'Select parent...'} />
              </SelectTrigger>
              <SelectContent className="gba:z-[10000]" style={{ zIndex: 100000 }}>
                {parentFolders.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Document name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid={formatDataTestId(prefixDataTestId, 'DescriptionInput')}
          />
        </div>
      )}

      <div className="gba:flex gba:gap-3">
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={submitting}
          data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={submitting || !name.trim()}
          data-testid={formatDataTestId(prefixDataTestId, 'CreateButton')}
        >
          {submitting ? <Spinner size="sm" /> : actionLabel}
        </Button>
      </div>
    </div>
  );
};

export default InvestmentDocumentCreationPopup;
export { InvestmentDocumentCreationPopup };


