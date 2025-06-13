import React, { useEffect, useState} from 'react';
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
  Spin,
  message
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

interface Contact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface MainContact {
  name: string;
  position: string;
  email: string;
  phone: string;
}

interface CompanyDetailProps {
  companyId?: string;
  onBack?: () => void;
  accessToken: string;
}

const emptyCompanyData = {
  id: '',
  name: '',
  version: 0,
  industry: '',
  description: '',
  founded: '',
  headquarters: '',
  size: '',
  legalForm: '',
  tags: [],
  website: '',
  linkedin: '',
  mainContacts: [] as MainContact[],
  accountOwner: {
    id: '',
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
  geographicPresence: '',
  addresses:{
    city:'',
    countryRef:'',
    version: 0,
    regionRef:'',
    postalCode:'',
    id:'',
    addressType:'',
    addressLine:'',
    region:{
      id:'',
      value:'',
      code:''
    },
    country:{
      id:'',
      value:'',
      code:''
    }
  }
};

const CompanyDetail: React.FC<CompanyDetailProps> = ({ companyId: _companyId, onBack, accessToken }) => {
  const [isEditing, setIsEditing] = useState<boolean>(!_companyId);
  const [editedData, setEditedData] = useState<any>(!_companyId ? emptyCompanyData : null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(_companyId ? true : false);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState(_companyId ? emptyCompanyData : emptyCompanyData);

  const graphQLClient = useGraphqlClient(accessToken);

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
            version: apiData.version || 0,
            industry: apiData.industry?.value || '',
            description: '', 
            founded: apiData.foundationDate || '',
            headquarters: apiData.addresses?.[0]?.city || '',
            size: apiData.numberOfEmployees?.value || '',
            legalForm: apiData.legalForm?.value || '',
            tags: [], 
            website: apiData.website || '',
            linkedin: '',
            mainContacts: Array.isArray(apiData.contact) 
              ? (apiData.contact as Contact[]).map((contact: Contact) => ({
                  name: contact?.firstName && contact?.lastName ? 
                    `${contact.firstName} ${contact.lastName}` : '',
                  position: '',
                  email: contact?.email || '',
                  phone: contact?.phone || ''
                }))
              : apiData.contact
                ? [{
                    name: (apiData.contact as Contact)?.firstName && (apiData.contact as Contact)?.lastName ? 
                      `${(apiData.contact as Contact).firstName} ${(apiData.contact as Contact).lastName}` : '',
                    position: '',
                    email: (apiData.contact as Contact)?.email || '',
                    phone: (apiData.contact as Contact)?.phone || ''
                  }]
                : [],
            accountOwner: {
              id:apiData.ownerEmployee?.id || '',
              name: apiData.ownerEmployee?.firstName && apiData.ownerEmployee?.lastName ?
                `${apiData.ownerEmployee?.firstName} ${apiData.ownerEmployee?.lastName}` : '',
              avatar: ''
            },
            numberOfEmployeesRef:apiData.numberOfEmployeesRef,
            addresses:{
              city:apiData.addresses[0]?.city,
              countryRef:apiData.addresses[0]?.countryRef,
              version:apiData.addresses[0]?.version,
              regionRef:apiData.addresses[0]?.regionRef,
              postalCode:apiData.addresses[0]?.postalCode,
              id:apiData.addresses[0]?.id,
              addressType:apiData.addresses[0]?.addressType,
              addressLine:apiData.addresses[0]?.addressLine,
              region:{
                id:apiData.addresses[0]?.region?.id,
                value:apiData.addresses[0]?.region?.value,
                code:apiData.addresses[0]?.region?.code
              },
              country:{
                id:apiData.addresses[0]?.country?.id,
                value:apiData.addresses[0]?.country?.value,
                code:apiData.addresses[0]?.country?.code
              }
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
            geographicPresence: [apiData.addresses?.[0]?.region?.value, apiData.addresses?.[0]?.country?.value]
              .filter(Boolean)
              .join(', ') || ''
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
      const savePayload = {
        changeMode: "UPDATE",
        account: {
          id: editedData.id,
          version: editedData.version || 0,
          name: editedData.name || "",
          website: editedData.website,
          foundationDate: editedData.founded ? new Date(editedData.founded).toISOString() : undefined,
          liquidationDate: editedData.liquidationDate,
          email: editedData.email,
          phone: editedData.phone,
          pictureUrl: editedData.logo,
          ownerEmployee: editedData.accountOwner.id,
          numberOfEmployeesRef: editedData.numberOfEmployeesRef,
          addresses: Array.isArray(editedData?.addresses) 
            ? editedData.addresses.map((addr: any) => ({
                id: addr.id,
                version: addr.version || 0,
                addressType: addr.addressType || "UNKNOWN_ADDRESS",
                addressLine: addr.addressLine,
                postalCode: addr.postalCode,
                city: addr.city,
                regionRef: addr.region.id,
                countryRef: addr.country.id
              }))
            : editedData?.addresses
              ? [{
                  id: editedData.addresses.id,
                  version: editedData.addresses.version || 0,
                  addressType: editedData.addresses.addressType || "UNKNOWN_ADDRESS",
                  addressLine: editedData.addresses.addressLine,
                  postalCode: editedData.addresses.postalCode,
                  city: editedData.addresses.city,
                  regionRef: editedData.addresses.region.id,
                  countryRef: editedData.addresses.country.id
                }]
              : []
        }
      };

      const response = await fetch(
        'https://newwork-dev.newwork.com/processes/customer-relations/saveAccount',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(savePayload)
        }
      );
      
      
      const responseText = await response.text();
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { message: responseText };
      }
      
      if (response.ok || responseData?.account?.id) {
        setCompanyData(editedData);
        setIsEditing(false);
        setHasChanges(false);
        message.success('Company updated successfully');
        
        if (responseData?.account?.id) {
          console.log('Updated company with ID:', responseData.account.id);
        }
      } else {
        const errorMessage = responseData.message || response.statusText || 'Unknown error';
        throw new Error(`Failed to update company: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error updating company:', error);
      message.error(`Failed to update company: ${error instanceof Error ? error.message : String(error)}`);
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
        src={person.avatar}
        className="gba:person-avatar"
        style={{ backgroundColor: stringToColor(person.name) }}
      >
        {person.name.charAt(0)}
      </Avatar>
      <div className="gba:person-info">
        <Text className="gba:person-name">{person.name}</Text>
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
              Main Contacts
            </div>
            <div className="gba:contact-info" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {companyData.mainContacts.map((contact, index) => (
                <div key={index}>
                  <div className="gba:contact-name" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                    {contact.name}
                  </div>
                  <div className="gba:contact-position" style={{ fontSize: '14px', color: '#555', marginBottom: '12px' }}>
                    {contact.position}
                  </div>
                  <a 
                    href={`mailto:${contact.email}`} 
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
                    {contact.email}
                  </a>
                  <a 
                    href={`tel:${contact.phone}`} 
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
                    {contact.phone}
                  </a>
                </div>
              ))}
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
