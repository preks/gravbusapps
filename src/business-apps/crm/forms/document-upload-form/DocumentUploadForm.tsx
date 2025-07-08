import React, { useState, useEffect } from 'react';
import { Button, Form, Input, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFileClient } from '@/common/network/files/useFileClient';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';

export interface DocumentUploadFormProps extends BusinessAppContextProps {}

const { TextArea } = Input;

const initialValues = {
  name: '',
  description: '',
  file: null,
};

export const DocumentUploadForm: React.FC<DocumentUploadFormProps> = (props) => {
  const { accessToken, additionalData } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const fileClient = useFileClient({ accessToken } as any);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));

  useEffect(() => {
    const handler = async (event: any) => {
      try {
        const response = event.detail?.response;
        const crmDocument = response?.crmDocument;
        if (!crmDocument) return;
        
        // Only handle once
        window.removeEventListener('com.newwork.process.taskCompletion', handler as EventListener);
        
        // File upload
        const uploadFile = fileList && fileList[0];
        if (!uploadFile || !uploadFile.originFileObj) {
          message.error('No file selected for upload');
          return;
        }
        
        const file = uploadFile.originFileObj;
        const pathParams = { accessScope: 'public' };
        const queryParams = {
          appName: 'crm',
          folderPath: `/leads/${additionalData?.leadId}/documents`,
        };
        
        const uploadResponse = await fileClient.uploadFile(
          file,
          pathParams,
          queryParams
        );
        
        // Update the document with the uploaded file
        const updatePayload = {
          crmDocument: {
            ...crmDocument,
            file: uploadResponse.fileInfo.fileId,
            fileSize: file.size,
            mimeType: file.type,
            verified: true,
            verificationDate: new Date().toISOString(),
          },
          changeMode: 'UPDATE',
        };
        
        await restClient.post('/customer-relations/saveCrmDocument', updatePayload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        message.success('Document uploaded and saved successfully');
        
        // Notify parent of successful upload
        if (window.parent !== window) {
          window.parent.postMessage({ 
            type: 'CRM_DOCUMENT_UPLOADED', 
            leadId: additionalData?.leadId,
            document: crmDocument 
          }, '*');
        }
        
        // Close the form window
        setTimeout(() => {
          if (window.parent !== window) {
            window.parent.focus();
          }
        }, 1000);
        
      } catch (err: any) {
        console.error('File upload error:', err);
        message.error(err?.message || 'Failed to upload and save document');
      }
    };
    
    window.addEventListener('com.newwork.process.taskCompletion', handler as EventListener);
    
    return () => {
      // Remove only if event was handled, not on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, additionalData?.leadId, fileClient, fileList, restClient]);

  const handleSubmit = async (values: any) => {
    if (!fileList.length || !fileList[0]?.originFileObj) {
      message.error('Please select a file to upload');
      return;
    }

    setLoading(true);
    
    const payload = {
      changeMode: 'INSERT',
      crmDocument: {
        name: values.name || fileList[0].originFileObj.name,
        description: values.description || '',
        lead: additionalData?.leadId,
        version: 0,
        // File will be attached after process completion
        file: null,
        fileSize: 0,
        mimeType: '',
        verified: false,
        verificationDate: null,
      },
    };
    
    dispatchProcessContinueEvent('pse_submit', payload);
    setLoading(false);
  };

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {});
  };

  const handleFileChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
    
    // Auto-fill name from file name if not already set
    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      const fileName = newFileList[0].originFileObj.name;
      if (!form.getFieldValue('name')) {
        form.setFieldValue('name', fileName);
      }
    }
  };

  const beforeUpload = (file: File) => {
    // Prevent automatic upload, we'll handle it manually
    return false;
  };

  return (
    <div className="gba:p-6 gba:bg-white gba:rounded-lg gba:shadow-md" data-testid="document-upload-form-container">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        data-testid="document-upload-form"
      >
        <h2 className="gba:text-xl gba:!font-bold gba:mb-4 gba:text-center gba:!text-[20px]" data-testid="form-title">
          {getTranslationFromI18nKeyAndLabel('crm:documents.uploadDocument', 'Upload Document')}
        </h2>
        
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:documents.file', 'File')}
          name="file"
          rules={[{ required: true, message: getTranslationFromI18nKeyAndLabel('crm:documents.fileRequired', 'Please select a file') }]}
        >
          <Upload
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={beforeUpload}
            maxCount={1}
            data-testid="file-upload"
          >
            <Button icon={<UploadOutlined />}>
              {getTranslationFromI18nKeyAndLabel('crm:documents.selectFile', 'Select File')}
            </Button>
          </Upload>
        </Form.Item>

        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:documents.name', 'Document Name')}
          name="name"
          rules={[{ required: true, message: getTranslationFromI18nKeyAndLabel('crm:documents.nameRequired', 'Document name is required') }]}
        >
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel('crm:documents.namePlaceholder', 'Enter document name...')}
            data-testid="name-input"
            className="gba:w-full"
            maxLength={255}
          />
        </Form.Item>

        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:documents.description', 'Description (Optional)')}
          name="description"
        >
          <TextArea
            rows={3}
            placeholder={getTranslationFromI18nKeyAndLabel('crm:documents.descriptionPlaceholder', 'Enter document description...')}
            data-testid="description-textarea"
            className="gba:w-full"
            maxLength={500}
          />
        </Form.Item>

        <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-6">
          <Button
            onClick={handleCancel}
            data-testid="cancel-button"
            disabled={loading}
          >
            {getTranslationFromI18nKeyAndLabel('common:cancel', 'Cancel')}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            data-testid="submit-button"
          >
            {getTranslationFromI18nKeyAndLabel('crm:documents.uploadDocument', 'Upload Document')}
          </Button>
        </div>
      </Form>
    </div>
  );
}; 