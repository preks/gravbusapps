import React, { useEffect, useState } from 'react';
import {
  Typography,
  Button,
  Row,
  Col,
  Card,
  Tag,
  Avatar,
  Tabs,
  Timeline,
  Alert,
  Input,
  Select,
  Space,
  Spin
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  BankOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  CalendarOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  SaveOutlined,
  CloseOutlined,
  GlobalOutlined,
  MailOutlined,
  PhoneOutlined,
  DollarOutlined,
  FundOutlined,
  StockOutlined,
  UserOutlined,
  PaperClipOutlined
} from '@ant-design/icons';
import {
  GET_COMPANY_BY_ID, GetCompanyByIdResponse
} from "../../overview-screens/CompanyOverview/graphql/company-queries"
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
};

interface Person {
  name: string;
  title?: string;
  avatar?: string;
}

interface Activity {
  title: string;
  date: string;
  description: string;
  duration?: string;
  outcome?: string;
  agent?: string;
  cc?: string;
}

interface CompanyDetailProps {
  companyId?: string;
  onBack?: () => void;
  accessToken: string;
}

const emptyCompanyData = {
  id: '',
  name: '',
  industry: '',
  description: '',
  founded: '',
  headquarters: '',
  size: '',
  legalForm: '',
  tags: [],
  website: '',
  linkedin: '',
  mainContact: {
    name: '',
    position: '',
    email: '',
    phone: ''
  },
  accountOwner: {
    name: '',
    avatar: ''
  },
  lastContacted: '',
  notableFacts: '',
  financialMetrics: {
    revenue: '',
    funding: '',
    valuation: ''
  },
  keyPeople: {
    founders: [] as Person[],
    leadership: [] as Person[]
  },
  activityTimeline: [] as Activity[],
  legalInformation: {
    registerId: '',
    vatId: ''
  },
  geographicPresence: ''
};

