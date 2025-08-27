import React, { useMemo, useRef, useState } from 'react';
import { Card, CardContent, Spinner, Alert, FileExplorer, type FileExplorerNode, type FileExplorerAction } from '@newwork/nw-design-system';
import './styles/hide-unwanted-actions.css';
import { FileDown, FilePlus, FolderPlus, Eye, Edit, Share2, Trash2 } from 'lucide-react';
// (no local header buttons)
import type { FileManagerProps, DocumentNode } from './types';
import { isFileDocument } from './types';
import { useCrmDocuments } from './hooks/useCrmDocuments';
import { useDocumentMutations } from './hooks/useDocumentMutations';
import { startProcess } from '@/common/utils/start-process';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';
import { buildDownloadUrl } from './utils/documentUrl';
// import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { AppActionMenu } from '@/components/app-action-menu';
import { AppAction } from '@/components/app-action';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { useFlowRegistryClient } from '@/common/network/flows/useFlowRegistryClient';

const getExtensionFromMime = (mime?: string | null): string | null => {
  if (!mime) return null;
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/json': 'json',
    'application/xml': 'xml',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/zip': 'zip',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
  };
  return map[mime] || (mime.includes('/') ? mime.split('/')[1] : null);
};

const mapToExplorerNodes = (docs: DocumentNode[]): FileExplorerNode[] => {
  return docs.map((d) => {
    const isFile = isFileDocument(d);
    const ext = isFile ? getExtensionFromMime(d.mimeType) : null;
    const hasExt = !!(d.name && /\.[a-z0-9]{2,10}$/i.test(d.name));
    const displayName = isFile && ext && !hasExt ? `${d.name || 'Unnamed Document'}.${ext}` : (d.name || 'Unnamed Document');
    return {
      id: d.id,
      name: displayName,
      type: isFile ? 'file' : 'folder',
      size: d.fileSize ?? undefined,
      modified: new Date(d.createdAt),
      parentId: d.parentDocument ?? null,
      mimeType: d.mimeType ?? undefined,
      metadata: {
        documentType: d.documentType?.value,
        documentGroup: d.documentGroup?.value,
        uploadedBy: d.createdBy,
      },
    };
  });
};

