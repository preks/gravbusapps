import React from 'react';
import { 
  FileExplorer, 
  type FileExplorerNode, 
  type FileExplorerColumn, 
  Spinner, Alert, Button, Badge 
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useAppActionData } from '@/common/hooks/useAppActionData';

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
  viewActionProps?: {
    contextsArray: FlowContextName[];
    externalContextData: Record<string, any>;
    prefixDataTestId: string;
  };
  downloadActionProps?: {
    contextsArray: FlowContextName[];
    externalContextData: Record<string, any>;
    prefixDataTestId: string;
  };
  deleteActionProps?: {
    contextsArray: FlowContextName[];
    externalContextData: Record<string, any>;
    prefixDataTestId: string;
  };
  'data-testid'?: string;
}

const DocumentSection: React.FC<DocumentSectionProps> = ({ 
  documents = [],
  isLoading = false,
  error = null,
  onRefresh,
  uploadActionProps,
  createFolderActionProps,
  viewActionProps,
  downloadActionProps,
  deleteActionProps,
  accessToken,
  'data-testid': dataTestId = 'document-section'
}) => {
  // Set up AppAction data hooks for programmatic triggering
  const createFolderActionData = useAppActionData(
    createFolderActionProps && accessToken ? {
      contextsArray: createFolderActionProps.contextsArray,
      externalContextData: createFolderActionProps.externalContextData,
      accessToken,
      deferMainContextRequestsUntilClick: false,
      prefixDataTestId: createFolderActionProps.prefixDataTestId
    } : {
      contextsArray: [],
      accessToken: accessToken || '',
      deferMainContextRequestsUntilClick: false,
      prefixDataTestId: 'document-create-folder'
    },
    'CreateFolder'
  );

  const uploadActionData = useAppActionData(
    uploadActionProps && accessToken ? {
      contextsArray: uploadActionProps.contextsArray,
      externalContextData: uploadActionProps.externalContextData,
      accessToken,
      deferMainContextRequestsUntilClick: false,
      prefixDataTestId: uploadActionProps.prefixDataTestId
    } : {
      contextsArray: [],
      accessToken: accessToken || '',
      deferMainContextRequestsUntilClick: false,
      prefixDataTestId: 'document-upload'
    },
    'Upload'
  );
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

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Define custom columns according to requirements: Name, Group, Type, Size, Upload Date, Uploaded by, Actions
  const columns: FileExplorerColumn[] = [
    {
      id: "group",
      header: "Group",
      width: "w-32",
      align: "left",
      render: (node) => (
        <span 
          className="gba:text-xs gba:text-muted-foreground"
          data-testid={`${dataTestId}-group-${node.id}`}
        >
          {node.metadata?.documentGroup || '-'}
        </span>
      ),
    },
    {
      id: "type",
      header: "Type",
      width: "w-28",
      align: "left",
      render: (node) => (
        <Badge 
          variant="secondary" 
          className="gba:text-xs"
          data-testid={`${dataTestId}-type-${node.id}`}
        >
          {node.type === "folder" ? "Folder" : (node.metadata?.documentType || "Document")}
        </Badge>
      ),
    },
    {
      id: "size",
      header: "Size",
      width: "w-20",
      align: "right",
      render: (node) => (
        <span 
          className="gba:text-xs gba:text-muted-foreground"
          data-testid={`${dataTestId}-size-${node.id}`}
        >
          {node.type === "file" && node.size ? formatFileSize(node.size) : '-'}
        </span>
      ),
    },
    {
      id: "uploadDate",
      header: "Upload Date",
      width: "w-32",
      align: "left",
      render: (node) => (
        <span 
          className="gba:text-xs gba:text-muted-foreground"
          data-testid={`${dataTestId}-upload-date-${node.id}`}
        >
          {node.modified.toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "uploadedBy",
      header: "Uploaded by",
      width: "w-32",
      align: "left",
      render: (node) => (
        <span 
          className="gba:text-xs gba:text-muted-foreground"
          data-testid={`${dataTestId}-uploaded-by-${node.id}`}
        >
          {node.metadata?.createdBy || '-'}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      width: "w-32",
      align: "center",
      render: (node) => (
        <div 
          className="gba:flex gba:items-center gba:justify-center gba:gap-1"
          data-testid={`${dataTestId}-actions-${node.id}`}
        >
          {viewActionProps && accessToken && (
            <AppAction
              data-testid={`${viewActionProps.prefixDataTestId}-view-${node.id}`}
              contextsArray={viewActionProps.contextsArray}
              externalContextData={{ ...viewActionProps.externalContextData, documentId: node.id }}
              prefixDataTestId={`${viewActionProps.prefixDataTestId}-view`}
              accessToken={accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button variant="ghost" size="sm">{getTranslationFromI18nKeyAndLabel("document.action.view", "View")}</Button>
            </AppAction>
          )}
          {downloadActionProps && accessToken && node.type === "file" && (
            <AppAction
              data-testid={`${downloadActionProps.prefixDataTestId}-download-${node.id}`}
              contextsArray={downloadActionProps.contextsArray}
              externalContextData={{ ...downloadActionProps.externalContextData, documentId: node.id }}
              prefixDataTestId={`${downloadActionProps.prefixDataTestId}-download`}
              accessToken={accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button variant="ghost" size="sm">{getTranslationFromI18nKeyAndLabel("document.action.download", "Download")}</Button>
            </AppAction>
          )}
          {deleteActionProps && accessToken && (
            <AppAction
              data-testid={`${deleteActionProps.prefixDataTestId}-delete-${node.id}`}
              contextsArray={deleteActionProps.contextsArray}
              externalContextData={{ ...deleteActionProps.externalContextData, documentId: node.id }}
              prefixDataTestId={`${deleteActionProps.prefixDataTestId}-delete`}
              accessToken={accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button variant="ghost" size="sm">{getTranslationFromI18nKeyAndLabel("document.action.delete", "Delete")}</Button>
            </AppAction>
          )}
        </div>
      ),
    },
  ];

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
    // Handle built-in FileExplorer actions and integrate with AppAction workflows
    console.log('Node action:', action, 'on node:', node.id);
    
    switch (action) {
      case 'download':
        // Trigger download AppAction if available
        if (downloadActionProps && accessToken) {
          console.log('Triggering download action for node:', node.id);
          // In a real implementation, you would trigger the download AppAction here
          // For now, we'll log the action
        }
        break;
        
      case 'share':
        // Handle share action
        console.log('Share action for node:', node.id);
        // Could integrate with share AppAction if available
        break;
        
      case 'rename':
        // Handle rename action
        console.log('Rename action for node:', node.id);
        // Could trigger rename workflow
        break;
        
      case 'delete':
        // Trigger delete AppAction if available
        if (deleteActionProps && accessToken) {
          console.log('Triggering delete action for node:', node.id);
          // In a real implementation, you would trigger the delete AppAction here
          // For now, we'll log the action
        }
        break;
        
      default:
        console.log('Unhandled action:', action, 'for node:', node.id);
    }
  };

  if (isLoading) {
    return (
      <div data-testid={dataTestId} className="gba:flex gba:justify-center gba:items-center gba:py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid={dataTestId} className="gba:p-6">
        <Alert variant="destructive">
          <div>
            <div className="gba:font-medium">{getTranslationFromI18nKeyAndLabel("document.error.loading.title", "Error Loading Documents")}</div>
            <div className="gba:text-sm gba:mt-1">{error}</div>
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="gba:mt-2"
              >
                {getTranslationFromI18nKeyAndLabel("document.action.retry", "Retry")}
              </Button>
            )}
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div data-testid={dataTestId}>
      <FileExplorer
        nodes={nodes}
        treeColumns={columns.slice(0, 4)} // Tree view: Group, Type, Size, Upload Date (no Actions column)
        listColumns={columns} // List view: All columns including Actions
        showSearch
        allowDragDrop
        allowMultiSelect
        showHeader={true} // Enable header with integrated title and controls
        title={getTranslationFromI18nKeyAndLabel("document.section.title", "Document Management")}
        showColumnHeaders={true}
        showViewModeToggle={true}
        viewMode="tree" // Start with tree view by default
        defaultExpanded={[]} // Start collapsed to test expand all functionality
          allowUpload={!!uploadActionProps}
          allowCreateFolder={!!createFolderActionProps}
          // Override built-in dialogs to use AppAction workflows
          disableLocalFolderDialog={true}
          disableLocalUploadDialog={true}
          onNodesChange={handleNodesChange}
          onSelectionChange={handleSelectionChange}
          onFileUpload={handleFileUpload}
          onNodeAction={handleNodeAction}
          // Override handlers to use AppAction workflows
          onNewRootFolder={() => {
            // Execute the first available create folder action
            const firstAction = createFolderActionData.combinedData[0];
            if (firstAction) {
              firstAction.onClick?.();
            }
          }}
          onNewSubfolder={(parentId) => {
            // Execute create subfolder action with parent context
            const firstAction = createFolderActionData.combinedData[0];
            if (firstAction) {
              // Note: parentId could be used to set context for subfolder creation
              console.log('Creating subfolder under parent:', parentId);
              firstAction.onClick?.();
            }
          }}
          onRequestUpload={(parentId) => {
            // Execute the first available upload action
            const firstAction = uploadActionData.combinedData[0];
            if (firstAction) {
              // Note: parentId could be used to set upload destination folder
              console.log('Uploading to parent folder:', parentId);
              firstAction.onClick?.();
            }
          }}
          // Enable built-in actions menu for tree view (three dots dropdown)
          onActionsButtonClick={undefined} // Use default behavior for dropdown menu
          labels={{
            searchPlaceholder: getTranslationFromI18nKeyAndLabel("document.search.placeholder", "Search documents..."),
            folderNamePlaceholder: getTranslationFromI18nKeyAndLabel("document.folder.name.placeholder", "Document folder name"),
            newFolder: getTranslationFromI18nKeyAndLabel("document.folder.new", "New Document Folder"),
            uploadFiles: getTranslationFromI18nKeyAndLabel("document.upload.files", "Upload Documents"),
            expandAll: getTranslationFromI18nKeyAndLabel("document.tree.expand.all", "Expand All"),
            collapseAll: getTranslationFromI18nKeyAndLabel("document.tree.collapse.all", "Collapse All"),
            treeView: getTranslationFromI18nKeyAndLabel("document.view.tree", "Tree View"),
            listView: getTranslationFromI18nKeyAndLabel("document.view.list", "List View"),
            // Built-in action labels
            newSubfolder: getTranslationFromI18nKeyAndLabel("document.action.create.subfolder", "New Subfolder"),
            upload: getTranslationFromI18nKeyAndLabel("document.action.upload", "Upload Files"),
            download: getTranslationFromI18nKeyAndLabel("document.action.download", "Download"),
            share: getTranslationFromI18nKeyAndLabel("document.action.share", "Share"),
            rename: getTranslationFromI18nKeyAndLabel("document.action.rename", "Rename"),
            delete: getTranslationFromI18nKeyAndLabel("document.action.delete", "Delete"),
            emptyStateTitle: getTranslationFromI18nKeyAndLabel("document.empty.title", "No documents found"),
            emptyStateDescription: getTranslationFromI18nKeyAndLabel("document.empty.description", "Upload documents or create folders to organize your files"),
            emptyStateFolderButton: getTranslationFromI18nKeyAndLabel("document.empty.create.button", "Create Folder"),
            emptyStateUploadButton: getTranslationFromI18nKeyAndLabel("document.empty.upload.button", "Upload Document"),
            folderLabel: getTranslationFromI18nKeyAndLabel("document.folder.label", "Folder"),
            fileLabel: getTranslationFromI18nKeyAndLabel("document.file.label", "Document")
          }}
          data-testid={`${dataTestId}-file-explorer`}
        />
    </div>
  );
};

export default DocumentSection;


