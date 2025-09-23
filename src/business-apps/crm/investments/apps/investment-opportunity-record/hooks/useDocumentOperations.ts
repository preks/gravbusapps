import { useState, useCallback } from 'react';
import { Modal } from 'antd';
import { toast } from 'sonner';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import { startProcess } from '@/common/utils/start-process';
import { useGetInvestmentDocumentsByOpportunityId } from '@/common/data/investment/hooks/useInvestmentOpportunities';

interface Document {
  id: string;
  name?: string | null;
  description?: string | null;
  createdAt: string;
  expirationDate?: string | null;
  version?: number;
  documentType?: {
    id: string;
    value: string;
    code?: string;
  } | null;
  documentGroup?: {
    id: string;
    value: string;
    code?: string;
  } | null;
  file?: string | null;
  mimeType?: string | null;
  fileSize?: number;
  createdBy?: string | null;
  parentDocument?: string | null;
  folder?: boolean;
  verified?: boolean;
  verificationDate?: string | null;
  authenticated?: boolean;
  authenticationDate?: string | null;
  mandatory?: boolean;
}

interface DocumentFolder {
  name: string;
  count: number;
  documents: Document[];
  folderId?: string;
  folderVersion?: number;
  children?: DocumentFolder[];
}

interface UseDocumentOperationsProps {
  opportunityId: string;
  context: BusinessAppContextProps;
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

export const useDocumentOperations = ({
  opportunityId,
  context,
  documents,
  setDocuments
}: UseDocumentOperationsProps) => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  const { fetchInvestmentDocumentsByOpportunityId } = useGetInvestmentDocumentsByOpportunityId(context);

  const fetchDocuments = useCallback(async () => {
    if (!opportunityId || !context.accessToken) {
      return;
    }

    try {
      const result = await fetchInvestmentDocumentsByOpportunityId(opportunityId);
      const raw = Array.isArray(result) ? result : [];
      const mapped: Document[] = raw.map((d: any) => ({
        ...d,
        parentDocument: d?.parentDocument?.id ?? null,
      }));
      setDocuments(mapped);
    } catch (err) {
      console.error('Error fetching opportunity documents:', err);
      throw err;
    }
  }, [opportunityId, context.accessToken, fetchInvestmentDocumentsByOpportunityId, setDocuments]);

  const openEditDocument = useCallback((doc: Document) => {
    startProcess({
      domain: 'investments',
      processName: 'saveInvestmentDocument',
      payload: {
        opportunityId,
        investmentDocument: {
          id: doc.id,
          version: doc.version,
          name: doc.name,
          documentGroupRef: doc.documentGroup?.id,
          documentTypeRef: doc.documentType?.id,
          parentDocument: doc.parentDocument || undefined,
        },
      },
      builderType: 'NATIVE_SCREEN',
    });
  }, [opportunityId]);

  const handleDeleteDocument = useCallback((document: Document) => {
    if (document.id?.startsWith('mock-')) {
      setDocuments(prev => prev.filter(d => d.id !== document.id));
      toast.success('Document deleted (mock)');
      return;
    }
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete "${document.name}"?`,
      onOk: async () => {
        try {
          await restClient.post('/investments/saveInvestmentDocument', {
            changeMode: 'DELETE',
            investmentDocument: { id: document.id, version: document.version, opportunity: opportunityId },
          }, { headers: { Authorization: `Bearer ${context.accessToken}` } });
          toast.success('Document deleted');
          await fetchDocuments();
        } catch (e: any) {
          console.error('Error deleting document', e);
          toast.error(e?.message || 'Failed to delete document');
        }
      }
    });
  }, [restClient, context.accessToken, opportunityId, fetchDocuments, setDocuments]);

  const hasDescendantFiles = useCallback((folderId: string): boolean => {
    return documents.some(doc => doc.parentDocument === folderId && !doc.folder);
  }, [documents]);

  const handleDeleteFolder = useCallback((node: DocumentFolder) => {
    if (!node.folderId || node.folderVersion == null) return;
    if (hasDescendantFiles(node.folderId)) {
      toast.warning('Cannot delete a folder that contains files. Move or delete files first.');
      return;
    }
    if (node.folderId.startsWith('mock-')) {
      toast.warning('Cannot delete a folder that contains files.');
      return;
    }
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the folder "${node.name}"?`,
      onOk: async () => {
        try {
          await restClient.post('/investments/saveInvestmentDocument', {
            changeMode: 'DELETE',
            investmentDocument: { id: node.folderId, version: node.folderVersion, opportunity: opportunityId },
          }, { headers: { Authorization: `Bearer ${context.accessToken}` } });
          toast.success('Folder deleted');
          await fetchDocuments();
        } catch (e: any) {
          console.error('Error deleting folder', e);
          toast.error(e?.message || 'Failed to delete folder');
        }
      }
    });
  }, [restClient, context.accessToken, opportunityId, fetchDocuments, hasDescendantFiles]);

  const handleView = useCallback((document: Document) => {
    if (document.file) {
      window.open(document.file, '_blank');
    } else {
      toast.warning('No file available to view');
    }
  }, []);

  const handleDownload = useCallback((document: Document) => {
    if (document.file) {
      const link = window.document.createElement('a');
      link.href = document.file;
      link.download = document.name || 'download';
      link.click();
    } else {
      toast.warning('No file available to download');
    }
  }, []);

  const persistParentDocumentUpdate = useCallback(async (docId: string, newParentId: string | null) => {
    try {
      await restClient.post(
        '/investments/saveInvestmentDocument',
        {
          changeMode: 'UPDATE',
          investmentDocument: {
            id: docId,
            version: documents.find(d => d.id === docId)?.version,
            parentDocument: newParentId,
            opportunity: opportunityId,
          },
        },
        { headers: { Authorization: `Bearer ${context.accessToken}` } }
      );
      toast.success('Document moved');
    } catch (e: any) {
      console.error('Error moving document', e);
      setDocuments((prev) => prev.map(d => d.id === docId ? { ...d, parentDocument: documents.find(d => d.id === docId)?.parentDocument || null } : d));
      toast.error(e?.message || 'Failed to move document');
    }
  }, [restClient, context.accessToken, opportunityId, documents, setDocuments]);

  return {
    fetchDocuments,
    openEditDocument,
    handleDeleteDocument,
    handleDeleteFolder,
    handleView,
    handleDownload,
    persistParentDocumentUpdate,
    hasDescendantFiles
  };
};

export default useDocumentOperations;
