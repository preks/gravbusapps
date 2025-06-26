import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, Form, Spin, Alert, Tag, Divider, Descriptions, Card } from 'antd';
import { SearchOutlined, EyeOutlined, CodeOutlined, InfoCircleOutlined, TeamOutlined, LinkOutlined, RightOutlined, ProfileOutlined, BookOutlined, ToolOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useJobFunctions } from '../../hooks/useJobFunctions';
import { JobFunction } from '../../types';
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer';

const { Title } = Typography;

export interface JobFunctionsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

type TranslationKey = Record<string, string>;

const JobFunctionsTab: React.FC<JobFunctionsTabProps> = (context) => {
  const { t } = useTranslation();
  const { prefixDataTestId } = context;
  
  const { 
    jobFunctions, 
    totalCount, 
    isLoading, 
    error, 
    refetch,
    searchJobFunctions 
  } = useJobFunctions(context);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFunction, setSelectedFunction] = useState<JobFunction | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredFunctions = searchTerm 
    ? searchJobFunctions(searchTerm)
    : jobFunctions;

  const handleView = (record: JobFunction) => {
    setSelectedFunction(record);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedFunction(null);
  };
  
  // Function to render translations
  const renderTranslationItems = (i18nData: TranslationKey | null | undefined) => {
    if (!i18nData || Object.keys(i18nData).length === 0) return <Tag color="orange">No translations</Tag>;
    
    return (
      <div className="gba:space-y-2">
        {Object.entries(i18nData).map(([locale, value]) => (
          <Tag key={locale} className="gba:mr-2 gba:mb-2">
            <span className="gba:font-medium">{locale}:</span> {value}
          </Tag>
        ))}
      </div>
    );
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a: JobFunction, b: JobFunction) => (a.code || '').localeCompare(b.code || ''),
      render: (code: string) => code || 'N/A'
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: JobFunction, b: JobFunction) => a.name.localeCompare(b.name),
    },
    {
      title: 'Job Family',
      dataIndex: ['jobFamily', 'value'],
      key: 'jobFamily',
      width: 150,
      render: (value: string) => value || 'Not assigned',
    },
    {
      title: 'Job Level Group',
      dataIndex: ['jobLevelGroup', 'value'],
      key: 'jobLevelGroup',
      width: 150,
      render: (value: string) => value || 'Not assigned',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string) => description || 'No description',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: any, record: JobFunction) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
          size="small"
          title="View Details"
        />
      ),
    },
  ];

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error Loading Job Functions"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      data-testid={`${prefixDataTestId || ''}-JobFunctionsTab`}
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
            {t('hr.job_functions', 'Job Functions')} ({totalCount})
          </Title>
        </div>
        
        <Input
          placeholder="Search job functions..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-SearchInput`}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredFunctions}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} job functions`,
          }}
          data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-Table`}
          style={{ background: 'white', borderRadius: '8px' }}
          onRow={(record) => ({
            onClick: () => handleView(record),
            className: 'gba:cursor-pointer',
            'data-testid': `${prefixDataTestId || ''}-JobFunctionsTab-TableRow-${record.id}`
          })}
        />
      )}

      <DataDetailsDrawer
        title="Job Function Details"
        icon={<CodeOutlined />}
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        width={600}
        placement="right"
        dataTestId={`${prefixDataTestId || ''}-JobFunctionsTab-Drawer`}
        footer={
          <div className="gba:flex gba:justify-end">
            <Button onClick={handleCloseDrawer}>
              Close
            </Button>
          </div>
        }
      >
        {selectedFunction && (
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-1">{selectedFunction.name}</h3>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Tag color="blue" className="gba:px-2">
                    <CodeOutlined /> {selectedFunction.code || '-'}
                  </Tag>
                  {selectedFunction.version !== undefined && (
                    <Tag color="purple" className="gba:px-2">
                      v{selectedFunction.version}
                    </Tag>
                  )}
                </div>
              </div>
            </div>

            <Divider className="gba:my-3" />
            
            <Descriptions title="Basic Information" bordered size="small" column={1}>
              <Descriptions.Item label="Job Function ID">
                <span className="gba:text-gray-600 gba:font-mono gba:text-xs">{selectedFunction.id}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedFunction.description || "-"}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="Classifications" bordered size="small" column={1}>
              <Descriptions.Item label="Job Family">
                {selectedFunction.jobFamily ? (
                  <Tag color="green" icon={<TeamOutlined />} className="gba:px-2">
                    {selectedFunction.jobFamily.value}
                  </Tag>
                ) : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Job Level Group">
                {selectedFunction.jobLevelGroup ? (
                  <Tag color="blue" icon={<TeamOutlined />} className="gba:px-2">
                    {selectedFunction.jobLevelGroup.value}
                  </Tag>
                ) : "-"}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="Translations" bordered size="small" column={1}>
              <Descriptions.Item label="Name Translations">
                {renderTranslationItems(selectedFunction.nameI18n)}
              </Descriptions.Item>
              <Descriptions.Item label="Description Translations">
                {renderTranslationItems(selectedFunction.descriptionI18n)}
              </Descriptions.Item>
            </Descriptions>

            {/* Related Navigation Links */}
            <div className="gba:mt-6">
              <Divider orientation="left">
                <span className="gba:flex gba:items-center gba:gap-2">
                  <LinkOutlined />
                  <span className="gba:text-base">Related Resources</span>
                </span>
              </Divider>
              
              <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                {/* Job Family Navigation */}
                {selectedFunction.jobFamilyRef && (
                  <Card 
                    className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow" 
                    size="small"
                    bodyStyle={{ padding: '12px' }}
                    data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-JobFamilyLink`}
                  >
                    <a 
                      href={`/mdm/job-structure-data/job-families/${selectedFunction.jobFamilyRef}`}
                      className="gba:flex gba:items-center gba:gap-3 gba:text-green-600 gba:hover:text-green-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-green-100">
                        <TeamOutlined className="gba:text-lg gba:text-green-600" />
                      </div>
                      <div className="gba:flex-grow">
                        <div className="gba:font-medium">
                          {selectedFunction.jobFamily?.value || 'Job Family Details'}
                        </div>
                        <div className="gba:text-xs gba:text-gray-500">
                          View complete job family information, structure, and related positions
                        </div>
                      </div>
                      <RightOutlined className="gba:text-gray-400" />
                    </a>
                  </Card>
                )}
                
                {/* Job Level Group Navigation */}
                {selectedFunction.jobLevelGroupRef && (
                  <Card 
                    className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow" 
                    size="small"
                    bodyStyle={{ padding: '12px' }}
                    data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-JobLevelGroupLink`}
                  >
                    <a 
                      href={`/mdm/job-structure-data/job-level-groups/${selectedFunction.jobLevelGroupRef}`}
                      className="gba:flex gba:items-center gba:gap-3 gba:text-blue-600 gba:hover:text-blue-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-blue-100">
                        <ProfileOutlined className="gba:text-lg gba:text-blue-600" />
                      </div>
                      <div className="gba:flex-grow">
                        <div className="gba:font-medium">
                          {selectedFunction.jobLevelGroup?.value || 'Level Group Details'}
                        </div>
                        <div className="gba:text-xs gba:text-gray-500">
                          View job level grouping, career progression paths, and categorization
                        </div>
                      </div>
                      <RightOutlined className="gba:text-gray-400" />
                    </a>
                  </Card>
                )}
                
                {/* Related Job Profiles */}
                <Card 
                  className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow" 
                  size="small"
                  bodyStyle={{ padding: '12px' }}
                  data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-JobProfilesLink`}
                >
                  <a 
                    href={`/mdm/job-structure-data/job-profiles?function=${selectedFunction.id}`}
                    className="gba:flex gba:items-center gba:gap-3 gba:text-purple-600 gba:hover:text-purple-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-purple-100">
                      <BookOutlined className="gba:text-lg gba:text-purple-600" />
                    </div>
                    <div className="gba:flex-grow">
                      <div className="gba:font-medium">Related Job Profiles</div>
                      <div className="gba:text-xs gba:text-gray-500">
                        View all job profiles using the {selectedFunction.name} function
                      </div>
                    </div>
                    <RightOutlined className="gba:text-gray-400" />
                  </a>
                </Card>
                
                {/* Skills & Competencies */}
                <Card 
                  className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow" 
                  size="small"
                  bodyStyle={{ padding: '12px' }}
                  data-testid={`${prefixDataTestId || ''}-JobFunctionsTab-SkillsLink`}
                >
                  <a 
                    href={`/mdm/competencies-data/skills?jobFunction=${selectedFunction.id}`}
                    className="gba:flex gba:items-center gba:gap-3 gba:text-orange-600 gba:hover:text-orange-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-orange-100">
                      <ToolOutlined className="gba:text-lg gba:text-orange-600" />
                    </div>
                    <div className="gba:flex-grow">
                      <div className="gba:font-medium">Skills & Competencies</div>
                      <div className="gba:text-xs gba:text-gray-500">
                        Explore skills and competencies associated with {selectedFunction.name}
                      </div>
                    </div>
                    <RightOutlined className="gba:text-gray-400" />
                  </a>
                </Card>
              </div>
            </div>
          </div>
        )}
      </DataDetailsDrawer>
    </div>
  );
};

export { JobFunctionsTab };