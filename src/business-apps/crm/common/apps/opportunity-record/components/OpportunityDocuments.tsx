import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Spinner, 
  Alert, 
  Badge,
  Button,
  Input,
  Select
} from '@newwork/nw-design-system';
import { 
  FileTextOutlined, 
  FilePdfOutlined, 
  FileImageOutlined, 
  FileExcelOutlined, 
  FileWordOutlined,
  FileOutlined,
  SearchOutlined,
  FolderOpenOutlined,
  DownloadOutlined,
  EyeOutlined,
  CloudUploadOutlined,
  CaretRightOutlined,
  AppstoreOutlined,
  BarsOutlined,
  CalendarOutlined,
  UserOutlined,
  SettingOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { DataContainer } from '@/components/layout/dataContainer';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { startProcess } from '@/common/utils/start-process';
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';

interface Document {
  id: string;
  version: number;
  name?: string | null;
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
}

interface DocumentFolder {
  name: string;
  count: number;
  documents: Document[];
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

interface OpportunityDocumentsProps {
  opportunityId: string;
  context: BusinessAppContextProps;
}

export const OpportunityDocuments: React.FC<OpportunityDocumentsProps> = ({ 
  opportunityId, 
  context 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('icon');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
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

  const graphQLClient = useGraphQLClient(context.accessToken);
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);

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
    if (!opportunityId || !context.accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const GET_OPPORTUNITY_DOCUMENTS = `
        query GetOpportunityDocuments($opportunityId: uuid!) {
          CrmDocument(where: {opportunityId: {_eq: $opportunityId}, isDeleted: {_eq: false}}) {
            id
            version
            name
            createdAt
            expirationDate
            documentType {
              id
              value
              code
            }
            documentGroup {
              id
              value
              code
            }
            file
            mimeType
            fileSize
            createdBy
          }
        }
      `;

      const result = await graphQLClient.request<{
        CrmDocument: Document[];
      }>(GET_OPPORTUNITY_DOCUMENTS, { opportunityId });

      // Ensure we always set an array, even if the response is malformed
      const documents = result?.CrmDocument || [];
      setDocuments(Array.isArray(documents) ? documents : []);
      
      // Auto-expand the first folder when documents are loaded
      if (documents.length > 0) {
        const firstFolderName = documents[0]?.documentType?.value || 'Other';
        setExpandedFolders(new Set([firstFolderName]));
      }
    } catch (err) {
      console.error('Error fetching opportunity documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = () => {
    if (opportunityId) {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveCrmDocument',
        payload: {
          opportunityId,
        },
        builderType: 'NATIVE_SCREEN',
      });
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [opportunityId, context.accessToken]);

  // Listen for process completion to refetch documents after upload
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed, refreshing opportunity documents');
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

  const toggleFolder = (folderName: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const documentFolders: DocumentFolder[] = useMemo(() => {
    if (!Array.isArray(filteredDocuments)) {
      return [];
    }
    const grouped = filteredDocuments.reduce((acc, doc) => {
      const group = doc.documentType?.value || 'Other';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(doc);
      return acc;
    }, {} as Record<string, Document[]>);

    return Object.entries(grouped).map(([name, documents]) => ({
      name,
      count: documents.length,
      documents
    }));
  }, [filteredDocuments]);

  const getFileExtension = (document: Document) => {
    // Try to get extension from file name first
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
  };

  const constructDocumentUrl = (document: Document) => {
    // Check if document.file already has an extension
    if (document.file && document.file.includes('.')) {
      // File already has extension, use as is
      return `/files/api/v1/public/downloads/crm/opportunities/${opportunityId}/documents/${document.file}`;
    } else {
      // File doesn't have extension, add one
      const fileExtension = getFileExtension(document);
      return `/files/api/v1/public/downloads/crm/opportunities/${opportunityId}/documents/${document.file}.${fileExtension}`;
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

  const totalDocuments = documents.length;
  const totalSize = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);

  // Get all documents sorted chronologically for list view
  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredDocuments]);

  // Render individual document in icon view (compact file explorer style)
  const renderDocumentIcon = (document: Document) => (
    <div 
      key={document.id}
      className="gba:flex gba:flex-col gba:items-center gba:p-2 gba:hover:bg-blue-50 gba:rounded gba:cursor-pointer gba:w-20 gba:group gba:relative"
      data-testid={`document-icon-${document.id}`}
      onClick={() => handleViewDocument(document)}
      onDoubleClick={() => handleViewDocument(document)}
    >
      <div className="gba:text-2xl gba:mb-1 gba:text-blue-600">
        {getFileIcon(document.mimeType)}
      </div>
      <div className="gba:text-center gba:w-full">
        <div 
          className="gba:text-xs gba:text-gray-900 gba:leading-tight gba:break-words gba:line-clamp-2 gba:px-1"
          title={document.name || 'Unnamed Document'}
          style={{ fontSize: '11px', lineHeight: '13px' }}
        >
          {document.name || 'Unnamed Document'}
        </div>
      </div>
      
      {/* Context menu on right-click or hover actions */}
      <div className="gba:absolute gba:top-1 gba:right-1 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:flex gba:gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDocument(document);
          }}
          data-testid={`view-icon-document-${document.id}`}
          className="gba:p-1 gba:h-5 gba:w-5 gba:bg-white gba:shadow-sm gba:border"
          title="View"
        >
          <EyeOutlined style={{ fontSize: '10px' }} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadDocument(document);
          }}
          data-testid={`download-icon-document-${document.id}`}
          className="gba:p-1 gba:h-5 gba:w-5 gba:bg-white gba:shadow-sm gba:border"
          title="Download"
        >
          <DownloadOutlined style={{ fontSize: '10px' }} />
        </Button>
      </div>
    </div>
  );

  // Render individual document in list view (detailed format)
  const renderDocumentListItem = (document: Document, showFolder: boolean = true) => (
    <div 
      key={document.id}
      className="gba:flex gba:items-center gba:p-4 gba:bg-white gba:border-b gba:border-gray-200 gba:hover:bg-gray-50 gba:transition-colors"
      data-testid={`document-list-${document.id}`}
    >
      <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1 gba:min-w-0">
        <div className="gba:text-lg gba:flex-shrink-0">
          {getFileIcon(document.mimeType)}
        </div>
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:font-medium gba:text-gray-900 gba:text-sm gba:truncate" title={document.name || 'Unnamed Document'}>
            {document.name || 'Unnamed Document'}
          </div>
        </div>
        {showFolder && (
          <div className="gba:w-32 gba:flex-shrink-0">
            <span className="gba:text-sm gba:text-gray-600">
              {document.documentType?.value || 'Other'}
            </span>
          </div>
        )}
        <div className="gba:w-24 gba:flex-shrink-0">
          <span className="gba:text-sm gba:text-gray-600">
            {formatFileSize(document.fileSize || 0)}
          </span>
        </div>
        <div className="gba:w-32 gba:flex-shrink-0">
          <span className="gba:text-sm gba:text-gray-600">
            {formatDate(document.createdAt)}
          </span>
        </div>
        <div className="gba:w-32 gba:flex-shrink-0">
          <span className="gba:text-sm gba:text-gray-600">
            {getEmployeeDisplayName(document.createdBy || '') || 'Unknown'}
          </span>
        </div>
        <div className="gba:w-20 gba:flex-shrink-0 gba:text-right">
          <div className="gba:flex gba:items-center gba:gap-1 gba:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDocument(document)}
              data-testid={`view-list-document-${document.id}`}
              className="gba:p-1 gba:h-7 gba:w-7"
              title="View"
            >
              <EyeOutlined className="gba:text-xs" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadDocument(document)}
              data-testid={`download-list-document-${document.id}`}
              className="gba:p-1 gba:h-7 gba:w-7"
              title="Download"
            >
              <DownloadOutlined className="gba:text-xs" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Documents</CardTitle>
          <Button
            variant="outline"
            onClick={handleAddDocument}
            className="gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:border-blue-600 gba:text-blue-600 gba:hover:bg-blue-50 gba:hover:border-blue-700 gba:transition-colors"
          >
            <FileOutlined className="gba:mr-2" />
            Upload Document
          </Button>
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
        ) : documentFolders.length === 0 ? (
          <div className="gba:text-center gba:py-10">
            <FolderOpenOutlined className="gba:text-6xl gba:text-gray-300 gba:mb-4" />
            <p className="gba:text-gray-500 gba:text-lg">No documents found</p>
            <p className="gba:text-gray-400 gba:text-sm">Documents will appear here once uploaded</p>
          </div>
        ) : viewMode === 'icon' ? (
          // TREE VIEW - Hierarchical tree view like Windows Explorer  
          <div className="gba:w-full">
            <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:overflow-hidden">
              {/* Table Header */}
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
              
              {/* Tree Body */}
              <div>
                {documentFolders.map((folder) => {
                  const isExpanded = expandedFolders.has(folder.name);
                  return (
                    <React.Fragment key={folder.name}>
                      {/* Folder Row */}
                      <div 
                        className="gba:flex gba:items-center gba:py-2 gba:px-4 gba:hover:bg-gray-50 gba:cursor-pointer gba:border-b gba:border-gray-100"
                        onClick={() => toggleFolder(folder.name)}
                        data-testid={`folder-tree-${folder.name}`}
                      >
                        <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
                          <div className="gba:w-6 gba:flex gba:items-center gba:justify-center">
                            <CaretRightOutlined 
                              className={`gba:text-xs gba:text-gray-400 gba:transition-transform ${isExpanded ? 'gba:rotate-90' : ''}`} 
                            />
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                            <FolderOpenOutlined className="gba:text-blue-600 gba:text-sm" />
                            <span className="gba:text-sm gba:text-gray-900 gba:truncate">{folder.name}</span>
                          </div>
                        </div>
                        <div className="gba:w-44 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                          {folder.documents && folder.documents.length > 0 
                            ? formatDate(new Date(Math.max(...folder.documents.map(doc => new Date(doc.createdAt).getTime()))).toISOString()) 
                            : '-'}
                        </div>
                        <div className="gba:w-20 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">-</div>
                        <div className="gba:w-16 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">Folder</div>
                        <div className="gba:w-16"></div>
                      </div>
                      
                      {/* Files in Folder */}
                      {isExpanded && Array.isArray(folder.documents) && folder.documents.map((document) => (
                        <div 
                          key={document.id}
                          className="gba:flex gba:items-center gba:py-2 gba:px-4 gba:hover:bg-blue-50 gba:cursor-pointer gba:border-b gba:border-gray-50 gba:group"
                          style={{ paddingLeft: '32px' }}
                          data-testid={`document-tree-${document.id}`}
                          onClick={() => handleViewDocument(document)}
                        >
                          <div className="gba:flex gba:items-center gba:flex-1 gba:min-w-0">
                            <div className="gba:w-6"></div>
                            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                              <div className="gba:text-blue-600 gba:text-sm">
                                {getFileIcon(document.mimeType)}
                              </div>
                              <span 
                                className="gba:text-sm gba:text-gray-900 gba:truncate"
                                title={document.name || 'Unnamed Document'}
                              >
                                {document.name || 'Unnamed Document'}
                              </span>
                            </div>
                          </div>
                          <div className="gba:w-44 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                            {formatDate(document.createdAt)}
                          </div>
                          <div className="gba:w-20 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                            {formatFileSize(document.fileSize || 0)}
                          </div>
                          <div className="gba:w-16 gba:text-right gba:mr-4 gba:text-sm gba:text-gray-500">
                            {document.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
                          </div>
                          <div className="gba:w-16 gba:flex gba:items-center gba:justify-end gba:gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDocument(document);
                              }}
                              data-testid={`view-tree-document-${document.id}`}
                              className="gba:p-1 gba:h-6 gba:w-6 gba:opacity-0 gba:group-hover:opacity-100"
                              title="View"
                            >
                              <EyeOutlined style={{ fontSize: '10px' }} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}
              </div>
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
                onClick: () => startProcess({
                  domain: 'customer-relations',
                  processName: 'saveCrmDocument',
                  payload: {
                    opportunityId,
                  },
                  builderType: 'NATIVE_SCREEN',
                }),
                label: "Add Document",
                "data-testid": "add-document-button",
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDocument(document)}
                                  data-testid={`view-list-document-${document.id}`}
                                  className="gba:p-1 gba:h-7 gba:w-7"
                                  title="View"
                                >
                                  <EyeOutlined className="gba:text-xs" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadDocument(document)}
                                  data-testid={`download-list-document-${document.id}`}
                                  className="gba:p-1 gba:h-7 gba:w-7"
                                  title="Download"
                                >
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
    </Card>
  );
};

export default OpportunityDocuments; 