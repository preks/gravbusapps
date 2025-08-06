import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Spinner, 
  Alert, 
  Badge,
  Button,
  Input
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
  CaretRightOutlined,
  AppstoreOutlined,
  BarsOutlined,
  CalendarOutlined,
  UserOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';
import { startProcess } from '@/common/utils/start-process';

interface Document {
  id: string;
  version: number;
  name?: string | null;
  createdAt: string;
  documentType?: {
    value: string;
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

interface ContactDocumentsProps {
  contactId: string;
  context: BusinessAppContextProps;
}

export const ContactDocuments: React.FC<ContactDocumentsProps> = ({ 
  contactId, 
  context 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('icon');

  const graphQLClient = useGraphQLClient(context.accessToken);
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!contactId || !context.accessToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const GET_CONTACT_DOCUMENTS = `
          query GetContactDocuments($contactId: uuid!) {
            CrmDocument(where: {contactId: {_eq: $contactId}, isDeleted: {_eq: false}}) {
              id
              version
              name
              createdAt
              documentType {
                value
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
        }>(GET_CONTACT_DOCUMENTS, { contactId });

        // Ensure we always set an array, even if the response is malformed
        const documents = result?.CrmDocument || [];
        setDocuments(Array.isArray(documents) ? documents : []);
        
        // Auto-expand the first folder when documents are loaded
        if (documents.length > 0) {
          const firstFolderName = documents[0]?.documentType?.value || 'Other';
          setExpandedFolders(new Set([firstFolderName]));
        }
      } catch (err) {
        console.error('Error fetching contact documents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [contactId, context.accessToken, graphQLClient]);

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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
      return `/files/api/v1/public/downloads/crm/contacts/${contactId}/documents/${document.file}`;
    } else {
      // File doesn't have extension, add one
      const fileExtension = getFileExtension(document);
      return `/files/api/v1/public/downloads/crm/contacts/${contactId}/documents/${document.file}.${fileExtension}`;
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
            onClick={() => startProcess({
              domain: 'customer-relations',
              processName: 'saveCrmDocument',
              payload: {
                contactId,
              },
              builderType: 'NATIVE_SCREEN',
            })}
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
              <div className="gba:flex gba:bg-gray-100 gba:rounded-lg gba:p-1">
                <Button
                  variant={viewMode === 'icon' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('icon')}
                  className="gba:px-3 gba:py-1.5"
                  data-testid="icon-view-toggle"
                >
                  <AppstoreOutlined className="gba:mr-1.5" />
                  Icons
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
          // ICON VIEW - Folder-based layout with small document icons
          <div className="gba:w-full gba:space-y-4">
            {Array.isArray(documentFolders) && documentFolders.length > 0 ? documentFolders.map((folder) => {
              const isExpanded = expandedFolders.has(folder.name);
              return (
                <div key={folder.name} className="gba:border gba:border-gray-200 gba:rounded-lg">
                  <div 
                    className="gba:py-4 gba:px-6 gba:bg-gray-50 gba:border-b gba:border-gray-200 gba:cursor-pointer gba:hover:bg-gray-100 gba:transition-colors"
                    onClick={() => toggleFolder(folder.name)}
                  >
                    <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <CaretRightOutlined 
                          className={`gba:text-lg gba:transition-transform ${isExpanded ? 'gba:rotate-90' : ''}`} 
                        />
                        <FolderOpenOutlined className="gba:text-lg" />
                        <span className="gba:font-medium">{folder.name}</span>
                      </div>
                      <Badge variant="secondary">{folder.count} files</Badge>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="gba:px-6 gba:py-4">
                      <div className="gba:grid gba:grid-cols-4 sm:gba:grid-cols-6 md:gba:grid-cols-8 lg:gba:grid-cols-10 xl:gba:grid-cols-12 gba:gap-2 gba:relative">
                        {Array.isArray(folder.documents) ? folder.documents.map(renderDocumentIcon) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : null}
          </div>
        ) : (
          // LIST VIEW - Table format with all columns, sorted chronologically
          <div className="gba:w-full">
            <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:overflow-hidden">
              {/* Table Header */}
              <div className="gba:flex gba:items-center gba:p-4 gba:bg-gray-50 gba:border-b gba:border-gray-200 gba:font-medium gba:text-sm gba:text-gray-700">
                <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1 gba:min-w-0">
                  <div className="gba:w-8 gba:flex-shrink-0"></div>
                  <div className="gba:flex-1 gba:min-w-0">Name</div>
                  <div className="gba:w-32 gba:flex-shrink-0">
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <FolderOpenOutlined />
                      <span>Folder</span>
                    </div>
                  </div>
                  <div className="gba:w-24 gba:flex-shrink-0">Size</div>
                  <div className="gba:w-32 gba:flex-shrink-0">
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <CalendarOutlined />
                      <span>Date</span>
                    </div>
                  </div>
                  <div className="gba:w-32 gba:flex-shrink-0">
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <UserOutlined />
                      <span>Created By</span>
                    </div>
                  </div>
                  <div className="gba:w-20 gba:flex-shrink-0 gba:text-right">Actions</div>
                </div>
              </div>
              
              {/* Table Body */}
              <div className="gba:divide-y gba:divide-gray-200">
                {sortedDocuments.map((document) => renderDocumentListItem(document, true))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactDocuments; 