import React from 'react';
import { Card, Button, Typography, Tag, Space, Tooltip } from 'antd';
import { PlayCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { QueryDefinition, QueryType } from '@/common/network/dataset';

const { Title, Text, Paragraph } = Typography;

interface QueryListProps {
  queries: QueryDefinition[];
  onExecuteQuery: (query: QueryDefinition) => void;
  isExecuting: boolean;
}

export const QueryList: React.FC<QueryListProps> = ({
  queries,
  onExecuteQuery,
  isExecuting
}) => {
  const getQueryTypeColor = (type: QueryType) => {
    return type === QueryType.DATASET ? 'blue' : 'green';
  };

  const getParameterTypeColor = (type: string) => {
    switch (type) {
      case 'DATE': return 'orange';
      case 'CONTROL': return 'purple';
      case 'NUMBER': return 'cyan';
      case 'BOOLEAN': return 'red';
      default: return 'default';
    }
  };

  return (
    <div data-testid="query-executor-query-list" className="gba:space-y-4">
      <Title level={4} className="gba:mb-4">Available Queries ({queries.length})</Title>
      
      {queries.map((query) => (
        <Card
          key={query.id || query.name}
          data-testid={`query-card-${query.name}`}
          className="gba:mb-4"
          title={
            <Space>
              <Text strong>{query.name}</Text>
              <Tag color={getQueryTypeColor(query.queryType)}>
                {query.queryType}
              </Tag>
              <Tag color="green">{query.status}</Tag>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => onExecuteQuery(query)}
              loading={isExecuting}
              data-testid={`execute-button-${query.name}`}
            >
              Execute
            </Button>
          }
        >
          <div className="gba:space-y-3">
            <Paragraph className="gba:text-gray-600 gba:mb-2">
              {query.description}
            </Paragraph>

            {query.parameters.length > 0 && (
              <div>
                <Text strong className="gba:block gba:mb-2">
                  <InfoCircleOutlined className="gba:mr-1" />
                  Parameters ({query.parameters.length}):
                </Text>
                <Space wrap>
                  {query.parameters.map((param) => (
                    <Tooltip
                      key={param.name}
                      title={`${param.description} ${param.required ? '(Required)' : '(Optional)'}`}
                    >
                      <Tag 
                        color={getParameterTypeColor(param.type)}
                        data-testid={`parameter-${param.name}`}
                      >
                        {param.name}: {param.type}
                        {param.required && ' *'}
                      </Tag>
                    </Tooltip>
                  ))}
                </Space>
              </div>
            )}

            {query.additionalColumns.length > 0 && (
              <div>
                <Text strong className="gba:block gba:mb-2">
                  Additional Columns:
                </Text>
                <Space wrap>
                  {query.additionalColumns.map((col) => (
                    <Tag key={col.name} color="default">
                      {col.name}: {col.type}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}; 