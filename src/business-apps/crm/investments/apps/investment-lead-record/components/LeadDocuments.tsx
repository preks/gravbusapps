import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Spinner, Alert, Badge, Button } from '@newwork/nw-design-system';
import { 
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FileOutlined,
  FolderOpenOutlined,
  DownloadOutlined,
  EyeOutlined,
  CaretRightOutlined,
  AppstoreOutlined,
  BarsOutlined,
  CalendarOutlined,
  UserOutlined,
  SettingOutlined,
  FolderAddOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { Modal, message, Input as AntdInput } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { DataContainer } from '@/components/layout/dataContainer';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { useGetInvestmentDocumentsByLeadId } from '@/common/data/investment/hooks/useInvestmentLeads';
import type { InvestmentDocument } from '@/common/data/investment/types';
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import { SimpleDocumentDeletePopup } from '@/business-apps/crm/investments/popups/document-delete-popup/SimpleDocumentDeletePopup';

// Use the actual investment document type
type Document = InvestmentDocument;

interface DocumentFolder {
  name: string;
  count: number;
  documents: Document[];
  folderId?: string;
  folderVersion?: number;
  children?: DocumentFolder[];
}

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  disabled?: boolean;
}

interface FilterOption {
  id: string;
  label: string;
  selected: boolean;
  value: any;
}

interface FilterGroup {
  id: string;
  title: string;
  filters: FilterOption[];
  searchTerm?: string;
  backendSearch?: (search: string) => { filters: FilterOption[]; loading: boolean; error: any; };
}

interface LeadDocumentsProps {
  leadId: string;
  context: BusinessAppContextProps;
}

