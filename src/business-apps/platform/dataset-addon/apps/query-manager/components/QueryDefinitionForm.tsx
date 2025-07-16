import React, { useEffect, useState, useMemo } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Select, 
  Space, 
  Typography, 
  Divider,
  Card,
  Row,
  Col,
  Tag,
  Tooltip,
  Switch,
  Alert,
  message
} from 'antd';
import { 
  SaveOutlined, 
  CloseOutlined, 
  PlusOutlined, 
  DeleteOutlined,
  InfoCircleOutlined,
  EditOutlined,
  FormOutlined,
  FormatPainterOutlined
} from '@ant-design/icons';
import { 
  QueryDefinition, 
  QueryType, 
  QueryStatus, 
  ParameterType, 
  QueryParameter,
  AdditionalColumn
} from '@/common/network/dataset';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Simple SQL formatter function
const formatSQL = (sql: string): string => {
  if (!sql || typeof sql !== 'string') return '';
  
  // Basic SQL formatting rules
  return sql
    // Add line breaks before major keywords
    .replace(/\b(SELECT|FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|WHERE|GROUP BY|HAVING|ORDER BY|UNION|LIMIT|OFFSET)\b/gi, '\n$1')
    // Add line breaks before AND/OR in WHERE clauses
    .replace(/\b(AND|OR)\b(?![^(]*\))/gi, '\n  $1')
    // Indent subparts
    .replace(/\n(FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|WHERE|GROUP BY|HAVING|ORDER BY)/gi, '\n$1')
    .replace(/\n(AND|OR)/gi, '\n  $1')
    // Clean up multiple line breaks
    .replace(/\n\s*\n/g, '\n')
    // Trim and ensure proper spacing
    .trim()
    // Add proper indentation for common patterns
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim();
      if (trimmed.match(/^(AND|OR)/i)) {
        return '  ' + trimmed;
      }
      if (trimmed.match(/^(SELECT|FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|WHERE|GROUP BY|HAVING|ORDER BY|UNION|LIMIT|OFFSET)/i)) {
        return trimmed;
      }
      if (index > 0 && trimmed) {
        return '  ' + trimmed;
      }
      return trimmed;
    })
    .join('\n');
};

interface QueryDefinitionFormProps {
  query: QueryDefinition | null;
  visible: boolean;
  onSave: (query: Omit<QueryDefinition, 'id' | 'createdAt' | 'updatedAt'>, validate?: boolean) => void;
  onCancel: () => void;
  isLoading: boolean;
  defaultQueryType?: QueryType;
}

