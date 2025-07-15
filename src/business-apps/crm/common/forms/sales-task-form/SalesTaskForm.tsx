import React, { useState, useMemo, useEffect } from 'react';
import { Button, Form, Input, Select, DatePicker, Upload, Spin, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';
import { useSalesTaskTypes } from './hooks/useSalesTaskTypes';
import { useSalesTaskPriorities } from './hooks/useSalesTaskPriorities';
import { useFileClient } from '@/common/network/files/useFileClient';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';

export interface SalesTaskFormProps extends BusinessAppContextProps {}

const { TextArea } = Input;

const initialValues = {
  taskTypeRef: '',
  title: '',
  priorityRef: '',
  deadline: null,
  description: '',
  lead: '',
  files: [],
};

export const SalesTaskForm: React.FC<SalesTaskFormProps> = (props) => {
  const { accessToken, additionalData } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [typeSearch, setTypeSearch] = useState('');
  const [prioritySearch, setPrioritySearch] = useState('');
  const fileClient = useFileClient({ accessToken } as any);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));

  const { data: typeOptions, loading: typeLoading } = useSalesTaskTypes(accessToken, { search: typeSearch });
  const { data: priorityOptions, loading: priorityLoading } = useSalesTaskPriorities(accessToken, { search: prioritySearch });

  useEffect(() => {
    const handler = async (event: any) => {
      try {
        const response = event.detail?.response;
        const salesTask = response?.salesTask;
        if (!salesTask) return;
        const uploadFile = fileList && fileList[0];
        if (!uploadFile || !uploadFile.originFileObj) {
          message.error('No file selected for upload');
          return;
        }
        const file = uploadFile.originFileObj;
        const pathParams = { accessScope: 'public' };
        const queryParams = {
          appName: 'crm',
          folderPath: `/sales-activities/${salesTask.id}/documents`,
        };
        const uploadResponse = await fileClient.uploadFile(
          file,
          pathParams,
          queryParams
        );
        const crmDocumentPayload = {
          crmDocument: {
            name: file.name,
            description: `File for ${salesTask.title}`,
            file: uploadResponse.fileInfo.fileId,
            fileSize: file.size,
            mimeType: file.type,
            verified: true,
            verificationDate: Date.now(),
            salesTask: salesTask.id,
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
      } finally {
        window.removeEventListener('com.newwork.process.taskCompletion', handler as EventListener);
      }
    };
    window.addEventListener('com.newwork.process.taskCompletion', handler as EventListener);
    return () => {
    };
  }, [accessToken, additionalData?.leadId, fileClient, fileList, restClient]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    const payload = {
      employeeId: additionalData?.employeeId,
      managerId: additionalData?.managerId,
      structureId: additionalData?.structureId,
      locationId: additionalData?.locationId,
      organizationalUnitId: additionalData?.organizationalUnitId,
      ...(additionalData?.contactId && { contactId: additionalData.contactId }),
      changeMode: 'INSERT',
      salesTask: {
        version: 0,
        typeRef: values.taskTypeRef,
        name: values.title,
        priorityRef: values.priorityRef,
        deadline: values.deadline ? dayjs(values.deadline).toISOString() : null,
        description: values.description,
        ...(additionalData?.leadId && { lead: additionalData.leadId }),
        ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
        ...(additionalData?.contactId && { contact: additionalData.contactId }),
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

  const mappedTypeOptions = useMemo(() =>
    (typeOptions || []).map((entry: any) => ({
      value: entry.id,
      label: entry.value,
    })), [typeOptions]
  );
  const mappedPriorityOptions = useMemo(() =>
    (priorityOptions || []).map((entry: any) => ({
      value: entry.id,
      label: entry.value,
    })), [priorityOptions]
  );

  return (
    <div className="gba:p-6 gba:bg-white gba:rounded-lg gba:shadow-md" data-testid="sales-task-form-container">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        data-testid="sales-task-form"
      >
        <h2 className="gba:text-xl gba:!font-bold gba:mb-4 gba:text-center gba:!text-[20px]" data-testid="form-title">
          {getTranslationFromI18nKeyAndLabel('crm:salesTask.newTask', 'New Task')}
        </h2>
        <div className="gba:mb-4 gba:font-semibold" data-testid="core-details-label">
          {getTranslationFromI18nKeyAndLabel('crm:salesTask.coreDetails', 'Core Details')}
        </div>
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:salesTask.title', 'Name')}
          name="title"
        >
          <Input 
            data-testid="name-input" 
            className="gba:w-full" 
            maxLength={100} 
            placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.titlePlaceholder', 'Enter task name')}
            allowClear
          />
        </Form.Item>
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:salesTask.type', 'Type')}
          name="taskTypeRef"
          rules={[{ required: true, message: getTranslationFromI18nKeyAndLabel('crm:salesTask.typeRequired', 'Type is required') }]}
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
          label={getTranslationFromI18nKeyAndLabel('crm:salesTask.priority', 'Priority')}
          name="priorityRef"
          rules={[{ required: true, message: getTranslationFromI18nKeyAndLabel('crm:salesTask.priorityRequired', 'Priority is required') }]}
        >
          <Select
            data-testid="priority-select"
            className="gba:w-full"
            showSearch
            filterOption={false}
            notFoundContent={priorityLoading ? <Spin size="small" /> : null}
            onSearch={setPrioritySearch}
            optionLabelProp="label"
          >
            {mappedPriorityOptions.map(opt => (
              <Select.Option key={opt.value} value={opt.value} label={opt.label}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:salesTask.deadline', 'Deadline')}
          name="deadline"
          rules={[{ required: true, message: getTranslationFromI18nKeyAndLabel('crm:salesTask.deadlineRequired', 'Deadline is required') }]}
        >
          <DatePicker data-testid="deadline-input" className="gba:w-full" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:salesTask.description', 'Description')}
          name="description"
        >
          <TextArea data-testid="description-input" className="gba:w-full" rows={4} maxLength={500} />
        </Form.Item>
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:salesTask.uploadFile', 'Upload File')}
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
            <p>{getTranslationFromI18nKeyAndLabel('crm:salesTask.uploadFileButton', 'Click or drag file to upload')}</p>
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

export default SalesTaskForm; 