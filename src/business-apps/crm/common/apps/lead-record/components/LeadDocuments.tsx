import React, { useState, useEffect } from 'react';
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
  CaretRightOutlined
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
  color: string;
}

interface LeadDocumentsProps {
  leadId: string;
  context: BusinessAppContextProps;
}

export const LeadDocuments: React.FC<LeadDocumentsProps> = ({ 
  leadId, 
  context 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const graphQLClient = useGraphQLClient(context.accessToken);
  const { getEmployeeDisplayName } = useEmployeeData(context.accessToken);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!leadId || !context.accessToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const GET_LEAD_DOCUMENTS = `
          query GetLeadDocuments($leadId: uuid!) {
            CrmDocument(
              where: { 
                leadId: { _eq: $leadId }
                isDeleted: { _eq: false }
              }
              orderBy: { createdAt: DESC }
              limit: 100
            ) {
              version
              id
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
        }>(GET_LEAD_DOCUMENTS, { leadId });

        // Ensure we always set an array, even if the response is malformed
        const documents = result?.CrmDocument || [];
        setDocuments(Array.isArray(documents) ? documents : []);
        
        // Auto-expand the first folder when documents are loaded
        if (documents.length > 0) {
          const firstFolderName = documents[0]?.documentType?.value || 'Other';
          setExpandedFolders(new Set([firstFolderName]));
        }
      } catch (err) {
        console.error('Error fetching lead documents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [leadId, context.accessToken, graphQLClient]);

  const getFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return <FileOutlined className="gba:text-gray-500" />;
    if (mimeType.includes('pdf')) return <FilePdfOutlined className="gba:text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('msword')) return <FileWordOutlined className="gba:text-blue-500" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileExcelOutlined className="gba:text-green-500" />;
    if (mimeType.includes('image')) return <FileImageOutlined className="gba:text-purple-500" />;
    return <FileOutlined className="gba:text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
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

  const documentFolders: DocumentFolder[] = React.useMemo(() => {
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

    const folderColors: Record<string, string> = {
      'Contract': 'gba:text-blue-600',
      'Invoice': 'gba:text-green-600',
      'Proposal': 'gba:text-purple-600',
      'Report': 'gba:text-orange-600',
      'Presentation': 'gba:text-pink-600',
      'Communication': 'gba:text-indigo-600',
      'Legal': 'gba:text-red-600',
      'Financial': 'gba:text-yellow-600',
      'Technical': 'gba:text-cyan-600',
      'Marketing': 'gba:text-rose-600',
      'Other': 'gba:text-gray-600',
      'Unknown': 'gba:text-gray-500'
    };

    return Object.entries(grouped).map(([name, docs]) => ({
      name,
      count: docs.length,
      documents: docs,
      color: folderColors[name] || 'gba:text-gray-600'
    })).sort((a, b) => b.count - a.count);
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
      // File already has extension, use as is
      return `/files/api/v1/public/downloads/crm/leads/${leadId}/documents/${document.file}`;
    } else {
      // File doesn't have extension, add one
      const fileExtension = getFileExtension(document);
      return `/files/api/v1/public/downloads/crm/leads/${leadId}/documents/${document.file}.${fileExtension}`;
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

  return (
    <Card className="gba:w-full" data-testid="lead-documents-card">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-xl gba:font-semibold gba:flex gba:items-center gba:gap-2">
            <FolderOpenOutlined className="gba:text-blue-600" />
            Documents ({totalDocuments})
          </CardTitle>
          <Button
            variant="outline"
            onClick={() => startProcess({
              domain: 'customer-relations',
              processName: 'saveCrmDocument',
              payload: {
                leadId,
              },
              builderType: 'NATIVE_SCREEN',
            })}
            className="gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:border-blue-600 gba:text-blue-600 gba:hover:bg-blue-50 gba:hover:border-blue-700 gba:transition-colors"
          >
            <FileOutlined className="gba:mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Summary Statistics */}
        <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:mt-4">
          <div className="gba:bg-blue-50 gba:p-3 gba:rounded-lg">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:font-medium gba:text-blue-600">Total Files</div>
              <div>{totalDocuments}</div>
            </div>
          </div>
          <div className="gba:bg-green-50 gba:p-3 gba:rounded-lg">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:font-medium gba:text-green-600">Total Size</div>
              <div>{formatFileSize(totalSize)}</div>
            </div>
          </div>
          <div className="gba:bg-purple-50 gba:p-3 gba:rounded-lg">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:font-medium gba:text-purple-600">Folders</div>
              <div>{documentFolders.length}</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="gba:mt-4">
          <div className="gba:relative">
            <SearchOutlined className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-gray-400 gba:z-10" />
            <DebouncedInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search documents..."
              className="gba:pl-12 gba:pr-4 gba:py-2 gba:w-full gba:border gba:border-gray-300 gba:rounded-md gba:focus:ring-2 gba:focus:ring-blue-500 gba:focus:border-blue-500"
              data-testid="documents-search-input"
            />
          </div>
        </div>

        {searchQuery && (
          <div className="gba:text-sm gba:text-gray-500">
            Found {filteredDocuments.length} documents matching "{searchQuery}"
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="gba:text-center gba:py-10">
            <Spinner size="lg" />
            <p className="gba:mt-2 gba:text-gray-500">Loading documents...</p>
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
        ) : (
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
                      <div className="gba:space-y-3">
                        {Array.isArray(folder.documents) ? folder.documents.map((document) => (
                          <div 
                            key={document.id}
                            className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:hover:shadow-sm gba:transition-shadow"
                            data-testid={`document-item-${document.id}`}
                          >
                            <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1">
                              <div className="gba:text-xl">
                                {getFileIcon(document.mimeType)}
                              </div>
                              <div className="gba:flex-1">
                                <div className="gba:font-medium gba:text-gray-900 gba:text-base">{document.name || 'Unnamed Document'}</div>
                                <div className="gba:text-sm gba:text-gray-500 gba:mt-1">
                                  {formatDate(document.createdAt)}{document.createdBy && ` - ${getEmployeeDisplayName(document.createdBy) || 'Unknown User'}`}
                                </div>
                                <div className="gba:text-sm gba:text-gray-500 gba:mt-1">
                                  Type: {document.mimeType || 'Unknown'}
                                  {document.fileSize && (
                                    <span className="gba:ml-4">Size: {formatFileSize(document.fileSize)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDocument(document)}
                                data-testid={`view-document-${document.id}`}
                                className="gba:px-2 gba:py-1"
                              >
                                <EyeOutlined className="gba:mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadDocument(document)}
                                data-testid={`download-document-${document.id}`}
                                className="gba:px-2 gba:py-1"
                              >
                                <DownloadOutlined className="gba:mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        )) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 