export const QueryDefinitionForm: React.FC<QueryDefinitionFormProps> = ({
  query,
  visible,
  onSave,
  onCancel,
  isLoading,
  defaultQueryType
}) => {
  const [form] = Form.useForm();
  const [parameters, setParameters] = useState<QueryParameter[]>([]);
  const [additionalColumns, setAdditionalColumns] = useState<AdditionalColumn[]>([]);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [jsonValue, setJsonValue] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [validateQuery, setValidateQuery] = useState(true);
  const [formValues, setFormValues] = useState<any>({});

  const isEditing = !!query;

  // Format SQL function for the current query
  const handleFormatSQL = () => {
    const currentQuery = form.getFieldValue('query');
    if (currentQuery) {
      const formattedSQL = formatSQL(currentQuery);
      form.setFieldValue('query', formattedSQL);
      setFormValues((prev: any) => ({ ...prev, query: formattedSQL }));
      message.success('SQL query formatted successfully');
    }
  };

  // Create the default JSON template
  const getDefaultJsonTemplate = () => {
    return {
      name: "",
      description: "",
      query: "SELECT * FROM your_table WHERE date >= :startDate",
      queryType: defaultQueryType || QueryType.DATASET,
      status: QueryStatus.DRAFT,
      parameters: [
        {
          name: "startDate",
          type: ParameterType.DATE,
          description: "Start date for filtering",
          required: true,
          defaultValue: undefined,
          allowedValues: undefined
        }
      ],
      additionalColumns: []
    };
  };

  // Convert form data to JSON object
  const formDataToJson = useMemo(() => {
    return {
      name: formValues.name || "",
      description: formValues.description || "",
      query: formValues.query || "",
      queryType: formValues.queryType || defaultQueryType || QueryType.DATASET,
      status: formValues.status || QueryStatus.DRAFT,
      parameters: parameters,
      additionalColumns: additionalColumns
    };
  }, [formValues, parameters, additionalColumns, defaultQueryType]);

  useEffect(() => {
    if (visible && query) {
      // Editing existing query
      const formattedQuery = query.query ? formatSQL(query.query) : '';
      form.setFieldsValue({
        name: query.name,
        description: query.description,
        query: formattedQuery,
        queryType: query.queryType,
        status: query.status
      });
      setParameters(query.parameters || []);
      setAdditionalColumns(query.additionalColumns || []);
      setFormValues({
        name: query.name,
        description: query.description,
        query: formattedQuery,
        queryType: query.queryType,
        status: query.status
      });
      setJsonValue(JSON.stringify({
        name: query.name,
        description: query.description,
        query: formattedQuery,
        queryType: query.queryType,
        status: query.status,
        parameters: query.parameters || [],
        additionalColumns: query.additionalColumns || []
      }, null, 2));
    } else if (visible) {
      // Creating new query
      const defaultTemplate = getDefaultJsonTemplate();
      form.resetFields();
              form.setFieldsValue({
          name: defaultTemplate.name,
          description: defaultTemplate.description,
          query: defaultTemplate.query,
          queryType: defaultTemplate.queryType,
          status: defaultTemplate.status
        });
        setFormValues({
          name: defaultTemplate.name,
          description: defaultTemplate.description,
          query: defaultTemplate.query,
          queryType: defaultTemplate.queryType,
          status: defaultTemplate.status
        });
        setParameters(defaultTemplate.parameters);
        setAdditionalColumns(defaultTemplate.additionalColumns);
        setJsonValue(JSON.stringify(defaultTemplate, null, 2));
    }
    setJsonError(null);
    setIsJsonMode(false);
  }, [visible, query, form, defaultQueryType]);

  // Update JSON when form data changes (only in form mode)
  useEffect(() => {
    if (!isJsonMode) {
      setJsonValue(JSON.stringify(formDataToJson, null, 2));
    }
  }, [formDataToJson, isJsonMode]);

  const handleModeSwitch = (checked: boolean) => {
    if (checked) {
      // Switching to JSON mode - update JSON with current form data (and format SQL)
      const currentFormData = { ...formDataToJson };
      if (currentFormData.query) {
        currentFormData.query = formatSQL(currentFormData.query);
      }
      setJsonValue(JSON.stringify(currentFormData, null, 2));
      setJsonError(null);
    } else {
            // Switching to form mode - validate and apply JSON data
      try {
        const parsedJson = JSON.parse(jsonValue);
        
        // Only validate JSON structure, not field values - let form validation handle empty fields
        if (typeof parsedJson !== 'object' || parsedJson === null) {
          throw new Error('JSON must be an object');
        }

        // Update form and state with whatever values exist (including empty strings)
        const formData = {
          name: parsedJson.name || '',
          description: parsedJson.description || '',
          query: parsedJson.query ? formatSQL(parsedJson.query) : '',
          queryType: parsedJson.queryType || QueryType.DATASET,
          status: parsedJson.status || QueryStatus.DRAFT
        };
        form.setFieldsValue(formData);
        setFormValues(formData);
        setParameters(parsedJson.parameters || []);
        setAdditionalColumns(parsedJson.additionalColumns || []);
        setJsonError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
        setJsonError(errorMessage);
        message.error(`Cannot switch to form mode: ${errorMessage}`);
        return; // Don't switch mode if JSON is invalid
      }
    }
    setIsJsonMode(checked);
  };

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const handleSave = () => {
    if (isJsonMode) {
      // Save from JSON mode
      try {
        const parsedJson = JSON.parse(jsonValue);
        
        // Validate required fields
        if (!parsedJson.name || !parsedJson.description || !parsedJson.query) {
          message.error('Missing required fields: name, description, and query are required');
          return;
        }

                 const queryData: Omit<QueryDefinition, 'id' | 'createdAt' | 'updatedAt'> = {
           name: parsedJson.name,
           description: parsedJson.description,
           query: parsedJson.query,
           queryType: parsedJson.queryType || QueryType.DATASET,
           status: parsedJson.status || QueryStatus.DRAFT,
           parameters: parsedJson.parameters || [],
           additionalColumns: parsedJson.additionalColumns || []
         };
         onSave(queryData, validateQuery);
      } catch (error) {
        message.error('Invalid JSON format. Please fix the JSON before saving.');
        return;
      }
    } else {
      // Save from form mode
      form.validateFields().then((values) => {
        const queryData: Omit<QueryDefinition, 'id' | 'createdAt' | 'updatedAt'> = {
          ...values,
          parameters,
          additionalColumns
        };
        onSave(queryData, validateQuery);
      });
    }
  };

  const addParameter = () => {
    const newParam: QueryParameter = {
      name: '',
      type: ParameterType.STRING,
      description: '',
      required: false,
      allowedValues: null
    };
    setParameters([...parameters, newParam]);
  };

  const updateParameter = (index: number, field: keyof QueryParameter, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const addAdditionalColumn = () => {
    const newColumn: AdditionalColumn = {
      name: '',
      type: 'STRING'
    };
    setAdditionalColumns([...additionalColumns, newColumn]);
  };

  const updateAdditionalColumn = (index: number, field: keyof AdditionalColumn, value: string) => {
    const updated = [...additionalColumns];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalColumns(updated);
  };

  const removeAdditionalColumn = (index: number) => {
    setAdditionalColumns(additionalColumns.filter((_, i) => i !== index));
  };

  return (
    <Modal
      title={
        <Space>
          <SaveOutlined />
          <span>{isEditing ? 'Edit Query Definition' : 'Create New Query Definition'}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={null}
      data-testid="query-definition-modal"
    >
      <div className="gba:space-y-6">
        {/* Mode Toggle */}
        <Card size="small">
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Text strong>Editing Mode:</Text>
                <Tag color={isJsonMode ? "orange" : "blue"} icon={isJsonMode ? <EditOutlined /> : <FormOutlined />}>
                  {isJsonMode ? "JSON Editor" : "Form Fields"}
                </Tag>
              </Space>
            </Col>
            <Col>
              <Space>
                <FormOutlined />
                <Switch
                  checked={isJsonMode}
                  onChange={handleModeSwitch}
                  data-testid="mode-toggle-switch"
                />
                <EditOutlined />
              </Space>
            </Col>
          </Row>
          
          <Divider style={{ margin: '12px 0' }} />
          
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Text strong>Validation:</Text>
                <Tag color={validateQuery ? "green" : "orange"}>
                  {validateQuery ? "Enabled" : "Disabled"}
                </Tag>
                <Tooltip title="When enabled, the SQL query will be validated on the server before saving">
                  <InfoCircleOutlined />
                </Tooltip>
              </Space>
            </Col>
            <Col>
              <Space>
                <Text type="secondary">Off</Text>
                <Switch
                  checked={validateQuery}
                  onChange={setValidateQuery}
                  data-testid="validation-toggle-switch"
                />
                <Text type="secondary">On</Text>
              </Space>
            </Col>
          </Row>
          
          {isJsonMode && (
            <div className="gba:mt-3">
              <Text type="secondary">
                Edit the complete query definition as JSON. Use this mode for quick generation and bulk modifications.
              </Text>
            </div>
          )}
        </Card>

        {isJsonMode ? (
          /* JSON Mode */
          <div className="gba:space-y-4">
            {jsonError && (
              <Alert
                message="JSON Validation Error"
                description={jsonError}
                type="error"
                showIcon
              />
            )}
            <Card title="JSON Editor" size="small">
              <TextArea
                value={jsonValue}
                onChange={(e) => handleJsonChange(e.target.value)}
                rows={20}
                style={{ 
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '13px'
                }}
                placeholder="Enter query definition JSON..."
                data-testid="json-editor-textarea"
              />
            </Card>
            <Card size="small">
              <Text type="secondary">
                <strong>Required fields:</strong> name, description, query<br/>
                <strong>Optional fields:</strong> queryType (DATASET|TIMESERIES), status (DRAFT|ACTIVE), parameters, additionalColumns
              </Text>
            </Card>
          </div>
        ) : (
          /* Form Mode */
          <>
            <Form
              form={form}
              layout="vertical"
              onValuesChange={(_, allValues) => setFormValues(allValues)}
              data-testid="query-definition-form"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="Query Name"
                    rules={[
                      { required: true, message: 'Query name is required' },
                      { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: 'Name must start with letter and contain only letters, numbers, and underscores' }
                    ]}
                  >
                    <Input placeholder="Enter unique query name" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="queryType"
                    label="Query Type"
                    rules={[{ required: true, message: 'Query type is required' }]}
                  >
                    <Select placeholder="Select type">
                      <Option value={QueryType.DATASET}>Dataset</Option>
                      <Option value={QueryType.TIMESERIES}>Timeseries</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true, message: 'Status is required' }]}
                  >
                    <Select placeholder="Select status">
                      <Option value={QueryStatus.DRAFT}>Draft</Option>
                      <Option value={QueryStatus.ACTIVE}>Active</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="description"
                label="Description"
                rules={[{ required: true, message: 'Description is required' }]}
              >
                <TextArea
                  rows={2}
                  placeholder="Describe what this query does..."
                />
              </Form.Item>

              <Form.Item
                name="query"
                label={
                  <div className="gba:flex gba:justify-between gba:items-center gba:w-full">
                    <Space>
                      <span>SQL Query</span>
                      <Tooltip title="Use :paramName for bound parameters and ${paramName} for template variables">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                    <Button
                      type="text"
                      size="small"
                      icon={<FormatPainterOutlined />}
                      onClick={handleFormatSQL}
                      className="gba:text-blue-600 hover:gba:text-blue-800"
                    >
                      Format SQL
                    </Button>
                  </div>
                }
                rules={[{ required: true, message: 'SQL query is required' }]}
              >
                <TextArea
                  rows={8}
                  placeholder="SELECT category, value FROM dataset WHERE date >= :startDate..."
                  style={{ 
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "Courier New", monospace',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    backgroundColor: '#fafafa',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                  className="gba:resize-y"
                />
              </Form.Item>
            </Form>

            <Divider />

            {/* Parameters Section */}
            <Card 
              title="Parameters" 
              size="small"
              extra={
                <Button 
                  type="dashed" 
                  icon={<PlusOutlined />} 
                  onClick={addParameter}
                  data-testid="add-parameter-button"
                >
                  Add Parameter
                </Button>
              }
            >
              {parameters.length === 0 ? (
                <Text type="secondary">No parameters defined</Text>
              ) : (
                <div className="gba:space-y-3">
                  {parameters.map((param, index) => (
                    <Card key={index} size="small" className="gba:bg-gray-50">
                      <Row gutter={8} align="middle">
                        <Col span={4}>
                          <Input
                            placeholder="Name"
                            value={param.name}
                            onChange={(e) => updateParameter(index, 'name', e.target.value)}
                            data-testid={`param-name-${index}`}
                          />
                        </Col>
                        <Col span={3}>
                          <Select
                            placeholder="Type"
                            value={param.type}
                            onChange={(value) => updateParameter(index, 'type', value)}
                            style={{ width: '100%' }}
                            data-testid={`param-type-${index}`}
                          >
                            {Object.values(ParameterType).map(type => (
                              <Option key={type} value={type}>{type}</Option>
                            ))}
                          </Select>
                        </Col>
                        <Col span={6}>
                          <Input
                            placeholder="Description"
                            value={param.description}
                            onChange={(e) => updateParameter(index, 'description', e.target.value)}
                            data-testid={`param-description-${index}`}
                          />
                        </Col>
                        <Col span={3}>
                          <Input
                            placeholder="Default"
                            value={param.defaultValue || ''}
                            onChange={(e) => updateParameter(index, 'defaultValue', e.target.value)}
                            data-testid={`param-default-${index}`}
                          />
                        </Col>
                        <Col span={4}>
                          <Input
                            placeholder="Allowed values (comma-separated)"
                            value={param.allowedValues?.join(',') || ''}
                            onChange={(e) => updateParameter(index, 'allowedValues', 
                              e.target.value ? e.target.value.split(',').map(v => v.trim()) : null
                            )}
                            data-testid={`param-allowed-${index}`}
                          />
                        </Col>
                        <Col span={2}>
                          <Space>
                            <Tag color={param.required ? 'red' : 'default'}>
                              {param.required ? 'Required' : 'Optional'}
                            </Tag>
                          </Space>
                        </Col>
                        <Col span={2}>
                          <Button
                            icon={<DeleteOutlined />}
                            size="small"
                            danger
                            onClick={() => removeParameter(index)}
                            data-testid={`remove-param-${index}`}
                          />
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            {/* Additional Columns Section */}
            <Card 
              title="Additional Columns" 
              size="small"
              extra={
                <Button 
                  type="dashed" 
                  icon={<PlusOutlined />} 
                  onClick={addAdditionalColumn}
                  data-testid="add-column-button"
                >
                  Add Column
                </Button>
              }
            >
              {additionalColumns.length === 0 ? (
                <Text type="secondary">No additional columns defined</Text>
              ) : (
                <div className="gba:space-y-3">
                  {additionalColumns.map((column, index) => (
                    <Row key={index} gutter={8} align="middle">
                      <Col span={10}>
                        <Input
                          placeholder="Column Name"
                          value={column.name}
                          onChange={(e) => updateAdditionalColumn(index, 'name', e.target.value)}
                          data-testid={`column-name-${index}`}
                        />
                      </Col>
                      <Col span={10}>
                        <Input
                          placeholder="Column Type"
                          value={column.type}
                          onChange={(e) => updateAdditionalColumn(index, 'type', e.target.value)}
                          data-testid={`column-type-${index}`}
                        />
                      </Col>
                      <Col span={4}>
                        <Button
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                          onClick={() => removeAdditionalColumn(index)}
                          data-testid={`remove-column-${index}`}
                        />
                      </Col>
                    </Row>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* Footer Actions */}
        <div className="gba:flex gba:justify-end gba:space-x-2 gba:pt-4">
          <Button 
            onClick={onCancel}
            icon={<CloseOutlined />}
            data-testid="cancel-form-button"
          >
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={isLoading}
            icon={<SaveOutlined />}
            disabled={isJsonMode && !!jsonError}
            data-testid="save-query-button"
          >
            {isEditing ? 'Update Query' : 'Create Query'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}; 