import React, { useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { FileExplorer, type FileExplorerNode } from '@newwork/nw-design-system';

interface DocumentSectionProps extends BusinessAppContextProps {
  entityId: string;
  entityType: 'account' | 'contact' | 'opportunity' | 'lead';
  demo?: boolean;
  'data-testid'?: string;
}

const DocumentSection: React.FC<DocumentSectionProps> = ({ entityId, demo }) => {
  // Demo data similar to FileExplorerDemo when demo mode is enabled
  const nodes = useMemo<FileExplorerNode[]>(() => {
    if (!demo) return [];
    const now = new Date();
    return [
      { id: 'folder-contracts', name: 'Contracts', type: 'folder', size: 0, modified: new Date('2024-01-25T10:00:00Z'), parentId: null, starred: true },
      { id: 'file-agreement', name: 'Master Service Agreement.pdf', type: 'file', size: 2_048_576, modified: new Date('2024-01-24T09:30:00Z'), parentId: 'folder-contracts', mimeType: 'application/pdf' },
      { id: 'file-nda', name: 'Mutual NDA.docx', type: 'file', size: 512_000, modified: new Date('2024-01-23T12:15:00Z'), parentId: 'folder-contracts', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      { id: 'folder-marketing', name: 'Marketing', type: 'folder', size: 0, modified: new Date('2024-01-22T08:00:00Z'), parentId: null },
      { id: 'file-logo', name: 'Company Logo.png', type: 'file', size: 256_000, modified: new Date('2024-01-21T16:45:00Z'), parentId: 'folder-marketing', mimeType: 'image/png' },
      { id: 'file-press', name: 'Press Release Q1.txt', type: 'file', size: 64_000, modified: new Date('2024-01-20T14:00:00Z'), parentId: 'folder-marketing', mimeType: 'text/plain' },
      { id: 'readme', name: 'README.md', type: 'file', size: 8_192, modified: now, parentId: null, mimeType: 'text/markdown' },
    ];
  }, [entityId, demo]);

  return (
    <div data-testid="document-section">
      <FileExplorer
        nodes={nodes}
        showSearch
        allowDragDrop
        allowMultiSelect
        showHeader
        title="Documents"
        defaultExpanded={demo ? ['folder-contracts', 'folder-marketing'] : []}
        allowUpload
        allowCreateFolder
        onNodesChange={() => {}}
        onSelectionChange={() => {}}
        onFileUpload={() => {}}
        onNodeAction={() => {}}
      />
    </div>
  );
};

export default DocumentSection;


