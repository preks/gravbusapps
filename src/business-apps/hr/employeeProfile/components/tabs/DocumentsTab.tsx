'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Employee } from '../../hooks/useEmployeeData';
import { Card } from '@newwork/gravity-ui-catalog';
import { DataCards } from '@/business-apps/hr/employeeProfile/components/DataCards';

interface DocumentsTabProps {
  employee: Employee;
}

interface Document {
  id: string;
  title: string;
  type: string;
  uploadDate: string;
  size: string;
  status: string;
}

/**
 * Documents Tab Component
 * Displays documents related to the employee
 */
const DocumentsTab: React.FC<DocumentsTabProps> = ({ employee }) => {
  const { t } = useTranslation('lowcoder');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, this would fetch documents from an API
    // For now, we'll simulate with a timeout and mock data
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data for demonstration
        const mockDocuments: Document[] = [
          {
            id: '1',
            title: 'Employment Contract',
            type: 'PDF',
            uploadDate: dayjs().subtract(2, 'month').format('YYYY-MM-DD'),
            size: '2.4 MB',
            status: 'Approved'
          },
          {
            id: '2',
            title: 'ID Card',
            type: 'JPG',
            uploadDate: dayjs().subtract(2, 'month').format('YYYY-MM-DD'),
            size: '1.2 MB',
            status: 'Approved'
          },
          {
            id: '3',
            title: 'Tax Declaration',
            type: 'PDF',
            uploadDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
            size: '3.1 MB',
            status: 'Pending'
          }
        ];
        
        setDocuments(mockDocuments);
      } catch (err) {
        setError('Failed to load documents');
        console.error('Error fetching documents:', err);
      } finally {
        setLoading(false);
      }
    };

    if (employee?.id) {
      fetchDocuments();
    } else {
      setLoading(false);
      setDocuments([]);
    }
  }, [employee?.id]);

  // Function to render document cards
  const renderDocumentCard = (document: Document) => {
    return (
      <Card key={document.id} className="p-4 h-full flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-grow">
            <h3 className="text-lg font-medium">{document.title}</h3>
            <p className="text-sm text-gray-500">{document.type}</p>
          </div>
          <div className="flex-shrink-0">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              document.status === 'Approved' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {document.status}
            </span>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>{t('employee_profile.document_layout.document_table.upload_date')}</span>
            <span>{dayjs(document.uploadDate).format('MMM D, YYYY')}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>{t('employee_profile.document_layout.document_table.document_type')}</span>
            <span>{document.size}</span>
          </div>
        </div>
        
        <div className="mt-auto pt-4">
          <button 
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={() => {
              // In a real implementation, this would download the document
              alert(`Downloading ${document.title}`);
            }}
          >
            {t('employee_profile.document_layout.document_table.download_document')}
          </button>
        </div>
      </Card>
    );
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        <p>{error}</p>
      </div>
    );
  }

  // Handle empty state
  if (documents.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>{t('employee_profile.document_layout.document_table.document_not_found')}</p>
      </div>
    );
  }

  return (
    <div className="documents-tab">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium">
          {t('employee_profile.document_layout.title')}
        </h2>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          onClick={() => {
            // Trigger flow to upload a document
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(
                new CustomEvent('com.newwork.process.start', {
                  detail: {
                    domain: 'employee',
                    processName: 'uploadEmployeeDocument',
                    startProcessBody: {
                      employeeId: employee.id
                    }
                  }
                })
              );
            }
          }}
        >
          {t('employee_profile.employee_tabs.flows_button.upload_document')}
        </button>
      </div>
      
      <DataCards
        data={documents}
        renderItem={renderDocumentCard}
        columnMinWidth={300}
        gap={16}
        loading={loading}
        error={error}
        emptyMessage={t('employee_profile.document_layout.document_table.document_not_found')}
      />
    </div>
  );
};

export default DocumentsTab;