export const LeadDocuments: React.FC<LeadDocumentsProps> = ({ 
  leadId, 
  context 
}) => {
  // DnD sensors and REST client
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { fetchInvestmentDocumentsByLeadId } = useGetInvestmentDocumentsByLeadId(context);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('icon');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [renameModal, setRenameModal] = useState<{ open: boolean; node?: DocumentFolder; name: string }>({ open: false, name: '' });
  const [activeDragItem, setActiveDragItem] = useState<{ itemType: 'document' | 'folder'; name: string; mimeType?: string | null } | null>(null);
  const [deletePopup, setDeletePopup] = useState<{ open: boolean; document?: Document }>({ open: false });
  const [isDragging, setIsDragging] = useState(false);
  
  // Column configuration with default visibility
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { id: "name", label: "Name", visible: true, disabled: true }, // Always visible
    { id: "group", label: "Group", visible: true },
    { id: "type", label: "Type", visible: true },
    { id: "size", label: "Size", visible: true },
    { id: "uploadDate", label: "Upload Date", visible: true },
    { id: "expirationDate", label: "Expiration Date", visible: false },
    { id: "uploadedBy", label: "Uploaded By", visible: true },
    { id: "actions", label: "Actions", visible: true, disabled: true }, // Always visible
  ]);

  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);

  const openRenameFolder = (node: DocumentFolder) => {
    setRenameModal({ open: true, node, name: node.name });
  };

  const confirmRenameFolder = async () => {
    const newName = renameModal.name?.trim();
    const node = renameModal.node;
    if (!node || !newName) {
      message.error('Please enter a folder name');
      return;
    }
    if (node.folderId?.startsWith('mock-')) {
      setDocuments(prev => prev.map(d => d.id === node.folderId ? { ...d, name: newName } : d));
      setRenameModal({ open: false, name: '', node: undefined });
      message.success('Folder renamed (mock)');
      return;
    }
    try {
      await restClient.post('/investments/saveInvestmentDocument', {
        changeMode: 'UPDATE',
        investmentDocument: { id: node.folderId, version: node.folderVersion, name: newName, lead: leadId },
      }, { headers: { Authorization: `Bearer ${context.accessToken}` } });
      message.success('Folder renamed');
      setRenameModal({ open: false, name: '', node: undefined });
      await fetchDocuments();
    } catch (e: any) {
      console.error('Error renaming folder', e);
      message.error(e?.message || 'Failed to rename folder');
    }
  };

  const openEditDocument = (doc: Document) => {
    // TODO: Replace with AppActionButton flow registry approach
    console.log('Edit document clicked - needs flow registry implementation', doc);
    // Note: This will need to be converted to use AppActionButton with proper context
  };

  // Compute visible columns
  const visibleColumns = useMemo(() => {
    return columnConfig.filter(column => column.visible).map(column => column.id);
  }, [columnConfig]);

  // Column visibility helper
  const isColumnVisible = useCallback((columnId: string) => {
    return visibleColumns.includes(columnId);
  }, [visibleColumns]);

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, visible } : col
      )
    );
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilters(prev => {
      if (selected) {
        return [...prev, filterId];
      } else {
        return prev.filter(id => id !== filterId);
      }
    });
  }, []);

  // Create filter groups from documents
  const filterGroups = useMemo((): FilterGroup[] => {
    if (!documents.length) return [];

    // Get unique document types
    const documentTypes = Array.from(
      new Set(
        documents
          .filter(doc => doc.documentType?.value)
          .map(doc => doc.documentType?.value)
      )
    ).map(type => ({
      id: `doctype-${type!}`,
      label: type!,
      selected: selectedFilters.includes(`doctype-${type!}`),
      value: type!
    }));

    // Get unique document groups
    const documentGroups = Array.from(
      new Set(
        documents
          .filter(doc => doc.documentGroup?.value)
          .map(doc => doc.documentGroup?.value)
      )
    ).map(group => ({
      id: `docgroup-${group!}`,
      label: group!,
      selected: selectedFilters.includes(`docgroup-${group!}`),
      value: group!
    }));

    // Get unique file types (mime types)
    const fileTypes = Array.from(
      new Set(
        documents
          .filter(doc => doc.mimeType)
          .map(doc => {
            const mainType = doc.mimeType?.split('/')[0];
            return mainType?.toUpperCase();
          })
          .filter(Boolean)
      )
    ).map(type => ({
      id: `filetype-${type!}`,
      label: type!,
      selected: selectedFilters.includes(`filetype-${type!}`),
      value: type!
    }));

    // Get unique uploaders
    const uploaders = Array.from(
      new Set(
        documents
          .filter(doc => doc.createdBy)
          .map(doc => doc.createdBy)
      )
    ).map(uploaderId => {
      const displayName = getEmployeeDisplayName(uploaderId!) || 'Unknown';
      return {
        id: `uploader-${uploaderId!}`,
        label: displayName,
        selected: selectedFilters.includes(`uploader-${uploaderId!}`),
        value: uploaderId!
      };
    });

    return [
      {
        id: 'documentType',
        title: 'Document Type',
        filters: documentTypes
      },
      {
        id: 'documentGroup',
        title: 'Document Group',
        filters: documentGroups
      },
      {
        id: 'fileType',
        title: 'File Type',
        filters: fileTypes
      },
      {
        id: 'uploadedBy',
        title: 'Uploaded By',
        filters: uploaders
      }
    ];
  }, [documents, selectedFilters, getEmployeeDisplayName]);

  // Apply filters to documents for enhanced List View
  const documentsWithFilters = useMemo(() => {
    let filtered = documents;

    // Apply search filter
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.name?.toLowerCase().includes(search) ||
        doc.documentType?.value?.toLowerCase().includes(search) ||
        doc.documentGroup?.value?.toLowerCase().includes(search)
      );
    }

    // Apply selected filters
    if (selectedFilters.length > 0) {
      filtered = filtered.filter(doc => {
        // Check if document matches any of the selected filters
        const matchesDocType = selectedFilters.some(filterId => 
          filterId.startsWith('doctype-') && 
          filterId === `doctype-${doc.documentType?.value}`
        );
        const matchesDocGroup = selectedFilters.some(filterId => 
          filterId.startsWith('docgroup-') && 
          filterId === `docgroup-${doc.documentGroup?.value}`
        );
        const matchesFileType = selectedFilters.some(filterId => {
          const mainType = doc.mimeType?.split('/')[0]?.toUpperCase();
          return filterId.startsWith('filetype-') && 
                 filterId === `filetype-${mainType}`;
        });
        const matchesUploader = selectedFilters.some(filterId => 
          filterId.startsWith('uploader-') && 
          filterId === `uploader-${doc.createdBy}`
        );

        // Document matches if it matches any selected filter from each active filter group
        const hasDocTypeFilters = selectedFilters.some(f => f.startsWith('doctype-'));
        const hasDocGroupFilters = selectedFilters.some(f => f.startsWith('docgroup-'));
        const hasFileTypeFilters = selectedFilters.some(f => f.startsWith('filetype-'));
        const hasUploaderFilters = selectedFilters.some(f => f.startsWith('uploader-'));

        return (!hasDocTypeFilters || matchesDocType) &&
               (!hasDocGroupFilters || matchesDocGroup) &&
               (!hasFileTypeFilters || matchesFileType) &&
               (!hasUploaderFilters || matchesUploader);
      });
    }

    return filtered;
  }, [documents, searchQuery, selectedFilters]);

  const fetchDocuments = async () => {
    if (!leadId || !context.accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const documentsData = await fetchInvestmentDocumentsByLeadId(leadId);
      setDocuments(documentsData);
    } catch (err) {
      console.error('Error fetching lead documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [leadId, context.accessToken]);

  // Listen for process completion to refetch documents after upload
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed, refreshing lead documents');
      fetchDocuments();
    },
    onFailure: () => {
      console.log('Document upload process failed');
    }
  });

  // Column Visibility Dropdown Component
  const ColumnVisibilityDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="gba:relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gba:flex gba:items-center gba:gap-2"
          data-testid="column-visibility-dropdown"
        >
          <SettingOutlined />
          <span className="gba:text-sm">Columns</span>
        </Button>
        {isOpen && (
          <div className="gba:absolute gba:top-full gba:right-0 gba:mt-1 gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg gba:p-2 gba:min-w-[200px] gba:z-50">
            {columnConfig.map((column) => (
              <label
                key={column.id}
                className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:hover:bg-gray-50 gba:cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={column.visible}
                  disabled={column.disabled}
                  onChange={(e) => handleColumnVisibilityChange(column.id, e.target.checked)}
                  className="gba:rounded"
                />
                <span className="gba:text-sm">{column.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return <FileOutlined />;
    
    if (mimeType.includes('pdf')) return <FilePdfOutlined />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileWordOutlined />;
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return <FileExcelOutlined />;
    if (mimeType.includes('image')) return <FileImageOutlined />;
    return <FileTextOutlined />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr}, ${timeStr}`;
  };

  const filteredDocuments = Array.isArray(documents) ? documents.filter(doc => 
    !searchQuery || 
    (doc.name && doc.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (doc.documentType?.value && doc.documentType.value.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (doc.createdBy && getEmployeeDisplayName(doc.createdBy)?.toLowerCase()?.includes(searchQuery.toLowerCase()))
  ) : [];

  // removed legacy toggleFolder helper; using inline state updates in new tree implementation

  const documentFolders: DocumentFolder[] = useMemo(() => {
    const allDocs = Array.isArray(documents) ? documents : [];
    console.log('All documents received:', allDocs.map(d => ({ 
      id: d.id, 
      name: d.name, 
      folder: d.folder, 
      mimeType: d.mimeType, 
      file: d.file,
      parentDocument: d.parentDocument 
    })));
    
    const allFolders = allDocs.filter(d => {
      // Multiple ways to detect a folder:
      // 1. folder field is true (when backend works correctly)
      // 2. has no file characteristics but has a name (common folder pattern)
      // 3. documentType indicates it's a folder
      // 4. has no documentType AND no file content (created as folder but backend bug)
      const isFolderByField = d.folder === true;
      const isFolderByContent = !d.mimeType && !d.file && !!d.name && !d.documentType;
      const isFolderByType = d.documentType?.value?.toLowerCase().includes('folder') || 
                           d.documentGroup?.value?.toLowerCase().includes('folder');
      
      // Backend bug workaround: if it has no file data, no document type, but has a name, it's likely a folder
      const isFolderByPattern = !d.mimeType && !d.file && !d.fileSize && 
                               !d.documentType && !!d.name && d.name.trim() !== '';
      
      const isFolder = isFolderByField || isFolderByContent || isFolderByType || isFolderByPattern;
      const looksLikeFile = !!d.mimeType || !!d.file || !!d.fileSize;
      
      // A folder should not have file characteristics
      const result = isFolder && !looksLikeFile;
      
      console.log(`Document "${d.name}" analysis:`, {
        folder: d.folder,
        mimeType: d.mimeType,
        file: d.file,
        fileSize: d.fileSize,
        documentType: d.documentType?.value,
        documentGroup: d.documentGroup?.value,
        isFolderByField,
        isFolderByContent,
        isFolderByType,
        isFolderByPattern,
        isFolder,
        looksLikeFile,
        result
      });
      
      return result;
    });
    
    console.log('Filtered folders:', allFolders.map(f => ({ id: f.id, name: f.name, folder: f.folder })));
    const docsForFilter = Array.isArray(filteredDocuments) ? filteredDocuments : [];

    const docsByFolder: Record<string, Document[]> = {};
    for (const doc of docsForFilter) {
      if (!doc.folder && doc.parentDocument?.id) {
        const parentId = doc.parentDocument.id;
        if (!docsByFolder[parentId]) docsByFolder[parentId] = [];
        docsByFolder[parentId].push(doc);
      }
    }

    const folderNodeCache: Record<string, DocumentFolder> = {};
    const buildNode = (f: Document): DocumentFolder => {
      if (folderNodeCache[f.id]) return folderNodeCache[f.id];
      const node: DocumentFolder = {
        name: f.name || 'Unnamed Folder',
        count: (docsByFolder[f.id]?.length || 0),
        documents: docsByFolder[f.id] || [],
        folderId: f.id,
        folderVersion: f.version,
        children: [],
      };
      folderNodeCache[f.id] = node;
      const childFolders = allFolders.filter(cf => cf.parentDocument?.id === f.id);
      node.children = childFolders.map(cf => buildNode(cf));
      return node;
    };

    const rootFolders = allFolders.filter(f => !f.parentDocument);
    return rootFolders.map(buildNode);
  }, [documents, filteredDocuments]);

  // Root-level files (without parentDocument) for Tree view
  const rootLevelFiles: Document[] = useMemo(() => {
    const docsForFilter = Array.isArray(filteredDocuments) ? filteredDocuments : [];
    return docsForFilter.filter(d => {
      // Use the same logic as isFileDocument
      const isFolderByField = d.folder === true;
      const isFolderByContent = !d.mimeType && !d.file && !!d.name && !d.documentType;
      const isFolderByType = d.documentType?.value?.toLowerCase().includes('folder') || 
                           d.documentGroup?.value?.toLowerCase().includes('folder');
      const isFolderByPattern = !d.mimeType && !d.file && !d.fileSize && 
                               !d.documentType && !!d.name && d.name.trim() !== '';
      const isFolder = isFolderByField || isFolderByContent || isFolderByType || isFolderByPattern;
      const isFile = !isFolder && (!!d.mimeType || !!d.file || !!d.fileSize);
      
      return isFile && !d.parentDocument;
    });
  }, [filteredDocuments]);

  const getFileExtension = (document: Document) => {
    // Check if document.file already has an extension
    if (document.file && document.file.includes('.')) {
      // File already has extension, use as is
      return '';
    } else {
      // File doesn't have extension, determine from name or mimeType
      if (document.name && document.name.includes('.')) {
        return document.name.split('.').pop();
      }
      
      // Fallback to mimeType mapping
      const mimeTypeExtensions: Record<string, string> = {
        'application/pdf': 'pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-excel': 'xls',
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'text/plain': 'txt'
      };
      
      return (document.mimeType && mimeTypeExtensions[document.mimeType]) || 'pdf';
    }
  };

  const constructDocumentUrl = (document: Document) => {
    // Check if document.file already has an extension
    if (document.file && document.file.includes('.')) {
      // File already has extension, use as is - use IRM path since this is investment documents
      return `/files/api/v1/public/downloads/irm/leads/${leadId}/documents/${document.file}`;
    } else {
      // File doesn't have extension, add one - use IRM path since this is investment documents
      const fileExtension = getFileExtension(document);
      return `/files/api/v1/public/downloads/irm/leads/${leadId}/documents/${document.file}.${fileExtension}`;
    }
  };

  const handleViewDocument = (document: Document) => {
    if (!document.file) {
      console.error('No file ID available for document:', document);
      return;
    }

    const documentUrl = constructDocumentUrl(document);
    window.open(documentUrl, '_blank');
  };

  const handleDownloadDocument = (document: Document) => {
    if (!document.file) {
      console.error('No file ID available for document:', document);
      return;
    }

    const documentUrl = constructDocumentUrl(document);
    const link = window.document.createElement('a');
    link.href = documentUrl;
    link.download = document.name || `document.${getFileExtension(document)}`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  // Handle document deletion
  const handleDeleteDocument = (document: Document) => {
    setDeletePopup({ open: true, document });
  };

  // Handle successful document deletion
  const handleDocumentDeleted = useCallback(async () => {
    await fetchDocuments();
    message.success('Document deleted successfully');
  }, [fetchDocuments]);

  // Listen for process completion events to refresh documents
  useProcessCompletion({
    onSuccess: handleDocumentDeleted
  });

  const isFile = (doc: Document) => !doc.folder && (!!doc.mimeType || !!doc.file);
  const totalDocuments = documents.filter(isFile).length;
  const totalSize = documents.filter(isFile).reduce((sum, doc) => sum + (doc.fileSize || 0), 0);

  const isFileDocument = (d: Document): boolean => {
    // A file document is something that's not a folder and has file characteristics
    const isFolderByField = d.folder === true;
    const isFolderByContent = !d.mimeType && !d.file && !!d.name && !d.documentType;
    const isFolderByType = d.documentType?.value?.toLowerCase().includes('folder') || 
                         d.documentGroup?.value?.toLowerCase().includes('folder');
    const isFolderByPattern = !d.mimeType && !d.file && !d.fileSize && 
                             !d.documentType && !!d.name && d.name.trim() !== '';
    const isFolder = isFolderByField || isFolderByContent || isFolderByType || isFolderByPattern;
    
    return !isFolder && (!!d.mimeType || !!d.file || !!d.fileSize);
  };

  const hasDescendantFiles = (startFolderId: string): boolean => {
    if (!startFolderId) return false;
    const toVisit: string[] = [startFolderId];
    const safetyLimit = 5000;
    let visited = 0;
    while (toVisit.length && visited < safetyLimit) {
      const currentId = toVisit.pop() as string;
      for (const d of documents) {
        if (d.parentDocument?.id === currentId) {
          if (isFileDocument(d)) return true;
          toVisit.push(d.id);
        }
      }
      visited += 1;
    }
    return false;
  };

  const handleDeleteFolder = (node: DocumentFolder) => {
    if (!node.folderId || node.folderVersion == null) return;
    if (hasDescendantFiles(node.folderId)) {
      message.warning('Cannot delete a folder that contains files. Move or delete files first.');
      return;
    }
    if (node.folderId.startsWith('mock-')) {
      message.warning('Cannot delete a folder that contains files.');
      return;
    }
    Modal.confirm({
      title: 'Confirm Deletion',
      content: `Are you sure you want to delete the folder "${node.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await restClient.post('/customer-relations/saveCrmDocument', {
            changeMode: 'DELETE',
            crmDocument: { id: node.folderId, version: node.folderVersion, lead: leadId },
          }, { headers: { Authorization: `Bearer ${context.accessToken}` } });
          message.success('Folder deleted');
          await fetchDocuments();
        } catch (e: any) {
          console.error('Error deleting folder', e);
          message.error(e?.message || 'Failed to delete folder');
        }
      }
    });
  };

  // DnD helpers
  const Draggable: React.FC<{ id: string; data: any; className?: string; children: React.ReactNode }> = ({ id, data, className, children }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data });
    const style: React.CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};
    return (
      <div ref={setNodeRef} {...attributes} {...listeners} className={className} style={style} data-dragging={isDragging}>
        {children}
      </div>
    );
  };

  const Droppable: React.FC<{ id: string; data: any; className?: string; children: React.ReactNode; disabled?: boolean; isFolder?: boolean }> = ({ id, data, className, children, disabled, isFolder = false }) => {
    const { setNodeRef, isOver } = useDroppable({ id, data, disabled });
    const showDropIndicator = isDragging && isOver && !disabled;
    
    // Only show visual feedback on folders and root zones during drag
    const showBorder = isDragging && !disabled && (isFolder || id.includes('root'));
    const combinedClass = `${className || ''} ${showDropIndicator ? 'gba:ring-2 gba:ring-blue-500 gba:bg-blue-50 gba:transition-all gba:duration-200' : ''} ${showBorder ? 'gba:border-dashed gba:border-2 gba:border-blue-300' : ''}`;
    
    return (
      <div ref={setNodeRef} className={combinedClass} data-over={isOver}>
        {showDropIndicator && (isFolder || id.includes('root')) && (
          <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-blue-50 gba:bg-opacity-50 gba:rounded gba:pointer-events-none gba:z-10">
            <span className="gba:text-blue-600 gba:font-medium gba:text-sm">
              {id.includes('root') ? 'Drop to move to root level' : 'Drop into folder'}
            </span>
          </div>
        )}
        {children}
      </div>
    );
  };

  const updateParentDocumentLocal = (docId: string, parentId: string | null) => {
    setDocuments((prev) => prev.map(d => d.id === docId ? { 
      ...d, 
      parentDocument: parentId ? { id: parentId } as any : undefined 
    } : d));
  };

  const isFolderAncestor = useCallback((ancestorId: string, folderId: string): boolean => {
    if (!ancestorId || !folderId || ancestorId === folderId) return false;
    const docById: Record<string, Document> = Object.fromEntries(documents.map(d => [d.id, d]));
    let current: Document | undefined = docById[folderId];
    const maxHops = 1000;
    let hops = 0;
    while (current && hops < maxHops) {
      const currentParentId: string | undefined = current.parentDocument?.id;
      if (!currentParentId) return false;
      if (currentParentId === ancestorId) return true;
      current = docById[currentParentId];
      hops += 1;
    }
    return false;
  }, [documents]);

  const persistParentDocumentUpdate = async (
    docId: string,
    version: number,
    newParentId: string | null,
    previousParentId: string | null | undefined
  ) => {
    try {
      await restClient.post(
        '/investment-relations/updateInvestmentDocument',
        {
          id: docId,
          version: version,
          parentDocument: newParentId || null
        },
        { headers: { Authorization: `Bearer ${context.accessToken}` } }
      );
      message.success('Document moved successfully');
      // Refresh documents to get the latest state
      await fetchDocuments();
    } catch (e: any) {
      console.error('Error moving document', e);
      // Revert the local change on error
      setDocuments((prev) => prev.map(d => d.id === docId ? { 
        ...d, 
        parentDocument: previousParentId ? { id: previousParentId } as any : undefined 
      } : d));
      message.error(e?.message || 'Failed to move document');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    setIsDragging(false);
    
    const active = event.active?.data?.current as any;
    const over = event.over?.data?.current as any;
    
    if (!active || !over) {
      console.log('Drag ended without valid active or over elements');
      return;
    }
    
    const targetFolderId: string | null | undefined = (over.targetFolderId === '' ? null : (over.targetFolderId as string | null | undefined));
    if (typeof targetFolderId === 'undefined') {
      console.log('Drag ended without valid target folder');
      return;
    }
    
    if ((active.itemType === 'document' || active.itemType === 'folder') && active.id && active.version != null) {
      const previousParentId = documents.find(d => d.id === active.id)?.parentDocument?.id || null;
      
      // Check if actually moving to a different location
      if (previousParentId === targetFolderId) {
        console.log('Document dropped in same location, no move needed');
        return;
      }
      
      // Prevent moving folder into its own subfolder
      if (active.itemType === 'folder' && typeof targetFolderId === 'string' && isFolderAncestor(active.id as string, targetFolderId)) {
        message.warning('Cannot move a folder into its own subfolder');
        return;
      }
      
      // Get item name for feedback
      const itemName = documents.find(d => d.id === active.id)?.name || 'Item';
      const targetName = targetFolderId ? (documents.find(d => d.id === targetFolderId)?.name || 'folder') : 'root';
      
      console.log(`Moving ${active.itemType} "${itemName}" to ${targetFolderId ? `folder "${targetName}"` : 'root level'}`);
      
      // Update local state immediately for responsive UI
      updateParentDocumentLocal(active.id, targetFolderId);
      
      // Expand target folder if moving into a folder
      if (typeof targetFolderId === 'string') {
        setExpandedFolders(prev => { const next = new Set(prev); next.add(targetFolderId); return next; });
      }
      
      // Skip API call for mock data
      if (String(active.id).startsWith('mock-') || (typeof targetFolderId === 'string' && String(targetFolderId).startsWith('mock-'))) {
        message.success(`${active.itemType === 'folder' ? 'Folder' : 'Document'} moved successfully (mock)`);
        return;
      }
      
      // Persist to backend
      void persistParentDocumentUpdate(active.id, active.version, targetFolderId, previousParentId);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const current = event.active?.data?.current as any;
    
    if (!current) {
      console.log('Drag started without valid data');
      return;
    }
    
    if (current.itemType === 'document' && current.id) {
      const doc = documents.find(d => d.id === current.id);
      if (doc) {
        setActiveDragItem({ itemType: 'document', name: doc.name || 'Document', mimeType: doc.mimeType });
        console.log(`Started dragging document: ${doc.name}`);
      }
    } else if (current.itemType === 'folder' && current.id) {
      const folderDoc = documents.find(d => d.id === current.id);
      if (folderDoc) {
        setActiveDragItem({ itemType: 'folder', name: folderDoc.name || 'Folder' });
        console.log(`Started dragging folder: ${folderDoc.name}`);
      }
    }
  };


  // Removed legacy render helpers (Icon/List) — unified tree/list implementation below

  return (
    <Card className="gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Documents</CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <AppActionButton
              contextsArray={[FlowContextName.investmentDocumentCreate]}
              externalContextData={{ leadId }}
              prefixDataTestId="lead-documents-upload"
              accessToken={context.accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
              className="gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:border gba:border-blue-600 gba:text-blue-600 gba:hover:bg-blue-50 gba:hover:border-blue-700 gba:transition-colors gba:rounded"
              data-testid="lead-documents-upload-button"
            >
              <FileOutlined className="gba:mr-2" />
              Upload Document
            </AppActionButton>
            <AppActionButton
              contextsArray={[FlowContextName.investmentDocumentCreate]}
              externalContextData={{ leadId, createFolder: true }}
              prefixDataTestId="lead-documents-create-folder"
              accessToken={context.accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
              className="gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:border gba:border-gray-600 gba:text-gray-700 gba:hover:bg-gray-50 gba:hover:border-gray-700 gba:transition-colors gba:rounded"
              data-testid="lead-documents-create-folder-button"
            >
              <FolderAddOutlined className="gba:mr-2" />
              Create Folder
            </AppActionButton>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Input and View Toggle */}
        <div className="gba:mb-4 gba:space-y-3">
          <DebouncedInput
            placeholder="Search documents..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="gba:w-full"
            data-testid="documents-search-input"
          />
          
          {/* View Mode Toggle */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-4">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">View:</span>
              <div className="gba:flex gba:bg-gray-100 gba:rounded-lg gba:p-1 gba:gap-1">
                <Button
                  variant={viewMode === 'icon' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('icon')}
                  className="gba:px-3 gba:py-1.5"
                  data-testid="tree-view-toggle"
                >
                  <AppstoreOutlined className="gba:mr-1.5" />
                  Tree
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="gba:px-3 gba:py-1.5"
                  data-testid="list-view-toggle"
                >
                  <BarsOutlined className="gba:mr-1.5" />
                  List
                </Button>
              </div>
            </div>
            
            {/* Document Statistics */}
            <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-gray-600">
              <Badge variant="secondary" className="gba:bg-blue-50 gba:text-blue-700">
                {totalDocuments} document{totalDocuments !== 1 ? 's' : ''}
              </Badge>
              <span>{formatFileSize(totalSize)} total</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="gba:mb-4">
            <div>
              <h4 className="gba:font-medium">Error loading documents</h4>
              <p className="gba:text-sm">{error}</p>
            </div>
          </Alert>
        ) : documentFolders.length === 0 && rootLevelFiles.length === 0 ? (
          <div className="gba:text-center gba:py-10">
            <FolderOpenOutlined className="gba:text-6xl gba:text-gray-300 gba:mb-4" />
            <p className="gba:text-gray-500 gba:text-lg">No documents found</p>
            <p className="gba:text-gray-400 gba:text-sm">Documents will appear here once uploaded</p>
          </div>
        ) : viewMode === 'icon' ? (
          // TREE VIEW with DnD and folder/file actions
          <div className="gba:w-full">
            <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:overflow-hidden">
              <div className="gba:flex gba:items-center gba:py-3 gba:px-4 gba:bg-gray-50 gba:border-b gba:border-gray-200 gba:font-medium gba:text-sm gba:text-gray-700">
                <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
                  <div className="gba:w-6"></div>
                  <div className="gba:flex-1 gba:min-w-0">Name</div>
                </div>
                <div className="gba:w-44 gba:text-right gba:mr-4">Modified</div>
                <div className="gba:w-20 gba:text-right gba:mr-4">Size</div>
                <div className="gba:w-16 gba:text-right gba:mr-4">Type</div>
                <div className="gba:w-16"></div>
              </div>
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div>
                  {/* Root-level drop zone */}
                  <Droppable id={`drop-root`} data={{ targetFolderId: '' }} className="gba:w-full">
                    <div className="gba:h-4 gba:bg-transparent" />
                  </Droppable>
                  {/* Root-level files */}
                  {rootLevelFiles.map((document) => (
                    <Draggable key={document.id} id={`drag-doc-${document.id}`} data={{ itemType: 'document', id: document.id, version: document.version }}>
                      <div 
                        key={document.id}
                        className="gba:flex gba:items-center gba:py-2 gba:px-4 gba:hover:bg-blue-50 gba:cursor-pointer gba:border-b gba:border-gray-50 gba:group"
                        style={{ paddingLeft: '32px' }}
                        data-testid={`document-tree-root-${document.id}`}
                        onClick={() => handleViewDocument(document)}
                      >
                          <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
                            <div className="gba:w-6"></div>
                            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                              <div className="gba:text-blue-600 gba:text-sm">{getFileIcon(document.mimeType)}</div>
                              <span className="gba:text-sm gba:text-gray-900 gba:truncate" title={document.name || 'Unnamed Document'}>
                                {document.name || 'Unnamed Document'}
                              </span>
                            </div>
                          </div>
                          <div className="gba:w-44 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">{formatDate(document.createdAt)}</div>
                          <div className="gba:w-20 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">{formatFileSize(document.fileSize || 0)}</div>
                          <div className="gba:w-16 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">{document.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}</div>
                          <div className="gba:w-28 gba:flex gba:items-center gba:justify-end gba:gap-1">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditDocument(document); }} data-testid={`edit-tree-document-${document.id}`} className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100" title="Edit">
                              <EditOutlined style={{ fontSize: '10px' }} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDocument(document); }} data-testid={`view-tree-document-${document.id}`} className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100" title="View">
                              <EyeOutlined style={{ fontSize: '10px' }} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => { e.stopPropagation(); handleDeleteDocument(document); }} 
                              data-testid={`delete-tree-document-${document.id}`} 
                              className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100" 
                              title="Delete"
                            >
                              <DeleteOutlined style={{ fontSize: '10px' }} />
                            </Button>
                          </div>
                        </div>
                      </Draggable>
                  ))}

                  {documentFolders.map((folder) => {
                    const renderFolder = (node: DocumentFolder, depth: number) => {
                      const isExpanded = node.folderId ? expandedFolders.has(node.folderId) : false;
                      const indentPx = 16 * depth;
                      return (
                        <React.Fragment key={node.folderId || node.name}>
                          <Droppable id={`drop-folder-${node.folderId || node.name}`} data={{ targetFolderId: node.folderId }} className="gba:w-full" disabled={!node.folderId} isFolder={true}>
                            <Draggable id={`drag-folder-${node.folderId || node.name}`} data={{ itemType: 'folder', id: node.folderId, version: node.folderVersion }}>
                              <div 
                                className="gba:flex gba:items-center gba:py-2 gba:px-4 gba:hover:bg-gray-50 gba:cursor-pointer gba:border-b gba:border-gray-100"
                                onClick={() => node.folderId && setExpandedFolders(prev => { const next = new Set(prev); if (next.has(node.folderId!)) next.delete(node.folderId!); else next.add(node.folderId!); return next; })}
                                data-testid={`folder-tree-${node.folderId || node.name}`}
                                style={{ paddingLeft: `${indentPx}px` }}
                              >
                                <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
                                  <div className="gba:w-6 gba:flex gba:items-center gba:justify-center">
                                    <CaretRightOutlined className={`gba:text-xs gba:text-gray-400 gba:transition-transform ${isExpanded ? 'gba:rotate-90' : ''}`} />
                                  </div>
                                  <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                                    <FolderOpenOutlined className="gba:text-blue-600 gba:text-sm" />
                                    <span className="gba:text-sm gba:text-gray-900 gba:truncate">{node.name}</span>
                                  </div>
                                </div>
                                <div className="gba:w-44 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">{node.documents && node.documents.length > 0 ? formatDate(new Date(Math.max(...node.documents.map(doc => new Date(doc.createdAt).getTime()))).toISOString()) : '-'}</div>
                                <div className="gba:w-20 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">-</div>
                                <div className="gba:w-16 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">Folder</div>
                                <div className="gba:w-28 gba:flex gba:items-center gba:justify-end gba:gap-1">
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); console.log('TODO: Replace with AppActionButton - New Document in folder', node.folderId); }} className="gba:p-1 gba:h-6 gba:w-6" data-testid={`new-document-icon-${node.folderId || node.name}`} title="New Document">
                                    <FileOutlined className="gba:text-xs" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); console.log('TODO: Replace with AppActionButton - New Subfolder in folder', node.folderId); }} className="gba:p-1 gba:h-6 gba:w-6" data-testid={`new-subfolder-icon-${node.folderId || node.name}`} title="New Subfolder">
                                    <FolderAddOutlined className="gba:text-xs" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openRenameFolder(node); }} className="gba:p-1 gba:h-6 gba:w-6" data-testid={`rename-folder-icon-${node.folderId || node.name}`} title="Rename Folder" disabled={!node.folderId}>
                                    <EditOutlined className="gba:text-xs" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(node); }} className="gba:p-1 gba:h-6 gba:w-6" data-testid={`delete-folder-icon-${node.folderId || node.name}`} title="Delete Folder" disabled={!node.folderId}>
                                    <DeleteOutlined className="gba:text-xs" />
                                  </Button>
                                </div>
                              </div>
                            </Draggable>
                          </Droppable>

                          {isExpanded && (
                            <>
                              {Array.isArray(node.children) && node.children.map(child => renderFolder(child, depth + 1))}
                              {Array.isArray(node.documents) && node.documents.map((document) => (
                                <Draggable key={document.id} id={`drag-doc-${document.id}`} data={{ itemType: 'document', id: document.id, version: document.version }}>
                                  <div 
                                    key={document.id}
                                    className="gba:flex gba:items-center gba:py-2 gba:px-4 gba:hover:bg-blue-50 gba:cursor-pointer gba:border-b gba:border-gray-50 gba:group"
                                    style={{ paddingLeft: `${16 * (depth + 1) + 16}px` }}
                                    data-testid={`document-tree-${document.id}`}
                                    onClick={() => handleViewDocument(document)}
                                  >
                                      <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
                                        <div className="gba:w-6"></div>
                                        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                                          <div className="gba:text-blue-600 gba:text-sm">{getFileIcon(document.mimeType)}</div>
                                          <span className="gba:text-sm gba:text-gray-900 gba:truncate" title={document.name || 'Unnamed Document'}>
                                            {document.name || 'Unnamed Document'}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="gba:w-44 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">{formatDate(document.createdAt)}</div>
                                      <div className="gba:w-20 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">{formatFileSize(document.fileSize || 0)}</div>
                                      <div className="gba:w-16 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">{document.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}</div>
                                      <div className="gba:w-16 gba:flex gba:items-center gba:justify-end gba:gap-1">
                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditDocument(document); }} data-testid={`edit-tree-document-${document.id}`} className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100" title="Edit">
                                          <EditOutlined style={{ fontSize: '10px' }} />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDocument(document); }} data-testid={`view-tree-document-${document.id}`} className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100" title="View">
                                          <EyeOutlined style={{ fontSize: '10px' }} />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={(e) => { e.stopPropagation(); handleDeleteDocument(document); }} 
                                          data-testid={`delete-nested-document-${document.id}`} 
                                          className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100" 
                                          title="Delete"
                                        >
                                          <DeleteOutlined style={{ fontSize: '10px' }} />
                                        </Button>
                                      </div>
                                    </div>
                                  </Draggable>
                              ))}
                            </>
                          )}
                        </React.Fragment>
                      );
                    };
                    return renderFolder(folder, 0);
                  })}

                  {/* Bottom root drop zone */}
                  <Droppable id={`drop-root-bottom`} data={{ targetFolderId: '' }} className="gba:w-full">
                    <div className="gba:h-8 gba:bg-transparent" />
                  </Droppable>
                </div>
                <DragOverlay>
                  {activeDragItem ? (
                    <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:bg-white gba:border gba:rounded gba:shadow-md">
                      <div className="gba:text-blue-600">
                        {activeDragItem.itemType === 'document' ? getFileIcon(activeDragItem.mimeType) : <FolderOpenOutlined />}
                      </div>
                      <div className="gba:text-sm gba:text-gray-800 gba:max-w-[240px] gba:truncate" title={activeDragItem.name}>
                        {activeDragItem.name}
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        ) : (
          // LIST VIEW - Enhanced flat list with filters and column management
          <DataContainer
            dataControllerProps={{
              search: searchQuery,
              setSearch: setSearchQuery,
              debounceDelay: 500,
              filter: selectedFilters,
              setFilter: setSelectedFilters,
              filterLabelMap: {},
              listTitle: (
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span>Documents</span>
                    <span className="gba:text-gray-500">({documentsWithFilters.length})</span>
                  </div>
                </div>
              ),
              addButton: {
                onClick: () => console.log('TODO: Replace with AppActionButton - Add Document from DataContainer'),
                label: 'Add Document',
                'data-testid': 'add-document-button',
              },
              actions: [
                <ColumnVisibilityDropdown key="column-visibility" />
              ],
            }}
            dataFilterProps={{
              filterGroups,
              onFilterChange: handleFilterChange,
            }}
            dataBody={
              <div className="gba:w-full">
                <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:overflow-hidden">
                  {/* Enhanced Table Header */}
                  <div className="gba:flex gba:items-center gba:p-4 gba:bg-gray-50 gba:border-b gba:border-gray-200 gba:font-medium gba:text-sm gba:text-gray-700">
                    <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1 gba:min-w-0">
                      <div className="gba:w-8 gba:flex-shrink-0"></div>
                      {isColumnVisible('name') && <div className="gba:flex-1 gba:min-w-0">Name</div>}
                      {isColumnVisible('group') && (
                        <div className="gba:w-32 gba:flex-shrink-0">
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <FolderOpenOutlined />
                            <span>Group</span>
                          </div>
                        </div>
                      )}
                      {isColumnVisible('type') && (
                        <div className="gba:w-32 gba:flex-shrink-0">Type</div>
                      )}
                      {isColumnVisible('size') && <div className="gba:w-24 gba:flex-shrink-0">Size</div>}
                      {isColumnVisible('uploadDate') && (
                        <div className="gba:w-44 gba:flex-shrink-0">
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <CalendarOutlined />
                            <span>Upload Date</span>
                          </div>
                        </div>
                      )}
                      {isColumnVisible('expirationDate') && (
                        <div className="gba:w-44 gba:flex-shrink-0">
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <CalendarOutlined />
                            <span>Expiration Date</span>
                          </div>
                        </div>
                      )}
                      {isColumnVisible('uploadedBy') && (
                        <div className="gba:w-32 gba:flex-shrink-0">
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <UserOutlined />
                            <span>Uploaded By</span>
                          </div>
                        </div>
                      )}
                           {isColumnVisible('actions') && <div className="gba:w-20 gba:flex-shrink-0 gba:text-right">Actions</div>}
                    </div>
                  </div>
                  
                  {/* Enhanced Table Body */}
                  <div className="gba:divide-y gba:divide-gray-200">
                    {documentsWithFilters.map((document) => (
                      <div 
                        key={document.id}
                        className="gba:flex gba:items-center gba:p-4 gba:bg-white gba:border-b gba:border-gray-200 gba:hover:bg-gray-50 gba:transition-colors"
                        data-testid={`document-list-${document.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1 gba:min-w-0">
                          <div className="gba:text-lg gba:flex-shrink-0">
                            {getFileIcon(document.mimeType)}
                          </div>
                          {isColumnVisible('name') && (
                            <div className="gba:flex-1 gba:min-w-0">
                              <div className="gba:font-medium gba:text-gray-900 gba:text-sm gba:truncate" title={document.name || 'Unnamed Document'}>
                                {document.name || 'Unnamed Document'}
                              </div>
                            </div>
                          )}
                          {isColumnVisible('group') && (
                            <div className="gba:w-32 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">
                                {document.documentGroup?.value || '-'}
                              </span>
                            </div>
                          )}
                          {isColumnVisible('type') && (
                            <div className="gba:w-32 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">
                                {document.documentType?.value || '-'}
                              </span>
                            </div>
                          )}
                          {isColumnVisible('size') && (
                            <div className="gba:w-24 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">
                                {formatFileSize(document.fileSize || 0)}
                              </span>
                            </div>
                          )}
                          {isColumnVisible('uploadDate') && (
                            <div className="gba:w-44 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">
                                {formatDate(document.createdAt)}
                              </span>
                            </div>
                          )}
                          {isColumnVisible('expirationDate') && (
                            <div className="gba:w-44 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">
                                {document.expirationDate ? formatDate(document.expirationDate) : '-'}
                              </span>
                            </div>
                          )}
                          {isColumnVisible('uploadedBy') && (
                            <div className="gba:w-32 gba:flex-shrink-0">
                              <span className="gba:text-sm gba:text-gray-600">
                                {getEmployeeDisplayName(document.createdBy || '') || 'Unknown'}
                              </span>
                            </div>
                          )}
                           {isColumnVisible('actions') && (
                             <div className="gba:w-20 gba:flex-shrink-0 gba:text-right">
                               <div className="gba:flex gba:items-center gba:gap-1 gba:justify-end">
                                 <Button variant="ghost" size="sm" onClick={() => openEditDocument(document)} data-testid={`edit-list-document-${document.id}`} className="gba:p-1 gba:h-7 gba:w-7" title="Edit">
                                   <EditOutlined className="gba:text-xs" />
                                 </Button>
                                 <Button variant="ghost" size="sm" onClick={() => handleViewDocument(document)} data-testid={`view-list-document-${document.id}`} className="gba:p-1 gba:h-7 gba:w-7" title="View">
                                   <EyeOutlined className="gba:text-xs" />
                                 </Button>
                                 <Button variant="ghost" size="sm" onClick={() => handleDownloadDocument(document)} data-testid={`download-list-document-${document.id}`} className="gba:p-1 gba:h-7 gba:w-7" title="Download">
                                   <DownloadOutlined className="gba:text-xs" />
                                 </Button>
                               </div>
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            }
          />
        )}
      </CardContent>
      {/* Rename Folder Modal */}
      <Modal
        open={renameModal.open}
        title="Rename Folder"
        onOk={confirmRenameFolder}
        onCancel={() => setRenameModal({ open: false, name: '', node: undefined })}
        okText="Save"
        data-testid="rename-folder-modal"
      >
        <AntdInput
          value={renameModal.name}
          onChange={(e) => setRenameModal(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter new folder name"
          data-testid="rename-folder-input"
        />
      </Modal>

      {deletePopup.open && deletePopup.document && (
        <SimpleDocumentDeletePopup
          isOpen={deletePopup.open}
          onClose={() => setDeletePopup({ open: false })}
          accessToken={context.accessToken}
          documentId={deletePopup.document.id}
          documentVersion={deletePopup.document.version}
          documentName={deletePopup.document.name || 'Unnamed Document'}
          leadId={leadId}
          onSuccess={() => {
            const id = deletePopup.document!.id;
            setDocuments(prev => prev.filter(d => d.id !== id));
            setDeletePopup({ open: false });
            message.success('Document deleted successfully');
          }}
          onError={() => setDeletePopup({ open: false })}
        />
      )}
    </Card>
  );
};

export default LeadDocuments; 