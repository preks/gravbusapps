import React, { useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Select, 
  DatePicker, 
  InputNumber, 
  Switch, 
  Space, 
  Typography, 
  Divider 
} from 'antd';
import { PlayCircleOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { QueryDefinition, QueryExecutionParams, ParameterType } from '@/common/network/dataset';

const { Title, Text } = Typography;
const { Option } = Select;

interface QueryExecutionFormProps {
  query: QueryDefinition | null;
  visible: boolean;
  onExecute: (parameters: QueryExecutionParams) => void;
  onCancel: () => void;
  isExecuting: boolean;
}

export const QueryExecutionForm: React.FC<QueryExecutionFormProps> = ({
  query,
  visible,
  onExecute,
  onCancel,
  isExecuting
}) => {
  const [form] = Form.useForm();

  const handleExecute = () => {
    form.validateFields().then((values) => {
      // Convert form values to proper types
      const processedParams: QueryExecutionParams = {};
      
      Object.entries(values).forEach(([key, value]) => {
        const param = query?.parameters.find(p => p.name === key);
        if (param && value !== undefined && value !== null && value !== '') {
          if (param.type === ParameterType.DATE && dayjs.isDayjs(value)) {
            processedParams[key] = value.format('YYYY-MM-DD');
          } else if (param.type === ParameterType.DATE_TIME && dayjs.isDayjs(value)) {
            processedParams[key] = value.format('YYYY-MM-DDTHH:mm:ss');
          } else if (param.type === ParameterType.LIST_STRING && typeof value === 'string') {
            processedParams[key] = value;
          } else {
            processedParams[key] = String(value);
          }
        }
      });

      onExecute(processedParams);
    });
  };

  const renderParameterInput = (param: any) => {
    const commonProps = {
      placeholder: param.description,
      'data-testid': `parameter-input-${param.name}`
    };

    switch (param.type) {
      case ParameterType.STRING:
        return <Input {...commonProps} />;
      
      case ParameterType.NUMBER:
        return <InputNumber {...commonProps} className="gba:w-full" />;
      
      case ParameterType.DATE:
        return (
          <DatePicker 
            {...commonProps} 
            className="gba:w-full"
            format="YYYY-MM-DD"
          />
        );
      
      case ParameterType.DATE_TIME:
        return (
          <DatePicker 
            {...commonProps} 
            showTime 
            className="gba:w-full"
            format="YYYY-MM-DD HH:mm:ss"
          />
        );
      
      case ParameterType.BOOLEAN:
        return <Switch {...commonProps} />;
      
      case ParameterType.CONTROL:
        return (
          <Select {...commonProps} className="gba:w-full">
            {param.allowedValues?.map((value: string) => (
              <Option key={value} value={value}>
                {value}
              </Option>
            ))}
          </Select>
        );
      
      case ParameterType.LIST_STRING:
        return (
          <Input 
            {...commonProps} 
            placeholder={`${param.description} (comma-separated)`}
          />
        );
      
      default:
        return <Input {...commonProps} />;
    }
  };

  const getInitialValue = (param: any) => {
    if (param.defaultValue) {
      if (param.type === ParameterType.DATE || param.type === ParameterType.DATE_TIME) {
        return dayjs(param.defaultValue);
      }
      if (param.type === ParameterType.BOOLEAN) {
        return param.defaultValue === 'true';
      }
      if (param.type === ParameterType.NUMBER) {
        return Number(param.defaultValue);
      }
      return param.defaultValue;
    }
    return undefined;
  };

  return (
    <Modal
      title={
        <Space>
          <PlayCircleOutlined />
          <span>Execute Query: {query?.name}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={null}
      data-testid="query-execution-modal"
    >
      {query && (
        <div className="gba:space-y-4">
          <div>
            <Text className="gba:text-gray-600">{query.description}</Text>
          </div>

          <Divider />

          <Form
            form={form}
            layout="vertical"
            data-testid="query-execution-form"
          >
            {query.parameters.map((param) => (
              <Form.Item
                key={param.name}
                name={param.name}
                label={
                  <Space>
                    <Text strong>{param.name}</Text>
                    {param.required && <Text className="gba:text-red-500">*</Text>}
                    <Text className="gba:text-xs gba:text-gray-500">({param.type})</Text>
                  </Space>
                }
                rules={[
                  {
                    required: param.required,
                    message: `${param.name} is required`
                  }
                ]}
                initialValue={getInitialValue(param)}
              >
                {renderParameterInput(param)}
              </Form.Item>
            ))}

            <div className="gba:flex gba:justify-end gba:space-x-2 gba:mt-6">
              <Button 
                onClick={onCancel}
                icon={<CloseOutlined />}
                data-testid="cancel-execution-button"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={handleExecute}
                loading={isExecuting}
                icon={<PlayCircleOutlined />}
                data-testid="execute-query-button"
              >
                Execute Query
              </Button>
            </div>
          </Form>
        </div>
      )}
    </Modal>
  );
}; 