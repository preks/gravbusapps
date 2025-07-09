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

// Hook for fetching activity types
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

  // Fetch dynamic catalog entries
  const { data: typeOptions, loading: typeLoading } = useSalesActivityTypes(accessToken, { search: typeSearch });

  useEffect(() => {
    const handler = async (event: any) => {
      try {
        const response = event.detail?.response;
        const salesActivity = response?.salesActivity;
        if (!salesActivity) return;
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
          folderPath: `/sales-activities/${salesActivity.id}/documents`,
        };
        const uploadResponse = await fileClient.uploadFile(
          file,
          pathParams,
          queryParams
        );
        // POST to saveCrmDocument
        const crmDocumentPayload = {
          crmDocument: {
            name: file.name,
            description: `File for ${salesActivity.title}`,
            file: uploadResponse.fileInfo.fileId,
            fileSize: file.size,
            mimeType: file.type,
            verified: true,
            verificationDate: Date.now(),
            ...(additionalData?.leadId && { lead: additionalData.leadId }),
            ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
            version: 0,
          },
          changeMode: 'INSERT',
        };
        await restClient.post('/customer-relations/saveCrmDocument', crmDocumentPayload, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        message.success('Document uploaded and saved successfully');
      } catch (err: any) {
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
    setLoading(true);
    const payload = {
      changeMode: 'INSERT',
      salesActivity: {
        version: 0,
        activityTypeRef: values.activityTypeRef,
        title: values.title,
        date: values.date ? dayjs(values.date).toISOString() : null,
        ...(additionalData?.leadId && { lead: additionalData.leadId }),
        ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
        description: values.description || '',
        ownerEmployee: additionalData?.employeeId
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
  };

  // Memoize dropdown options for performance
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
            beforeUpload={() => false}
            multiple
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