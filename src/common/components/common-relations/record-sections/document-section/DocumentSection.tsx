import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, FileExplorer, type FileExplorerNode, Spinner, Alert, Button } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

// Generic document interface for any entity type
export interface DocumentItem {
  id: string;
  name?: string | null;
  description?: string | null;
  createdAt: string;
  expirationDate?: string | null;
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
  version?: number;
}

interface DocumentSectionProps extends BusinessAppContextProps {
  entityId: string;
  entityType: 'account' | 'contact' | 'opportunity' | 'lead';
  documents: DocumentItem[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  uploadActionProps?: {
    contextsArray: FlowContextName[];
    externalContextData: Record<string, any>;
    prefixDataTestId: string;
  };
  createFolderActionProps?: {
    contextsArray: FlowContextName[];
    externalContextData: Record<string, any>;
    prefixDataTestId: string;
  };
  'data-testid'?: string;
}

const DocumentSection: React.FC<DocumentSectionProps> = ({ 
  entityType,
  documents = [],
  isLoading = false,
  error = null,
  onRefresh,
  uploadActionProps,
  createFolderActionProps,
  accessToken,
  'data-testid': dataTestId = 'document-section'
}) => {
  // Transform documents to FileExplorerNode format
  const transformDocumentsToNodes = (docs: DocumentItem[]): FileExplorerNode[] => {
    return docs.map(doc => ({
      id: doc.id,
      name: doc.name || 'Untitled Document',
      type: doc.folder ? 'folder' : 'file',
      size: doc.fileSize || 0,
      modified: new Date(doc.createdAt),
      parentId: doc.parentDocument || null,
      mimeType: doc.mimeType || undefined,
      starred: doc.verified || false,
      metadata: {
        documentType: doc.documentType?.value,
        documentGroup: doc.documentGroup?.value,
        createdBy: doc.createdBy,
        verified: doc.verified,
        authenticated: doc.authenticated,
        mandatory: doc.mandatory,
        expirationDate: doc.expirationDate,
        version: doc.version
      }
    }));
  };

  const nodes = transformDocumentsToNodes(documents);

  const handleNodesChange = (updatedNodes: FileExplorerNode[]) => {
    // Handle node changes (rename, move, etc.)
    // This would trigger API calls in the parent component
    console.log('Nodes changed:', updatedNodes);
  };

  const handleSelectionChange = (selectedNodeIds: string[]) => {
    // Handle selection changes
    console.log('Selection changed:', selectedNodeIds);
  };

  const handleFileUpload = (files: File[], parentId: string | null) => {
    // Handle file uploads
    // This would trigger upload process in the parent component
    console.log('Files to upload:', files, 'to parent:', parentId);
  };

  const handleNodeAction = (action: string, node: FileExplorerNode) => {
    // Handle node actions (view, download, delete, etc.)
    console.log('Node action:', action, 'on node:', node.id);
  };

  if (isLoading) {
    return (
      <Card data-testid={dataTestId}>
        <CardContent className="gba:flex gba:justify-center gba:items-center gba:py-12">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid={dataTestId}>
        <CardContent>
          <Alert variant="destructive">
            <div>
              <div className="gba:font-medium">Error Loading Documents</div>
              <div className="gba:text-sm gba:mt-1">{error}</div>
              {onRefresh && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRefresh}
                  className="gba:mt-2"
                >
                  Retry
                </Button>
              )}
            </div>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Documents</CardTitle>
          {(uploadActionProps || createFolderActionProps) && accessToken && (
            <div className="gba:flex gba:items-center gba:gap-2">
              {createFolderActionProps && (
                <AppAction
                  data-testid={`${createFolderActionProps.prefixDataTestId}-create-folder-button`}
                  contextsArray={createFolderActionProps.contextsArray}
                  externalContextData={createFolderActionProps.externalContextData}
                  prefixDataTestId={createFolderActionProps.prefixDataTestId}
                  accessToken={accessToken}
                  emptyStateBehavior="enable"
                  deferMainContextRequestsUntilClick
                >
                  <Button variant="outline">Create Folder</Button>
                </AppAction>
              )}
              {uploadActionProps && (
                <AppAction
                  data-testid={`${uploadActionProps.prefixDataTestId}-upload-button`}
                  contextsArray={uploadActionProps.contextsArray}
                  externalContextData={uploadActionProps.externalContextData}
                  prefixDataTestId={uploadActionProps.prefixDataTestId}
                  accessToken={accessToken}
                  emptyStateBehavior="enable"
                  deferMainContextRequestsUntilClick
                >
                  <Button>Upload Document</Button>
                </AppAction>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <FileExplorer
          nodes={nodes}
          showSearch
          allowDragDrop
          allowMultiSelect
          showHeader={false} // We use CardTitle instead
          defaultExpanded={[]} // Let user expand as needed
          allowUpload={!!uploadActionProps}
          allowCreateFolder={!!uploadActionProps}
          onNodesChange={handleNodesChange}
          onSelectionChange={handleSelectionChange}
          onFileUpload={handleFileUpload}
          onNodeAction={handleNodeAction}
        />
        {documents.length === 0 && !isLoading && (
          <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
            <p>No documents found for this {entityType}.</p>
            {(uploadActionProps || createFolderActionProps) && (
              <p className="gba:text-sm gba:mt-2">
                Use the {createFolderActionProps && '"Create Folder"'} 
                {createFolderActionProps && uploadActionProps && ' or '}
                {uploadActionProps && '"Upload Document"'} button to get started.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentSection;


