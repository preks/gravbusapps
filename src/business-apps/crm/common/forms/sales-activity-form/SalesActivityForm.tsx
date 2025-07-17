import React, { useState, useMemo, useEffect } from 'react';
import { Button, Form, Input, Select, DatePicker, Upload, Spin, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';
import { useFileClient } from '@/common/network/files/useFileClient';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';

export interface SalesActivityFormProps extends BusinessAppContextProps {}

const { TextArea } = Input;

const initialValues = {
  activityTypeRef: '',
  title: '',
  date: null,
  description: '',
  files: [],
};

const SALES_ACTIVITY_TYPE_CATALOG = 'SalesActivityType';
const SALES_ACTIVITY_TYPE_VERSION = 'v1';

const useSalesActivityTypes = (accessToken: string, params?: { search?: string }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const catalogClient = useCatalogManagerClient(accessToken);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    catalogClient.getCatalogEntriesList(
      {
        catalogIdentifier: SALES_ACTIVITY_TYPE_CATALOG,
        version: SALES_ACTIVITY_TYPE_VERSION,
      },
      {
        limit: 100,
        offset: 0,
        returnTotalRecords: true,
        includeChildCatalogEntries: true,
        ...(params?.search && { searchCriteria: params.search }),
      }
    )
      .then((response: any) => {
        if (isMounted) setData(response?.data || []);
      })
      .catch((err: any) => {
        if (isMounted) setError(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [accessToken, params?.search]);

  return { data, loading, error };
};

export const SalesActivityForm: React.FC<SalesActivityFormProps> = (props) => {
  const { accessToken, additionalData } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [typeSearch, setTypeSearch] = useState('');
  const fileClient = useFileClient({ accessToken } as any);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));

  const { data: typeOptions, loading: typeLoading } = useSalesActivityTypes(accessToken, { search: typeSearch });

  const [uploadProcessed, setUploadProcessed] = useState(false);

  useEffect(() => {
    const handler = async (event: any) => {
      try {
        console.log('SalesActivityForm: Process completion event received:', event.type);
        console.log('SalesActivityForm: Upload already processed:', uploadProcessed);
        
        // Prevent multiple executions
        if (uploadProcessed) {
          console.log('SalesActivityForm: Upload already processed, skipping');
          return;
        }
        
        // Check for successful completion with different response structures
        let salesActivity = null;
        const response = event.detail?.response;
        
        // Try different ways to get the salesActivity
        if (response?.salesActivity) {
          salesActivity = response.salesActivity;
          console.log('SalesActivityForm: Found salesActivity in response.salesActivity');
        } else if (event.detail?.salesActivity) {
          salesActivity = event.detail.salesActivity;
          console.log('SalesActivityForm: Found salesActivity in event.detail.salesActivity');
        } else if (event.detail?.resolution === 'success') {
          // If we have success but no salesActivity, try to proceed anyway with a mock ID
          console.log('SalesActivityForm: Process successful but no salesActivity found, checking for files anyway');
          salesActivity = { id: 'temp-id', title: 'Activity' }; // temporary for file upload
        }
        
        if (!salesActivity) {
          console.log('SalesActivityForm: No salesActivity found in any response format, skipping file upload');
          return;
        }
        
        // Mark as processed to prevent duplicate uploads
        setUploadProcessed(true);
        
        // Check if we need to upload a file
        const hasFileToUpload = fileList && fileList.length > 0 && fileList[0]?.originFileObj;
        
        if (hasFileToUpload) {
          console.log('SalesActivityForm: Starting file upload process...');
          try {
            const file = fileList[0].originFileObj;
            const pathParams = { accessScope: 'public' };
            
            // Use entity folder path for consistency with document-upload-form
            const entityType = additionalData?.leadId ? 'leads' : additionalData?.opportunityId ? 'opportunities' : additionalData?.contactId ? 'contacts' : 'accounts';
            const entityId = additionalData?.leadId || additionalData?.opportunityId || additionalData?.contactId || additionalData?.accountId;
            
            const queryParams = {
              appName: 'crm',
              folderPath: `/${entityType}/${entityId}/documents`,
            };
            
            const uploadResponse = await fileClient.uploadFile(
              file,
              pathParams,
              queryParams
            );
            
            const crmDocumentPayload = {
              employeeId: additionalData?.employeeId,
              managerId: additionalData?.managerId,
              structureId: additionalData?.structureId,
              locationId: additionalData?.locationId,
              organizationalUnitId: additionalData?.organizationalUnitId,
              ...(additionalData?.contactId && { contactId: additionalData.contactId }),
              changeMode: 'INSERT',
              crmDocument: {
                name: file.name,
                description: `Document for activity: ${salesActivity.title}`,
                file: uploadResponse.fileInfo.fileId,
                fileSize: file.size,
                mimeType: file.type,
                verified: true,
                verificationDate: new Date().toISOString(),
                ...(additionalData?.leadId && { lead: additionalData.leadId }),
                ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
                ...(additionalData?.contactId && { contact: additionalData.contactId }),
                ...(additionalData?.accountId && { account: additionalData.accountId }),
                version: 0,
              },
            };
            
            await restClient.post('/customer-relations/saveCrmDocument', crmDocumentPayload, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            
            // Send postMessage to parent window for document refresh
            if (window.parent !== window) {
              window.parent.postMessage({ 
                type: 'CRM_DOCUMENT_UPLOADED', 
                leadId: additionalData?.leadId,
                opportunityId: additionalData?.opportunityId,
                contactId: additionalData?.contactId,
                accountId: additionalData?.accountId,
                document: crmDocumentPayload.crmDocument 
              }, '*');
            }
            
            // Complete the process only after both activity and document are saved
            message.success('Activity and document created successfully');
            setLoading(false);
            console.log('SalesActivityForm: Process completed successfully with file upload');
            
          } catch (uploadErr: any) {
            console.error('Error uploading document:', uploadErr);
            message.error(`Failed to upload document: ${uploadErr?.message || 'Unknown error'}`);
            setLoading(false);
          }
        } else {
          // No file to upload, complete the process immediately
          message.success('Activity created successfully');
          setLoading(false);
          console.log('SalesActivityForm: Process completed successfully without file upload');
        }
      } catch (err: any) {
        console.error('Error in process completion:', err);
        message.error(err?.message || 'Failed to create activity');
        setLoading(false);
      }
    };
    
    // Listen to multiple possible event names like ActivityTimeline does
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ];

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handler as EventListener);
    });
    
    console.log('SalesActivityForm: Added event listeners for process completion');
    
    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handler as EventListener);
      });
    };
      }, [accessToken, additionalData?.leadId, fileClient, fileList, restClient, uploadProcessed]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    setUploadProcessed(false); // Reset upload flag for new submission
    
    try {
      const payload = {
        employeeId: additionalData?.employeeId,
        managerId: additionalData?.managerId,
        structureId: additionalData?.structureId,
        locationId: additionalData?.locationId,
        organizationalUnitId: additionalData?.organizationalUnitId,
        ...(additionalData?.contactId && { contactId: additionalData.contactId }),
        changeMode: 'INSERT',
        salesActivity: {
          version: 0,
          activityTypeRef: values.activityTypeRef,
          title: values.title,
          date: values.date ? dayjs(values.date).toISOString() : null,
          ...(additionalData?.leadId && { lead: additionalData.leadId }),
          ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
          ...(additionalData?.contactId && { contact: additionalData.contactId }),
          ...(additionalData?.accountId && { account: additionalData.accountId }),
          description: values.description || '',
          ownerEmployee: additionalData?.employeeId
        },
      };
      
      dispatchProcessContinueEvent('pse_submit', payload);
    } catch (error) {
      console.error('Error submitting activity:', error);
      message.error('Failed to submit activity');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {});
  };

  const handleFileChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList);
  };

  const beforeUpload = (file: File) => {
    // Prevent automatic upload - we handle it manually
    return false;
  };

  const mappedTypeOptions = useMemo(() =>
    (typeOptions || []).map((entry: any) => ({
      value: entry.id,
      label: entry.value,
    })), [typeOptions]
  );

  return (
    <div className="gba:p-6 gba:bg-white gba:rounded-lg gba:shadow-md" data-testid="sales-activity-form-container">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        data-testid="sales-activity-form"
      >
        <h2 className="gba:text-xl gba:!font-bold gba:mb-4 gba:text-center gba:!text-[20px]" data-testid="form-title">
          {getTranslationFromI18nKeyAndLabel('crm:salesActivity.newActivity', 'New Activity')}
        </h2>
        <div className="gba:mb-4 gba:font-semibold" data-testid="core-details-label">
          {getTranslationFromI18nKeyAndLabel('crm:salesActivity.coreDetails', 'Core Details')}
        </div>
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:salesActivity.title', 'Name')}
          name="title"
          rules={[{ required: true, message: getTranslationFromI18nKeyAndLabel('crm:salesActivity.titleRequired', 'Name is required') }]}
        >
          <Input data-testid="name-input" className="gba:w-full" maxLength={100} />
        </Form.Item>
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:salesActivity.type', 'Type')}
          name="activityTypeRef"
          rules={[{ required: true, message: getTranslationFromI18nKeyAndLabel('crm:salesActivity.typeRequired', 'Type is required') }]}
        >
          <Select
            data-testid="type-select"
            className="gba:w-full"
            showSearch
            filterOption={false}
            notFoundContent={typeLoading ? <Spin size="small" /> : null}
            onSearch={setTypeSearch}
            optionLabelProp="label"
          >
            {mappedTypeOptions.map(opt => (
              <Select.Option key={opt.value} value={opt.value} label={opt.label}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:salesActivity.date', 'Date')}
          name="date"
          rules={[{ required: true, message: getTranslationFromI18nKeyAndLabel('crm:salesActivity.dateRequired', 'Date is required') }]}
        >
          <DatePicker data-testid="date-input" className="gba:w-full" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:salesActivity.description', 'Description')}
          name="description"
          rules={[{ required: true, message: getTranslationFromI18nKeyAndLabel('crm:salesActivity.descriptionRequired', 'Description is required') }]}
        >
          <Input.TextArea
            data-testid="description-input"
            className="gba:w-full"
            rows={4}
            maxLength={500}
            placeholder={getTranslationFromI18nKeyAndLabel('crm:salesActivity.descriptionPlaceholder', 'Enter activity description...')}
          />
        </Form.Item>
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:salesActivity.uploadFile', 'Upload File')}
          name="files"
        >
          <Upload.Dragger
            data-testid="file-upload"
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={beforeUpload}
            maxCount={1}
            className="gba:w-full"
          >
            <p className="gba:mb-2">
              <UploadOutlined />
            </p>
            <p>{getTranslationFromI18nKeyAndLabel('crm:salesActivity.uploadFileButton', 'Click or drag file to upload')}</p>
          </Upload.Dragger>
        </Form.Item>
        <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-4">
          <Button
            data-testid="cancel-button"
            onClick={handleCancel}
            className="gba:bg-gray-200 gba:text-gray-800"
            disabled={loading}
          >
            {getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
          </Button>
          <Button
            data-testid="submit-button"
            type="primary"
            htmlType="submit"
            loading={loading}
            className="gba:bg-blue-600 gba:text-white"
          >
            {getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default SalesActivityForm; 