const CompanyDetail: React.FC<CompanyDetailProps> = ({ companyId: _companyId, onBack, accessToken }) => {
  const [isEditing, setIsEditing] = useState<boolean>(!_companyId);
  const [editedData, setEditedData] = useState<any>(!_companyId ? emptyCompanyData : null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(_companyId ? true : false);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState(_companyId ? emptyCompanyData : emptyCompanyData);

  const graphQLClient = useGraphqlClient(accessToken);

  const [searchCompany, setSearchCompany] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const mapChatGptJsonToForm = (json: any) => {
    const companyOverview = json.company_overview || {};
    const financial = json.financial_and_business_metrics || {};
    const keyPeopleArr = Array.isArray(json.key_people) ? json.key_people : [];
    const foundersArr = Array.isArray(companyOverview.founders)
      ? companyOverview.founders.map((f: any) => ({
          name: f.name || '',
          title: f.title || 'Founder',
          avatar: f.picture_url || ''
        }))
      : [];

    const leadershipArr = keyPeopleArr.map((p: any) => ({
      name: p.name || '',
      title: p.title || '',
      avatar: p.picture_url || ''
    }));

    let notableFacts = '';
    if (Array.isArray(companyOverview.notable_facts)) {
      notableFacts = companyOverview.notable_facts.map((fact: string) => `• ${fact}`).join('\n');
    } else if (typeof companyOverview.notable_facts === 'string') {
      notableFacts = companyOverview.notable_facts;
    }

    let revenue = '';
    if (financial.estimated_revenue?.amount_local && financial.estimated_revenue?.currency_local) {
      const amount = financial.estimated_revenue.amount_local;
      let symbol = '';
      if (financial.estimated_revenue.currency_local.toLowerCase().includes('eur')) symbol = '€';
      else if (financial.estimated_revenue.currency_local.toLowerCase().includes('usd')) symbol = '$';
      else symbol = financial.estimated_revenue.currency_local + ' ';
      revenue = `${symbol}${(amount / 1_000_000).toLocaleString(undefined, {maximumFractionDigits: 1})}m`;
    }

    const funding = financial.total_funding_raised?.amount_local && financial.total_funding_raised?.currency_local
      ? `${financial.total_funding_raised.amount_local} ${financial.total_funding_raised.currency_local}`
      : '';
    const valuation = financial.valuation?.amount_local && financial.valuation?.currency_local
      ? `${financial.valuation.amount_local} ${financial.valuation.currency_local}`
      : '';

    const registerId = Array.isArray(companyOverview.commercial_register_ids) && companyOverview.commercial_register_ids.length > 0
      ? companyOverview.commercial_register_ids[0]
      : '';
    const vatId = companyOverview.vat_id || '';

    return {
      ...emptyCompanyData,
      name: companyOverview.name || '',
      industry: companyOverview.industry || '',
      description: companyOverview.specialty || companyOverview.description || '',
      founded: companyOverview.founded || '',
      headquarters: companyOverview.headquarters || companyOverview.location || '',
      size: companyOverview.size || '',
      legalForm: companyOverview.legal_form || '',
      tags: Array.isArray(companyOverview.tags) ? companyOverview.tags : [],
      website: companyOverview.website || '',
      linkedin: companyOverview.linkedin || '',
      mainContact: {
        name: keyPeopleArr[0]?.name || '',
        position: keyPeopleArr[0]?.title || '',
        email: keyPeopleArr[0]?.email || '',
        phone: keyPeopleArr[0]?.phone || ''
      },
      accountOwner: {
        name: json.account_owner?.name || '',
        avatar: json.account_owner?.avatar || ''
      },
      lastContacted: json.last_contacted || '',
      notableFacts,
      financialMetrics: {
        revenue,
        funding,
        valuation
      },
      keyPeople: {
        founders: foundersArr,
        leadership: leadershipArr
      },
      activityTimeline: Array.isArray(json.activity_timeline) ? json.activity_timeline : [],
      legalInformation: {
        registerId,
        vatId
      },
      geographicPresence: json.geographic_presence || ''
    };
  };

  const handleSearch = async () => {
    setSearchError(null);
    setSearchLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `company_name=${encodeURIComponent(searchCompany)}&response_format=json`
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Unknown error');
      }
      const data = await res.json();
      const json = data.company_data || data;
      const mapped = mapChatGptJsonToForm(json);
      setCompanyData(mapped);
      setEditedData(mapped);
      setHasChanges(true);
    } catch (e: any) {
      setSearchError(e.message || 'Failed to fetch company info');
    } finally {
      setSearchLoading(false);
    }
  };
  
  useEffect(() => {
    const fetchCompanyById = async () => {
      if (!_companyId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const result = await graphQLClient.request<GetCompanyByIdResponse>(
          GET_COMPANY_BY_ID,
          {
            id: _companyId
          }
        );
        if (result && result.Account && result.Account[0]) {
          const apiData = result?.Account[0];
          const transformedData = {
            id: apiData.id || '',
            name: apiData.name || '',
            industry: apiData.industry?.value || '',
            description: '', 
            founded: apiData.foundationDate || '',
            headquarters: apiData.addresses?.[0]?.city || '',
            size: apiData.numberOfEmployees?.value || '',
            legalForm: apiData.legalForm?.value || '',
            tags: [], 
            website: apiData.website || '',
            linkedin: '',
            mainContact: {
              name: apiData.contact?.firstName && apiData.contact?.lastName ? 
                `${apiData.contact.firstName} ${apiData.contact.lastName}` : '',
              position: '',
              email: '',
              phone: ''
            },
            accountOwner: {
              name: apiData.ownerEmployee?.firstName && apiData.ownerEmployee?.lastName ?
                `${apiData.ownerEmployee.firstName} ${apiData.ownerEmployee.lastName}` : '',
              avatar: ''
            },
            lastContacted: '',
            notableFacts: '',
            financialMetrics: {
              revenue: '',
              funding: '',
              valuation: ''
            },
            keyPeople: {
              founders: [],
              leadership: []
            },
            activityTimeline: [],
            legalInformation: {
              registerId: '',
              vatId: ''
            },
            geographicPresence: apiData.addresses?.[0]?.country?.value || ''
          };
          setCompanyData(transformedData);
        } else {
          setError("Failed to fetch company data");
          setCompanyData(emptyCompanyData);
        }
      } catch (err) {
        setError('Failed to fetch company: ' + (err instanceof Error ? err.message : String(err)));
        setCompanyData(emptyCompanyData);
      } finally {
        setLoading(false);
      }
    };

    if (_companyId) {
      fetchCompanyById();
    }
  }, [_companyId, accessToken, graphQLClient]);

  React.useEffect(() => {
    if (isEditing && companyData) {
      setEditedData({ ...companyData });
    }
  }, [isEditing, companyData]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      console.log('Navigate back to company list');
    }
  };

  const handleEdit = () => {
    setEditedData({...companyData});
    setIsEditing(true);
    console.log('Edit company:', companyData.id);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      setCompanyData(editedData);
      setIsEditing(false);
      setHasChanges(false);
      
      console.log('Company data to update:', {
        id: editedData.id,
        name: editedData.name,
        website: editedData.website,
        foundationDate: editedData.founded,
        industry: editedData.industry,
        description: editedData.description,
        headquarters: editedData.headquarters,
        size: editedData.size
      });
      
      
      console.log('Company updated successfully in UI - backend update to be implemented when API is ready');
      
    } catch (error) {
      console.error('Error updating company:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setHasChanges(false);
    console.log('Cancel edit');
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedData((prevData: any) => {
      if (field.includes('.')) {
        const [parentField, childField] = field.split('.');
        return {
          ...prevData,
          [parentField]: {
            ...prevData[parentField],
            [childField]: value
          }
        };
      }
      return {
        ...prevData,
        [field]: value
      };
    });
    setHasChanges(true);
  };

  const handleAddActivity = () => {
    console.log('Add activity for company:', companyData.id);
  };

  return (
    <div className="gba:company-detail-container" style={{ padding: '0 12px', maxWidth: '1600px', margin: '0 auto' }}>
      {loading ? (
        <div className="gba:full-page-loading" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1000
        }}>
          <Spin size="large" tip="Loading company data..." />
        </div>
      ) : null}
      
      <div 
        className="gba:back-link" 
        onClick={handleBack} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '20px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        <ArrowLeftOutlined className="gba:back-icon" />
        Back to Companies
      </div>

      {isEditing && (
        <Alert
          message="Edit Mode Active"
          description="Click on any cell to edit. Use save/cancel buttons to confirm changes."
          type="warning"
          showIcon
          className="gba:edit-mode-alert"
          style={{ marginBottom: '24px' }}
        />
      )}

      <div className="gba:company-header" style={{ 
        marginBottom: '32px', 
        borderBottom: '1px solid #f0f0f0', 
        paddingBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div className="gba:company-name-wrapper" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            {isEditing && editedData ? (
              <>
                <Input
                  value={editedData.name}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', maxWidth: 400 }}
                  placeholder="Company Name"
                />

                <div style={{ margin: '16px 0' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Input
                      placeholder="Search company name (e.g. Apple, Tesla)"
                      value={searchCompany}
                      onChange={e => setSearchCompany(e.target.value)}
                      style={{ maxWidth: 300 }}
                      disabled={searchLoading}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !searchLoading) {
                          handleSearch();
                        }
                      }}
                    />
                    <Button
                      type="primary"
                      loading={searchLoading}
                      onClick={handleSearch}
                      disabled={!searchCompany.trim() || searchLoading}
                    >
                      Search
                    </Button>
                  </div>
                  {searchError && (
                    <Alert message={searchError} type="error" showIcon style={{ marginTop: 12 }} />
                  )}
                </div>
                <Input
                  value={editedData.industry}
                  onChange={e => handleFieldChange('industry', e.target.value)}
                  style={{ color: 'rgba(0, 0, 0, 0.65)', marginBottom: '12px', maxWidth: 400 }}
                  placeholder="Industry"
                />
                <div style={{ marginTop: 16 }}>
                  <a href={editedData.website || companyData.website || '#'} target="_blank" rel="noopener noreferrer" style={{ fontSize: '15px', marginRight: '12px' }}>
                    Website
                  </a>
                  {((editedData.linkedin || companyData.linkedin) && <>
                    <a href={editedData.linkedin || companyData.linkedin || '#'} target="_blank" rel="noopener noreferrer" style={{ fontSize: '15px' }}>
                      LinkedIn
                    </a>
                  </>)}
                </div>
              </>
            ) : (
              <>
                {loading ? (
                  <Spin style={{ fontSize: 24 }} />
                ) : (
                  <>
                    <Title level={3} className="gba:company-name" style={{ marginBottom: '12px' }}>{companyData.name}</Title>
                    <Text className="gba:company-industry" style={{ display: 'block', fontSize: '16px', marginBottom: '16px', color: '#555' }}>{companyData.industry}</Text>
                    <div style={{ marginTop: '16px' }}>
                      <a href={companyData.website || '#'} target="_blank" rel="noopener noreferrer" style={{ fontSize: '15px', marginRight: '16px' }}>
                        Website
                      </a>
                      {companyData.linkedin && (
                        <a href={companyData.linkedin || '#'} target="_blank" rel="noopener noreferrer" style={{ fontSize: '15px' }}>
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="gba:edit-actions" style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: '8px' }}>
            <Space>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSave}
                disabled={!hasChanges}
                size="large"
              >
                Save
              </Button>
              <Button 
                icon={<CloseOutlined />} 
                onClick={handleCancel}
                size="large"
              >
                Cancel
              </Button>
            </Space>
          </div>
        ) : (
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            className="gba:edit-button"
            onClick={handleEdit}
            size="large"
          >
            Edit Company
          </Button>
        )}
      </div>

      <Row gutter={[40, 32]}>
        <Col span={16}>
          <Card className="gba:card-container" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: '8px' }}>
            <div className="gba:section-title" style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <BankOutlined className="gba:section-title-icon" /> 
              Company Overview
            </div>
            <div className="gba:section-subtitle" style={{ 
              fontSize: '16px', 
              fontWeight: 500, 
              marginBottom: '12px',
              marginTop: '4px'
            }}>About</div>
            {isEditing && editedData ? (
              <Input.TextArea
                value={editedData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                rows={4}
                style={{ marginBottom: '24px' }}
              />
            ) : (
              <Paragraph style={{ marginBottom: '24px' }}>{companyData.description}</Paragraph>
            )}
            
            <Row gutter={[32, 24]} className="gba:company-info-row">
              <Col span={12}>
                <div className="gba:company-info-label" style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#555',
                  marginBottom: '6px',
                  fontSize: '14px'
                }}>
                  <CalendarOutlined className="gba:icon-wrapper" />
                  Founded:
                </div>
                <div className="gba:company-info-value" style={{ fontSize: '15px' }}>
                  {isEditing && editedData ? (
                    <Input 
                      value={editedData.founded} 
                      onChange={(e) => handleFieldChange('founded', e.target.value)}
                    />
                  ) : (
                    companyData.founded
                  )}
                </div>
              </Col>
              <Col span={12}>
                <div className="gba:company-info-label" style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#555',
                  marginBottom: '6px',
                  fontSize: '14px'
                }}>
                  <EnvironmentOutlined className="gba:icon-wrapper" />
                  Headquarters:
                </div>
                <div className="gba:company-info-value" style={{ fontSize: '15px' }}>
                  {isEditing && editedData ? (
                    <Input 
                      value={editedData.headquarters} 
                      onChange={(e) => handleFieldChange('headquarters', e.target.value)}
                    />
                  ) : (
                    companyData.headquarters
                  )}
                </div>
              </Col>
            </Row>
            
            <Row gutter={[32, 24]} className="gba:company-info-row">
              <Col span={12}>
                <div className="gba:company-info-label" style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#555',
                  marginBottom: '6px',
                  fontSize: '14px'
                }}>
                  <TeamOutlined className="gba:icon-wrapper" />
                  Company Size:
                </div>
                <div className="gba:company-info-value" style={{ fontSize: '15px' }}>
                  {isEditing && editedData ? (
                    <Select
                      style={{ width: '100%' }}
                      value={editedData.size}
                      onChange={(value) => handleFieldChange('size', value)}
                    >
                      <Option value="1-10 employees">1-10 employees</Option>
                      <Option value="11-50 employees">11-50 employees</Option>
                      <Option value="51-200 employees">51-200 employees</Option>
                      <Option value="201-500 employees">201-500 employees</Option>
                      <Option value="501-1000 employees">501-1000 employees</Option>
                      <Option value="1000-5000 employees">1000-5000 employees</Option>
                      <Option value="5000+ employees">5000+ employees</Option>
                    </Select>
                  ) : (
                    companyData.size
                  )}
                </div>
              </Col>
              <Col span={12}>
                <div className="gba:company-info-label" style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#555',
                  marginBottom: '6px',
                  fontSize: '14px'
                }}>
                  <BankOutlined className="gba:icon-wrapper" />
                  Legal Form:
                </div>
                <div className="gba:company-info-value" style={{ fontSize: '15px' }}>
                  {isEditing && editedData ? (
                    <Input 
                      value={editedData.legalForm} 
                      onChange={(e) => handleFieldChange('legalForm', e.target.value)}
                    />
                  ) : (
                    companyData.legalForm
                  )}
                </div>
              </Col>
            </Row>
            
            <div className="gba:tag-container">
              {companyData.tags.map(tag => {
                let color = 'geekblue';
                if (tag === 'Enterprise') {
                  color = 'blue';
                } else if (tag === 'Key Account') {
                  color = 'gold';
                }
                return (
                  <Tag color={color} key={tag}>
                    {tag}
                  </Tag>
                );
              })}
            </div>
            
            <div style={{ marginTop: '16px', display: 'flex' }}>
              <a href={`https://${companyData.website}`} className="gba:external-link" target="_blank" rel="noopener noreferrer">
                <LinkOutlined className="gba:link-icon" /> Website
              </a>
              <a href={`https://${companyData.linkedin}`} className="gba:external-link" target="_blank" rel="noopener noreferrer">
                <LinkOutlined className="gba:link-icon" /> LinkedIn
              </a>
            </div>
          </Card>

          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:section-title" style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircleOutlined className="gba:section-title-icon" /> 
              Notable Facts
            </div>
            <div className="gba:account-info-value" style={{ whiteSpace: 'pre-line' }}>
              {(isEditing && editedData ? editedData.notableFacts : companyData.notableFacts) || <span style={{ color: '#ccc' }}>No notable facts available.</span>}
            </div>
          </Card>

          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:section-title" style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <DollarOutlined className="gba:section-title-icon" /> 
              Financial & Business Metrics
            </div>
            
            <div className="gba:metrics-container">
              <div className="gba:metric-item">
                <DollarOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                <div className="gba:metric-value gba:revenue-metric">{companyData.financialMetrics.revenue || 'N/A'}</div>
                <div className="gba:metric-label">Estimated Revenue (2023)</div>
              </div>
              
              <div className="gba:metric-item">
                <FundOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                <div className="gba:metric-value gba:funding-metric">{companyData.financialMetrics.funding || 'N/A'}</div>
                <div className="gba:metric-label">Total Funding (2023)</div>
              </div>
              
              <div className="gba:metric-item">
                <StockOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
                <div className="gba:metric-value gba:valuation-metric">{companyData.financialMetrics.valuation || 'N/A'}</div>
                <div className="gba:metric-label">Valuation (2023)</div>
              </div>
            </div>
          </Card>

          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:section-title" style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <TeamOutlined className="gba:section-title-icon" /> 
              Key People
            </div>

            <div className="gba:key-people-section">
              <div className="gba:people-group">
                <div className="gba:people-group-title">Founders</div>
                {companyData.keyPeople.founders.length === 0 ? (
                  <Text type="secondary">No founders available</Text>
                ) : (
                  companyData.keyPeople.founders.map((person, index) => (
                    <div key={index} className="gba:person-card">
                      <Avatar 
                        size={40} 
                        src={person?.avatar}
                        className="gba:person-avatar"
                        style={{ backgroundColor: stringToColor(person?.name) }}
                      >
                        {person?.name?.charAt(0)}
                      </Avatar>
                      <div className="gba:person-info">
                        <Text className="gba:person-name">{person?.name}</Text>
                        {person.title && <Text className="gba:person-title">{person.title}</Text>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="gba:people-group">
                <div className="gba:people-group-title">Leadership Team</div>
                {companyData.keyPeople.leadership.length === 0 ? (
                  <Text type="secondary">No leadership available</Text>
                ) : (
                  companyData.keyPeople.leadership.map((person, index) => (
                    <div key={index} className="gba:person-card">
                      <Avatar 
                        size={40} 
                        src={person.avatar}
                        className="gba:person-avatar"
                        style={{ backgroundColor: stringToColor(person.name) }}
                      >
                        {person.name.charAt(0)}
                      </Avatar>
                      <div className="gba:person-info">
                        <Text className="gba:person-name">{person.name}</Text>
                        <Text className="gba:person-title">{person.title}</Text>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card className="gba:card-container" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: '8px' }}>
            <div className="gba:section-title" style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <UserOutlined className="gba:section-title-icon" /> 
              Main Contact
            </div>
            <div className="gba:contact-info" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div className="gba:contact-name" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                  {companyData.mainContact.name}
                </div>
                <div className="gba:contact-position" style={{ fontSize: '14px', color: '#555', marginBottom: '12px' }}>
                  {companyData.mainContact.position}
                </div>
              </div>
              
              <a 
                href={`mailto:${companyData.mainContact.email}`} 
                className="gba:contact-link"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  color: '#1890ff',
                  fontSize: '14px',
                  marginBottom: '8px',
                  textDecoration: 'none'
                }}
              >
                <MailOutlined className="gba:contact-link-icon" />
                {companyData.mainContact.email}
              </a>
              
              <a 
                href={`tel:${companyData.mainContact.phone}`} 
                className="gba:contact-link"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  color: '#1890ff',
                  fontSize: '14px',
                  textDecoration: 'none'
                }}
              >
                <PhoneOutlined className="gba:contact-link-icon" />
                {companyData.mainContact.phone}
              </a>
            </div>
          </Card>

          <Card className="gba:card-container" style={{ marginTop: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: '8px' }}>
            <div className="gba:section-title" style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <BankOutlined className="gba:section-title-icon" /> 
              Account Information
            </div>
            
            <div className="gba:account-info-item" style={{ 
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <div className="gba:account-info-label" style={{ 
                fontSize: '14px',
                color: '#555',
                marginBottom: '6px',
                fontWeight: 500
              }}>Account Owner</div>
              <div className="gba:account-info-value" style={{ 
                fontSize: '15px'
              }}>{companyData.accountOwner.name}</div>
            </div>
            
            <div className="gba:account-info-item" style={{ 
              marginBottom: '4px'
            }}>
              <div className="gba:account-info-label" style={{ 
                fontSize: '14px',
                color: '#555',
                marginBottom: '6px',
                fontWeight: 500
              }}>Last Contacted</div>
              <div className="gba:account-info-value" style={{ 
                fontSize: '15px'
              }}>{companyData.lastContacted}</div>
            </div>
          </Card>

          <Card className="gba:card-container" style={{ marginTop: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderRadius: '8px' }}>
            <div className="gba:timeline-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div className="gba:section-title" style={{ 
                margin: 0,
                fontSize: '18px', 
                fontWeight: 600, 
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CalendarOutlined className="gba:section-title-icon" /> 
                Activity Timeline
              </div>
              <Button 
                type="primary" 
                size="small" 
                icon={<PaperClipOutlined />}
                onClick={handleAddActivity}
              >
                Add Activity
              </Button>
            </div>

            <Tabs defaultActiveKey="activities">
              <TabPane tab="Activities" key="activities">
                <div className="gba:tab-content">
                  <Timeline>
                    {companyData.activityTimeline.map((activity, index) => (
                      <Timeline.Item key={index} color="blue">
                        <div>
                          <Text strong>{activity.title}</Text>
                          <div><Text type="secondary">{activity.date}</Text></div>
                          <div>{activity.description}</div>
                          {activity.duration && (
                            <div>Duration: {activity.duration}</div>
                          )}
                          {activity.outcome && (
                            <div>Outcome: {activity.outcome}</div>
                          )}
                          {activity.agent && (
                            <div>Agent: {activity.agent}</div>
                          )}
                          {activity.cc && (
                            <div>CC: {activity.cc}</div>
                          )}
                        </div>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </div>
              </TabPane>
              <TabPane tab="Notes" key="notes">
                <div className="gba:tab-content">
                  <Text type="secondary">No notes available</Text>
                </div>
              </TabPane>
              <TabPane tab="Documents" key="documents">
                <div className="gba:tab-content">
                  <Text type="secondary">No documents available</Text>
                </div>
              </TabPane>
            </Tabs>
          </Card>

          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:section-title" style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <BankOutlined className="gba:section-title-icon" /> 
              Legal Information
            </div>
            
            <div className="gba:account-info-item">
              <div className="gba:account-info-label">Register IDs</div>
              <div className="gba:account-info-value">{companyData.legalInformation.registerId ? `HRB ${companyData.legalInformation.registerId}` : 'N/A'}</div>
            </div>
            
            <div className="gba:account-info-item">
              <div className="gba:account-info-label">VAT</div>
              <div className="gba:account-info-value">{companyData.legalInformation.vatId || 'N/A'}</div>
            </div>
          </Card>

          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:section-title" style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <GlobalOutlined className="gba:section-title-icon" /> 
              Geographic Presence
            </div>
            
            <div className="gba:account-info-value">{companyData.geographicPresence || 'N/A'}</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CompanyDetail;
