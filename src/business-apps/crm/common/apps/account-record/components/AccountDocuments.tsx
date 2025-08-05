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
}

interface AccountDocumentsProps {
  accountId: string;
  context: BusinessAppContextProps;
}

export const AccountDocuments: React.FC<AccountDocumentsProps> = ({ 
  accountId, 
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
      if (!accountId || !context.accessToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const GET_ACCOUNT_DOCUMENTS = `
          query GetAccountDocuments($accountId: uuid!) {
            CrmDocument(where: {accountId: {_eq: $accountId}, isDeleted: {_eq: false}}) {
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
        }>(GET_ACCOUNT_DOCUMENTS, { accountId });

        // Ensure we always set an array, even if the response is malformed
        const documents = result?.CrmDocument || [];
        setDocuments(Array.isArray(documents) ? documents : []);
        
        // Auto-expand the first folder when documents are loaded
        if (documents.length > 0) {
          const firstFolderName = documents[0]?.documentType?.value || 'Other';
          setExpandedFolders(new Set([firstFolderName]));
        }
      } catch (err) {
        console.error('Error fetching account documents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [accountId, context.accessToken, graphQLClient]);

  const getFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return <FileOutlined className="gba:text-gray-500" />;
    if (mimeType.includes('pdf')) return <FilePdfOutlined className="gba:text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('msword')) return <FileWordOutlined className="gba:text-blue-500" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileExcelOutlined className="gba:text-green-500" />;
    if (mimeType.includes('image')) return <FileImageOutlined className="gba:text-purple-500" />;
    return <FileOutlined className="gba:text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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
      return `/files/api/v1/public/downloads/crm/accounts/${accountId}/documents/${document.file}`;
    } else {
      // File doesn't have extension, add one
      const fileExtension = getFileExtension(document);
      return `/files/api/v1/public/downloads/crm/accounts/${accountId}/documents/${document.file}.${fileExtension}`;
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
                accountId,
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
        {/* Search Input */}
        <div className="gba:mb-4">
                  <DebouncedInput
          placeholder="Search documents..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="gba:w-full"
          data-testid="documents-search-input"
        />
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

export default AccountDocuments; 