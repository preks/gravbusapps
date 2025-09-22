import React, { useMemo, useState, useEffect } from 'react';
import { Input, Textarea, Select, SelectTrigger, SelectContent, SelectItem, SelectValue, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system';
import { useForm } from 'react-hook-form';
import { AppActionForm } from '@/components/app-action-form/AppActionForm';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useDocumentCatalogs } from '@/business-apps/crm/common/forms/document-upload-form/hooks/useDocumentCatalogs';
import { fileClient } from '@/common/network/files/FileClient';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export type InvestmentDocumentEntityType = 'account' | 'contact' | 'lead' | 'opportunity';

export interface DocumentPopupValues {
  entityType: InvestmentDocumentEntityType;
  entityId: string;
  parentDocument?: string | null;
  folder: boolean;
  name: string;
  file?: File | null;
  documentGroupRef?: string;
  documentTypeRef?: string;
  description?: string;
}

export interface DocumentPopupProps extends BusinessAppContextProps {
  initialValues?: Partial<DocumentPopupValues>;
}

const prefixDataTestId = 'DocumentPopup';

const DocumentPopup: React.FC<DocumentPopupProps> = ({ initialValues = {}, ...props }) => {
  const contextValues = useMemo(() => {
    const src = { ...(props as any), ...(initialValues as any) } as any;
    const ad = src?.additionalData || {};
    const payload = ad?.payload || ad?.psi_taskPayload?.psi_initialParameters?.payload || ad?.psi_taskPayload?.initialParameters?.payload || {};
    const invFromAd = ad?.investmentDocument || ad?.psi_taskPayload?.psi_initialParameters?.investmentDocument || ad?.psi_taskPayload?.initialParameters?.investmentDocument || payload?.investmentDocument;
    const inv = src?.investmentDocument || invFromAd || {};
    
    // Also check URL parameters for entity IDs
    const urlParams = new URLSearchParams(window.location.search);
    
    const accountId = src?.accountId || src?.account || inv?.account || urlParams.get('accountId') || '';
    const contactId = src?.contactId || src?.contact || inv?.contact || urlParams.get('contactId') || '';
    const leadId = src?.leadId || src?.lead || inv?.lead || urlParams.get('leadId') || '';
    const opportunityId = src?.opportunityId || src?.opportunity || inv?.opportunity || urlParams.get('opportunityId') || '';

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

    return { entityType, entityId, parentDocument, folder: computedFolder, name };
  }, [initialValues, props]);

  // Form setup
  const form = useForm<DocumentPopupValues>({
    defaultValues: {
      entityType: contextValues.entityType,
      entityId: contextValues.entityId,
      parentDocument: contextValues.parentDocument || '',
      folder: contextValues.folder,
      name: contextValues.name || '',
      file: null,
      documentGroupRef: '',
      documentTypeRef: '',
      description: ''
    }
  });

  const watchedDocumentGroupRef = form.watch('documentGroupRef');
  const watchedFolder = form.watch('folder');
  
  // For IRM (investments), use the Investment-specific catalogs
  const { documentGroups, filteredDocumentTypes } = useDocumentCatalogs(
    props.accessToken || '',
    watchedDocumentGroupRef || '',
    { groupCatalogIdentifier: 'InvestmentDocumentGroup', typeCatalogIdentifier: 'InvestmentDocumentType' }
  );

  // Note: renameMode is defined later; we'll set defaults after renameMode is computed in a later effect
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

  // Auto-select defaults when catalogs and renameMode state are known
  useEffect(() => {
    if (renameMode || watchedFolder) return;
    const currentGroup = form.getValues('documentGroupRef');
    if (!currentGroup && Array.isArray(documentGroups) && documentGroups.length > 0) {
      form.setValue('documentGroupRef', documentGroups[0].id);
    }
  }, [documentGroups, form, renameMode, watchedFolder]);

  useEffect(() => {
    if (renameMode || watchedFolder) return;
    const currentType = form.getValues('documentTypeRef');
    const hasGroup = !!form.getValues('documentGroupRef');
    if (hasGroup && !currentType && Array.isArray(filteredDocumentTypes) && filteredDocumentTypes.length > 0) {
      form.setValue('documentTypeRef', filteredDocumentTypes[0].id);
    }
  }, [filteredDocumentTypes, form, renameMode, watchedFolder]);

  useEffect(() => {
    if (renameMode) return; // no need to load folders for simple rename
    const loadParents = async () => {
      if (!props.accessToken || !contextValues.entityId) return;
      setParentLoading(true);
      try {
        const idField = (() => {
          switch (contextValues.entityType) {
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
        const result = await graphqlClient.request<{ InvestmentDocument: { id: string; name: string }[] }>(query, { id: contextValues.entityId });
        setParentFolders(Array.isArray(result?.InvestmentDocument) ? result.InvestmentDocument : []);
      } catch (e) {
        setParentFolders([]);
      } finally {
        setParentLoading(false);
      }
    };
    loadParents();
  }, [props.accessToken, contextValues.entityId, contextValues.entityType, graphqlClient, renameMode]);

  const isUpdateMode = !!(initialValues as any)?.investmentDocument?.id;
  const title = useMemo(() => {
    if (renameMode) return 'Rename Document';
    return isUpdateMode ? 'Update Document' : (contextValues.folder ? 'Create Folder' : 'Create Document');
  }, [isUpdateMode, contextValues.folder, renameMode]);
  const actionLabel = useMemo(() => (renameMode ? 'Save' : (isUpdateMode ? 'Save' : 'Create')), [isUpdateMode, renameMode]);

  const entityIdKey = useMemo(() => {
    switch (contextValues.entityType) {
      case 'account': return 'accountId';
      case 'contact': return 'contactId';
      case 'lead': return 'leadId';
      case 'opportunity': return 'opportunityId';
      default: return 'accountId';
    }
  }, [contextValues.entityType]);

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

  // File upload handler for pre-submit
  const handleFileUpload = async (formData: DocumentPopupValues) => {
    if (!renameMode && !formData.folder && formData.file && props.accessToken) {
      fileClient.setAccessToken(props.accessToken);
      
      const entityBindingKey = (() => {
        switch (contextValues.entityType) {
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
        switch (contextValues.entityType) {
          case 'account': return urlParams.get('accountId');
          case 'contact': return urlParams.get('contactId');
          case 'lead': return urlParams.get('leadId');
          case 'opportunity': return urlParams.get('opportunityId');
          default: return null;
        }
      })();
      // Debug all potential ID sources
      console.log('DEBUG: contextValues =', contextValues);
      console.log('DEBUG: entityBindingKey =', entityBindingKey);
      console.log('DEBUG: source =', source);
      console.log('DEBUG: idFromUrl =', idFromUrl);
      console.log('DEBUG: urlParams =', Object.fromEntries(urlParams.entries()));
      
      const resolvedId = contextValues.entityId || source?.investmentDocument?.[entityBindingKey] || source?.[entityBindingKey] || source?.accountId || source?.contactId || source?.leadId || source?.opportunityId || source?.account || source?.contact || source?.lead || source?.opportunity || idFromUrl || '';
      
      const folderEntity = (() => {
        switch (contextValues.entityType) {
          case 'account': return 'accounts';
          case 'contact': return 'contacts';
          case 'lead': return 'leads';
          case 'opportunity': return 'opportunities';
          default: return 'accounts';
        }
      })();

      // Debug and sanitize the resolvedId to match the required regex pattern ^(/[\w_-]{1,256})+$
      console.log('DEBUG: resolvedId =', resolvedId);
      console.log('DEBUG: folderEntity =', folderEntity);
      
      // Ensure resolvedId exists and sanitize it
      if (!resolvedId || resolvedId.trim() === '') {
        throw new Error('Entity ID is required for file upload');
      }
      
      const sanitizedId = resolvedId.replace(/[^\w-]/g, '_'); // Replace non-word/non-hyphen chars with underscore
      const folderPath = `/${folderEntity}/${sanitizedId}/documents`;
      
      console.log('DEBUG: sanitizedId =', sanitizedId);
      console.log('DEBUG: final folderPath =', folderPath);
      
      // Validate the folder path matches the expected regex
      const folderPathRegex = /^(\/[\w_-]{1,256})+$/;
      if (!folderPathRegex.test(folderPath)) {
        console.error('ERROR: folderPath does not match regex:', folderPath);
        throw new Error(`Invalid folder path format: ${folderPath}`);
      }
      
      const pathParams = { accessScope: 'public' } as const;
      const queryParams = { appName: 'irm', folderPath } as const;
      return await fileClient.uploadFile(formData.file, pathParams, queryParams);
    }
    return null;
  };

  // Pre-submit handler to upload the file and attach fileInfo to form data
  const handlePreSubmit = async (formData: DocumentPopupValues) => {
    const uploadResponse = await handleFileUpload(formData);
    if (uploadResponse) {
      // Attach full fileInfo so submit can pass it to the process payload
      return { ...(formData as any), _fileUploadResponse: uploadResponse } as any;
    }
    return formData;
  };

  // Submit handler for AppActionForm
  const handleSubmit = async (formData: DocumentPopupValues) => {
    const entityBindingKey = (() => {
      switch (contextValues.entityType) {
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
      switch (contextValues.entityType) {
        case 'account': return urlParams.get('accountId');
        case 'contact': return urlParams.get('contactId');
        case 'lead': return urlParams.get('leadId');
        case 'opportunity': return urlParams.get('opportunityId');
        default: return null;
      }
    })();
    const resolvedId = contextValues.entityId || source?.investmentDocument?.[entityBindingKey] || source?.[entityBindingKey] || source?.accountId || source?.contactId || source?.leadId || source?.opportunityId || source?.account || source?.contact || source?.lead || source?.opportunity || idFromUrl || '';

    const investmentDocument: Record<string, any> = { [entityBindingKey]: resolvedId };

    if (renameMode || (initialValues && (initialValues as any)?.investmentDocument?.id)) {
      const existing = (initialValues as any)?.investmentDocument || {};
      investmentDocument.id = existing.id;
      investmentDocument.version = existing.version ?? 0;
      investmentDocument.name = formData.name.trim();
      if (formData.parentDocument) {
        investmentDocument.parentDocument = formData.parentDocument;
      }
    } else {
      investmentDocument.version = 0;
      investmentDocument.name = formData.folder ? formData.name.trim() : ensureNameHasExtension(formData.name.trim(), formData.file);
      investmentDocument.parentDocument = formData.parentDocument || undefined;
      investmentDocument.format = formData.folder ? 'FOLDER' : 'FILE';
    }

    if (!renameMode) {
      if (formData.documentGroupRef) investmentDocument.documentGroupRef = formData.documentGroupRef;
      if (formData.documentTypeRef) investmentDocument.documentTypeRef = formData.documentTypeRef;
      if (formData.description) investmentDocument.description = formData.description;
    }

    // Use pre-uploaded file response when available (preferred)
    const uploadResponse = (formData as any)._fileUploadResponse;
    if (uploadResponse?.fileInfo) {
      investmentDocument.fileInfo = uploadResponse.fileInfo;
      // Keep "file" for backward compatibility (will become obsolete)
      investmentDocument.file = uploadResponse.fileInfo.fileId;
      investmentDocument.fileSize = uploadResponse.fileInfo.fileMetadata?.size || formData.file?.size;
      investmentDocument.mimeType = uploadResponse.fileInfo.fileMetadata?.mimeType || formData.file?.type || undefined;
      // If name is empty, fallback to original file name from metadata
      if (!investmentDocument.name) {
        investmentDocument.name = uploadResponse.fileInfo.fileMetadata?.originalFileName || formData.name?.trim();
      }
    }

    return {
      [entityIdKey]: resolvedId,
      folder: formData.folder,
      name: formData.name.trim(),
      parentDocument: investmentDocument.parentDocument,
      investmentDocument,
    };
  };

  // Validation function
  const validateForm = (formData: DocumentPopupValues): string[] | null => {
    const errors: string[] = [];
    
    if (!formData.name?.trim()) {
      errors.push('Please provide a name.');
    }
    
    if (!renameMode && !formData.folder && !formData.file) {
      errors.push('Please select a file.');
    }
    
    return errors.length > 0 ? errors : null;
  };

  return (
    <AppActionForm
      processType={renameMode ? 'update' : (isUpdateMode ? 'update' : 'create')}
      onSubmit={handleSubmit}
      handlePreSubmit={handlePreSubmit}
      formData={form.getValues()}
      validateForm={validateForm}
      submitButtonText={actionLabel}
      form={form}
      businessAppContext={props}
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold" data-testid={formatDataTestId(prefixDataTestId, 'Title')}>{title}</h2>
        </div>

        {renameMode ? (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Document name"
                    {...field}
                    data-testid={formatDataTestId(prefixDataTestId, 'RenameNameInput')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : watchedFolder ? (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Folder Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Folder name"
                    {...field}
                    data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="gba:space-y-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        onChange(file);
                        if (file && !form.getValues('name')) {
                          form.setValue('name', file.name);
                        }
                      }}
                      data-testid={formatDataTestId(prefixDataTestId, 'FileInput')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="documentGroupRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Group</FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value || undefined} 
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('documentTypeRef', ''); // Reset document type when group changes
                      }}
                      data-testid={formatDataTestId(prefixDataTestId, 'DocumentGroupSelect')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select group..." />
                      </SelectTrigger>
                      <SelectContent position="popper" className="gba:z-[9999]" style={{ zIndex: 9999 }}>
                        {documentGroups.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="documentTypeRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value || undefined} 
                      onValueChange={field.onChange}
                      data-testid={formatDataTestId(prefixDataTestId, 'DocumentTypeSelect')}
                    >
                      <SelectTrigger disabled={!watchedDocumentGroupRef}>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent position="popper" className="gba:z-[9999]" style={{ zIndex: 9999 }}>
                        {filteredDocumentTypes.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="parentDocument"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Folder (optional)</FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value || undefined} 
                      onValueChange={field.onChange}
                      data-testid={formatDataTestId(prefixDataTestId, 'ParentFolderSelect')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={parentLoading ? 'Loading...' : 'Select parent...'} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="gba:z-[9999]" style={{ zIndex: 9999 }}>
                        {parentFolders.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Document name"
                      {...field}
                      data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description (optional)"
                      {...field}
                      data-testid={formatDataTestId(prefixDataTestId, 'DescriptionInput')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>
    </AppActionForm>
  );
};

export default DocumentPopup;
export { DocumentPopup };


