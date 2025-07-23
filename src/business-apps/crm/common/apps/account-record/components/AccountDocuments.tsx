import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Spinner, 
  Alert, 
  Badge,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
  EyeOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useEmployeeData } from '@/business-apps/crm/common/hooks/useEmployeeData';

interface AccountDocumentsProps {
  accountId: string;
  context: BusinessAppContextProps;
}

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

export const AccountDocuments: React.FC<AccountDocumentsProps> = ({ 
  accountId, 
  context 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
            CrmDocument(
              where: { 
                accountId: { _eq: $accountId }
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
        }>(GET_ACCOUNT_DOCUMENTS, { accountId });

        setDocuments(result.CrmDocument || []);
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

  const filteredDocuments = documents.filter(doc => 
    !searchQuery || 
    (doc.name && doc.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (doc.documentType?.value && doc.documentType.value.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (doc.createdBy && getEmployeeDisplayName(doc.createdBy)?.toLowerCase()?.includes(searchQuery.toLowerCase()))
  );

  const documentFolders: DocumentFolder[] = React.useMemo(() => {
    const grouped = filteredDocuments.reduce((acc, doc) => {
      const group = doc.documentType?.value || 'Other';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(doc);
      return acc;
    }, {} as Record<string, Document[]>);

    const folderColors: Record<string, string> = {
      'Contract': 'gba:bg-blue-50 gba:border-blue-200',
      'Invoice': 'gba:bg-green-50 gba:border-green-200',
      'Certificate': 'gba:bg-purple-50 gba:border-purple-200',
      'Report': 'gba:bg-orange-50 gba:border-orange-200',
      'Agreement': 'gba:bg-red-50 gba:border-red-200',
      'Statement': 'gba:bg-yellow-50 gba:border-yellow-200',
      'Proposal': 'gba:bg-pink-50 gba:border-pink-200',
      'Other': 'gba:bg-gray-50 gba:border-gray-200',
      'Unknown': 'gba:bg-slate-50 gba:border-slate-200'
    };

    return Object.entries(grouped).map(([group, docs]) => ({
      name: group,
      count: docs.length,
      documents: docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      color: folderColors[group] || 'gba:bg-gray-50 gba:border-gray-200'
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
    <Card className="gba:w-full" data-testid="account-documents-card">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FolderOpenOutlined />
            Documents ({totalDocuments})
          </CardTitle>
          <div className="gba:flex gba:gap-4 gba:text-sm">
            <div className="gba:text-center">
              <div className="gba:font-medium gba:text-blue-600">Total Files</div>
              <div>{totalDocuments}</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-medium gba:text-green-600">Total Size</div>
              <div className="gba:font-semibold">{formatFileSize(totalSize)}</div>
            </div>
            <div className="gba:text-center">
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
            <p className="gba:mt-4 gba:text-gray-500">Loading documents...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="gba:mb-4">
            <div>Failed to load documents</div>
            <div className="gba:text-sm gba:mt-2">{error}</div>
          </Alert>
        ) : documentFolders.length === 0 ? (
          <div className="gba:text-center gba:py-10" data-testid="no-documents-message">
            <div className="gba:text-4xl gba:mb-4">📁</div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-700 gba:mb-2">
              {searchQuery ? 'No Documents Found' : 'No Documents Yet'}
            </h3>
            <p className="gba:text-gray-500">
              {searchQuery 
                ? `No documents match your search for "${searchQuery}"`
                : 'This account doesn\'t have any documents yet.'
              }
            </p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={documentFolders.map(folder => folder.name)} className="gba:w-full">
            {documentFolders.map((folder) => (
              <AccordionItem key={folder.name} value={folder.name}>
                <AccordionTrigger 
                  className={`gba:px-4 gba:py-3 gba:rounded-lg gba:border-2 ${folder.color} gba:hover:shadow-md gba:transition-all`}
                  data-testid={`document-folder-${folder.name.toLowerCase()}`}
                >
                  <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <FolderOpenOutlined className="gba:text-lg" />
                      <span className="gba:font-medium">{folder.name}</span>
                    </div>
                    <Badge variant="secondary">{folder.count} files</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="gba:px-4 gba:pb-4">
                  <div className="gba:space-y-3">
                    {folder.documents.map((document) => (
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
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}; 