export const FileManager: React.FC<FileManagerProps> = ({ context, entity, /* permissions, */ 'data-testid': dataTestId }) => {
  const { documents, isLoading, error, refetch } = useCrmDocuments(context.accessToken, entity);
  const graphqlClient = useGraphQLClient(context.accessToken);
  const explorerContainerRef = useRef<HTMLDivElement>(null);
  const flowRegistryClient = useFlowRegistryClient(context.accessToken);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ left: number; top: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<FileExplorerNode | null>(null);
  const newFolderActionRef = useRef<HTMLButtonElement>(null);
  const uploadFileActionRef = useRef<HTMLButtonElement>(null);
  const lastNewFolderParentRef = useRef<string | null>(null);
  const lastUploadParentRef = useRef<string | null>(null);

  const { renameFolder, deleteNode, hasDescendantFiles, moveNode /*, optimisticMove */ } = useDocumentMutations({
    accessToken: context.accessToken,
    entity,
    getAllDocuments: () => documents,
    setDocuments: () => {}, // not used here as FileExplorer manages tree; we rely on refetch after operations
  });

  // Handle built-in FileExplorer actions
  const handleNodeAction = async (action: string, node: FileExplorerNode) => {
    if (action === 'download') {
      if (node.type !== 'file') return;
      const doc = documents.find(d => d.id === node.id);
      if (!doc || !doc.file) return;
      const url = buildDownloadUrl(entity.type, entity.id, doc);
      window.open(url, '_blank');
      return;
    }

    if (action === 'rename') {
      const doc = documents.find(d => d.id === node.id);
      if (!doc) return;

      // Files: open update file modal (native screen)
      if (node.type === 'file') {
        // Fetch latest version and metadata before opening update modal
        let latest = null as any;
        try {
          const query = `
            query GetCrmDocumentById($id: uuid!) {
              CrmDocument(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
                id
                version
                name
                documentGroup { id }
                documentType { id }
                parentDocument { id }
              }
            }
          `;
          const result = await graphqlClient.request<{ CrmDocument: any[] }>(query, { id: doc.id });
          latest = Array.isArray(result?.CrmDocument) ? result!.CrmDocument[0] : null;
        } catch {
          // ignore and fall back to cached doc
        }

        const version = latest?.version ?? doc.version;
        const name = latest?.name ?? doc.name;
        const groupRef = latest?.documentGroup?.id ?? doc.documentGroup?.id ?? '';
        const typeRef = latest?.documentType?.id ?? doc.documentType?.id ?? '';
        const parentRef = latest?.parentDocument?.id ?? doc.parentDocument ?? '';

        startProcess({
          domain: 'customer-relations',
          processName: 'createCrmDocument',
          payload: {
            [`${entity.type}Id`]: entity.id,
            crmDocument: {
              id: doc.id,
              version,
              name,
              documentGroupRef: groupRef,
              documentTypeRef: typeRef,
              parentDocument: parentRef,
            },
          },
          builderType: 'NATIVE_SCREEN',
        });
        return;
      }

      // Folders: inline rename prompt
      const newName = window.prompt('Rename folder', node.name);
      if (!newName || !newName.trim()) return;
      await renameFolder(doc.id, doc.version, newName.trim());
      await refetch();
      return;
    }
  };

  // Custom actions to tailor menus:
  // - Replace folder Download with Create File / Create Folder
  // - Keep Download for files only
  const customActions: FileExplorerAction[] = useMemo(() => [
    {
      id: 'create-subfolder',
      label: 'Create Folder',
      icon: FolderPlus as any,
      onClick: (node) => {
        if (node.type !== 'folder') return;
        startProcess({
          domain: 'customer-relations',
          processName: 'createCrmDocument',
          payload: { [`${entity.type}Id`]: entity.id, createFolder: true, parentDocument: node.id },
          builderType: 'NATIVE_SCREEN',
        });
      },
    },
    {
      id: 'view',
      label: 'View',
      icon: Eye as any,
      onClick: (node) => {
        if (node.type !== 'file') return;
        const doc = documents.find(d => d.id === node.id);
        if (!doc || !doc.file) return;
        const url = buildDownloadUrl(entity.type, entity.id, doc);
        window.open(url, '_blank');
      },
    },
    {
      id: 'upload', // filtered by DS to show only for folders
      label: 'Create File',
      icon: FilePlus as any,
      onClick: (node) => {
        const parentId = node.type === 'folder' ? node.id : node.parentId;
        startProcess({
          domain: 'customer-relations',
          processName: 'createCrmDocument',
          payload: { [`${entity.type}Id`]: entity.id, ...(parentId ? { parentDocument: parentId } : {}) },
          builderType: 'NATIVE_SCREEN',
        });
      },
    },
    {
      id: 'share', // DS shows this only for files; reuse for file-only Download
      label: 'Download',
      icon: FileDown as any,
      onClick: (node) => { void handleNodeAction('download', node); },
    },
  ], [entity]);

  // Handle three-dots click to open AppActionMenu with required options
  const handleActionsButtonClick = (node: FileExplorerNode) => {
    setSelectedNode(node);
    // Try to anchor the menu to the clicked button position
    try {
      const root = explorerContainerRef.current;
      const row = root?.querySelector(`[data-testid="file-explorer-item-${node.id}"]`) as HTMLElement | null;
      const icon = row?.querySelector('[data-lucide="more-horizontal"]') as HTMLElement | null;
      const button = (icon?.closest('button') as HTMLElement | null) || (row?.querySelector('button:last-of-type') as HTMLElement | null);
      const rect = (button || row)?.getBoundingClientRect();
      if (rect) {
        setMenuAnchor({ left: rect.left, top: rect.bottom + 4 });
      } else {
        setMenuAnchor({ left: 0, top: 0 });
      }
    } catch {
      setMenuAnchor({ left: 0, top: 0 });
    }
    setMenuOpen(true);
  };

  const appActions = useMemo(() => {
    if (!selectedNode) return [] as any[];
    const doc = documents.find(d => d.id === selectedNode.id);
    const isFile = selectedNode.type === 'file' && !!doc?.file;

    const openView = () => {
      if (!doc || !isFile) return;
      const url = buildDownloadUrl(entity.type, entity.id, doc);
      window.open(url, '_blank');
    };

    const doDownload = () => {
      if (!doc || !isFile) return;
      const url = buildDownloadUrl(entity.type, entity.id, doc);
      window.open(url, '_blank');
    };

    const doRename = () => { void handleNodeAction('rename', selectedNode); };

    const doShare = async () => {
      if (!doc || !isFile) return;
      const url = buildDownloadUrl(entity.type, entity.id, doc);
      try {
        await navigator.clipboard.writeText(url);
      } catch {}
    };

    const doDelete = async () => {
      if (!doc) return;
      const ok = window.confirm(`Delete "${selectedNode.name}"?`);
      if (!ok) return;
      try {
        await deleteNode(doc.id, doc.version);
      } finally {
        await refetch();
      }
    };

    return [
      { key: 'view', label: 'View', onClick: () => { openView(); setMenuOpen(false); }, icon: <Eye className="nw:h-4 nw:w-4" />, disabled: !isFile },
      { key: 'download', label: 'Download', onClick: () => { doDownload(); setMenuOpen(false); }, icon: <FileDown className="nw:h-4 nw:w-4" />, disabled: !isFile },
      { key: 'rename', label: 'Rename', onClick: () => { doRename(); setMenuOpen(false); }, icon: <Edit className="nw:h-4 nw:w-4" /> },
      { key: 'share', label: 'Share', onClick: () => { void doShare(); setMenuOpen(false); }, icon: <Share2 className="nw:h-4 nw:w-4" />, disabled: !isFile },
      { key: 'delete', label: 'Delete', onClick: () => { void doDelete(); setMenuOpen(false); }, icon: <Trash2 className="nw:h-4 nw:w-4" /> },
    ];
  }, [selectedNode, documents, entity, deleteNode, refetch]);

  // DnD handling via FileExplorer callbacks
  const onNodesChange = async (nextNodes: FileExplorerNode[]) => {
    // Detect parentId changes and persist
    const before = mapToExplorerNodes(documents);
    const beforeMap = new Map(before.map(n => [n.id, n]));
    for (const n of nextNodes) {
      const prev = beforeMap.get(n.id);
      if (!prev) continue;
      const prevParent = prev.parentId ?? null;
      const nextParent = n.parentId ?? null;
      if (prevParent !== nextParent) {
        const doc = documents.find(d => d.id === n.id);
        if (!doc) continue;
        // Optimistic in UI; backend persist
        try {
          await moveNode(doc.id, doc.version, nextParent);
        } catch (e) {
          // ignore; refetch will restore
        }
      }
    }

    // Detect deletions (present before, missing now) and persist
    const nextIds = new Set(nextNodes.map(n => n.id));
    const deletedIds: string[] = [];
    for (const id of beforeMap.keys()) {
      if (!nextIds.has(id)) {
        deletedIds.push(id);
      }
    }
    if (deletedIds.length > 0) {
      for (const id of deletedIds) {
        const doc = documents.find(d => d.id === id);
        if (!doc) continue;
        // Optional guard: prevent deleting folder with files via backend policy
        if (doc.documentType === undefined && hasDescendantFiles(id)) {
          // If DS removed it, we just persist; backend can enforce rules as needed
        }
        try {
          await deleteNode(doc.id, doc.version);
        } catch {
          // ignore per-item, final refetch will sync UI
        }
      }
    }
    await refetch();
  };

  // Process completion refetch
  useProcessCompletion({
    onSuccess: () => { refetch(); },
    onFailure: () => {}
  });

  const nodes = useMemo(() => mapToExplorerNodes(documents), [documents]);

  // AppAction-backed handlers for DS header buttons
  const handleNewRootFolder = () => {
    lastNewFolderParentRef.current = null;
    // ensure registry client has the fresh token
    if (context.accessToken) flowRegistryClient.setAccessToken(context.accessToken);
    newFolderActionRef.current?.click();
  };

  const handleNewSubfolder = (parentId: string) => {
    lastNewFolderParentRef.current = parentId;
    if (context.accessToken) flowRegistryClient.setAccessToken(context.accessToken);
    newFolderActionRef.current?.click();
  };

  const handleRequestUpload = (parentId: string | null) => {
    lastUploadParentRef.current = parentId ?? null;
    if (context.accessToken) flowRegistryClient.setAccessToken(context.accessToken);
    uploadFileActionRef.current?.click();
  };

  // no local modal for folder creation; popup will handle name entry

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-8" data-testid={dataTestId || 'file-manager-loading'}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4" data-testid={dataTestId || 'file-manager-error'}>
        <div>
          <h4 className="gba:font-medium">Error loading documents</h4>
          <p className="gba:text-sm">{error}</p>
        </div>
      </Alert>
    );
  }

  return (
    <Card className="gba:h-full gba:bg-white" data-testid={dataTestId || 'file-manager-container'}>
      <CardContent>
        <div className="gba:bg-white" ref={explorerContainerRef}>
        <FileExplorer
          nodes={nodes}
          showSearch
          allowDragDrop
          showHeader
          title={''}
          allowSelection={false}
          allowMultiSelect={false}
          defaultExpanded={[]}
          allowUpload
          allowCreateFolder
          customActions={customActions}
          onNewRootFolder={handleNewRootFolder}
          onNewSubfolder={(parentId) => handleNewSubfolder(parentId)}
          onRequestUpload={handleRequestUpload}
          disableLocalFolderDialog
          disableLocalUploadDialog
          onActionsButtonClick={handleActionsButtonClick}
          onNodesChange={onNodesChange}
          onSelectionChange={() => {}}
          onFileUpload={() => { /* DS button rewired via DOM listener */ }}
          onNodeAction={(action, node) => {
            if (action === 'create-subfolder' && node.type === 'folder') {
              startProcess({
                domain: 'customer-relations',
                processName: 'createCrmDocument',
                payload: { [`${entity.type}Id`]: entity.id, createFolder: true, parentDocument: node.id },
                builderType: 'NATIVE_SCREEN',
              });
              return;
            }
            handleNodeAction(action, node);
          }}
          labels={{
            expandAll: 'Expand All',
            collapseAll: 'Collapse All',
            emptyStateTitle: 'No items',
            emptyStateDescription: 'Create a folder or upload files to get started.',
            searchPlaceholder: 'Search files and folders...',
          }}
          className="gba:mt-2"
        />
        {/* AppActionMenu as overlay opened from three-dots; uses static actions in required order */}
        {selectedNode && (
          <AppActionMenu
            accessToken={context.accessToken}
            staticFlowData={appActions as any}
            emptyStateBehavior="enable"
            open={menuOpen}
            onOpenChange={(open) => setMenuOpen(open)}
            prefixDataTestId="file-manager"
            style={{ position: 'fixed', left: menuAnchor?.left ?? 0, top: menuAnchor?.top ?? 0 }}
            data-testid="file-manager-action-menu"
          >
            <button type="button" aria-label="open actions" />
          </AppActionMenu>
        )}

        {/* Hidden AppActions to execute New Folder and Upload processes with individual contexts */}
        <div className="gba:hidden" aria-hidden>
          {/* New Folder AppAction - uses createCustomerDocument flow context */}
          <AppAction
            accessToken={context.accessToken}
            contextsArray={[FlowContextName.createCustomerDocument]}
            externalContextData={{
              accountId: entity.type === 'account' ? entity.id : undefined,
              account: entity.type === 'account' ? entity.id : undefined,
              contactId: entity.type === 'contact' ? entity.id : undefined,
              contact: entity.type === 'contact' ? entity.id : undefined,
              leadId: entity.type === 'lead' ? entity.id : undefined,
              lead: entity.type === 'lead' ? entity.id : undefined,
              ...(lastNewFolderParentRef.current ? { parentDocument: lastNewFolderParentRef.current } : {}),
              folder: true,
              crmDocument: {
                ...(entity.type === 'account' ? { account: entity.id } : {}),
                ...(entity.type === 'contact' ? { contact: entity.id } : {}),
                ...(entity.type === 'lead' ? { lead: entity.id } : {}),
                ...(lastNewFolderParentRef.current ? { parentDocument: lastNewFolderParentRef.current } : {}),
              },
            }}
            emptyStateBehavior="enable"
            prefixDataTestId="file-manager-new-folder"
          >
            <button ref={newFolderActionRef} type="button" data-testid="file-manager-new-folder-action" />
          </AppAction>

          {/* Upload Files AppAction - uses createCustomerDocument flow context */}
          <AppAction
            accessToken={context.accessToken}
            contextsArray={[FlowContextName.createCustomerDocument]}
            externalContextData={{
              accountId: entity.type === 'account' ? entity.id : undefined,
              account: entity.type === 'account' ? entity.id : undefined,
              contactId: entity.type === 'contact' ? entity.id : undefined,
              contact: entity.type === 'contact' ? entity.id : undefined,
              leadId: entity.type === 'lead' ? entity.id : undefined,
              lead: entity.type === 'lead' ? entity.id : undefined,
              ...(lastUploadParentRef.current ? { parentDocument: lastUploadParentRef.current } : {}),
              folder: false,
              crmDocument: {
                ...(entity.type === 'account' ? { account: entity.id } : {}),
                ...(entity.type === 'contact' ? { contact: entity.id } : {}),
                ...(entity.type === 'lead' ? { lead: entity.id } : {}),
                ...(lastUploadParentRef.current ? { parentDocument: lastUploadParentRef.current } : {}),
              },
            }}
            emptyStateBehavior="enable"
            prefixDataTestId="file-manager-upload-file"
          >
            <button ref={uploadFileActionRef} type="button" data-testid="file-manager-upload-file-action" />
          </AppAction>
        </div>

        {/* No local modal: popup will handle name input */}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileManager;


