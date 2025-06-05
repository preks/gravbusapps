import React, { useState } from 'react';
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
  Space
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

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// Helper function to generate a consistent color from a string
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
    founders: [],
    leadership: []
  },
  activityTimeline: [],
  legalInformation: {
    registerId: '',
    vatId: ''
  },
  geographicPresence: ''
};

const CompanyDetail: React.FC<CompanyDetailProps> = ({ companyId: _companyId, onBack, accessToken }) => {
  // State for edit mode
  const [isEditing, setIsEditing] = useState<boolean>(!_companyId);
  const [editedData, setEditedData] = useState<any>(!_companyId ? emptyCompanyData : null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // For ChatGPT search
  const [searchCompany, setSearchCompany] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Maps the ChatGPT JSON to our form structure
  const mapChatGptJsonToForm = (json: any) => {
    // Map all fields robustly from backend JSON
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
    console.log('DEBUG foundersArr:', foundersArr);

    // Leadership mapping
    const leadershipArr = keyPeopleArr.map((p: any) => ({
      name: p.name || '',
      title: p.title || '',
      avatar: p.picture_url || ''
    }));

    // Format notable facts as bullet points if array
    let notableFacts = '';
    if (Array.isArray(companyOverview.notable_facts)) {
      notableFacts = companyOverview.notable_facts.map((fact: string) => `• ${fact}`).join('\n');
    } else if (typeof companyOverview.notable_facts === 'string') {
      notableFacts = companyOverview.notable_facts;
    }

    // Format revenue in millions, e.g. €800m
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

    // Legal info
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

  // Handle ChatGPT search
  // I have some python code that works. The response will look like this.
  // If you are interested in the python code, please let me know - Kain
  // src/business-apps/crm/detail-screens/CompanyDetail/Coca_Cola_response_20250528_145209.json
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
      // If Flask returns company_data, otherwise use the root
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
  
  // In a real application, you would fetch company data based on companyId
  // For this example, we'll use mock data based on the screenshot
  // If companyId is provided, we would use it to fetch specific company data
  // console.log('Rendering company with ID:', companyId);
  
  const [companyData, setCompanyData] = useState(_companyId ? {
    id: '1',
    name: 'Acme Corporation',
    industry: 'Technology Solutions',
    description: 'Leading provider of innovative technology solutions for enterprise clients worldwide.',
    founded: '2010',
    headquarters: 'New York, NY',
    size: '1000-5000 employees',
    legalForm: 'Corporation',
    tags: ['Enterprise', 'Key Account', 'Technology'],
    website: 'acmecorp.com',
    linkedin: 'linkedin.com/company/acme-corp',
    mainContact: {
      name: 'Emily Davis',
      position: 'Business Development Manager',
      email: 'emily.davis@acmecorp.com',
      phone: '+1 (555) 123-4567'
    },
    accountOwner: {
      name: 'Robert Taylor',
      avatar: '/avatars/robert.jpg'
    },
    lastContacted: '5/15/2023',
    notableFacts: '• First company to implement AI-driven customer service\n• Winner of Tech Innovation Award 2023\n• Serves over 500 enterprise clients globally',
    financialMetrics: {
      revenue: '€50M',
      funding: '€25M',
      valuation: '€200M'
    },
    keyPeople: {
      founders: [
        {
          name: 'John Smith',
          title: 'Founder',
          avatar: '/avatars/john.jpg'
        }
      ],
      leadership: [
        {
          name: 'Sarah Johnson',
          title: 'CEO',
          avatar: '/avatars/sarah.jpg'
        },
        {
          name: 'Michael Brown',
          title: 'CTO',
          avatar: '/avatars/michael.jpg'
        }
      ]
    },
    activityTimeline: [
      {
        type: 'salesCall',
        date: 'May 23, 2024, 8:30 PM',
        title: 'Sales call with Jane Smith',
        description: 'Discussed product features and pricing options. Jane showed interest in our enterprise plan.',
        duration: '25 minutes',
        outcome: 'Positive',
        agent: 'Alex Johnson'
      },
      {
        type: 'proposal',
        date: 'May 18, 2023, 12:15 PM',
        title: 'Sent proposal to John Doe',
        description: 'Sent the customized proposal with pricing details and implementation timeline.',
        cc: 'Sarah Williams'
      },
      {
        type: 'demo',
        date: 'May 13, 2023, 5:00 PM',
        title: 'Product demo with technical team',
        description: 'Demonstrated our platform\'s API integration'
      }
    ],
    legalInformation: {
      registerId: '123456',
      vatId: 'DE123456789'
    },
    geographicPresence: 'United States, Europe, Asia'
  } : emptyCompanyData);

  // Initialize the company data for editing when edit mode is turned on
  React.useEffect(() => {
    if (isEditing && companyData) {
      setEditedData({ ...companyData });
    }
  }, [isEditing, companyData]);

  // Function to handle navigation back to company list
  const handleBack = () => {
    // Use the provided onBack function if available, otherwise log a message
    if (onBack) {
      onBack();
    } else {
      console.log('Navigate back to company list');
    }
  };

  // Function to handle edit company
  const handleEdit = () => {
    // Initialize the editedData before setting isEditing to true
    // This ensures editedData is available immediately when rendering the edit fields
    setEditedData({...companyData});
    setIsEditing(true);
    console.log('Edit company:', companyData.id);
  };

  // Function to handle save
  const handleSave = () => {
    setCompanyData(editedData);
    setIsEditing(false);
    setHasChanges(false);
    console.log('Save changes:', editedData);
  };

  // Function to handle cancel
  const handleCancel = () => {
    setIsEditing(false);
    setHasChanges(false);
    console.log('Cancel edit');
  };

  // Function to handle field changes
  const handleFieldChange = (field: string, value: any) => {
    setEditedData((prevData: any) => {
      // Handle nested fields
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
      // Handle top-level fields
      return {
        ...prevData,
        [field]: value
      };
    });
    setHasChanges(true);
  };

  // Function to handle add activity
  const handleAddActivity = () => {
    console.log('Add activity for company:', companyData.id);
  };

  return (
    <div className="gba:company-detail-container">
      {/* Back link */}
      <div className="gba:back-link" onClick={handleBack}>
        <ArrowLeftOutlined className="gba:back-icon" />
        Back to Companies
      </div>

      {/* Edit Mode Warning */}
      {isEditing && (
        <Alert
          message="Edit Mode Active"
          description="Click on any cell to edit. Use save/cancel buttons to confirm changes."
          type="warning"
          showIcon
          className="gba:edit-mode-alert"
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Company header */}
      <div className="gba:company-header">
        <div className="gba:company-name-wrapper">
          <div className="gba:company-logo">
            {(isEditing && editedData ? editedData.name : companyData.name)?.charAt(0) || ''}
          </div>
          <div style={{ flex: 1 }}>
            {isEditing && editedData ? (
              <>
                <Input
                  value={editedData.name}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px', maxWidth: 350 }}
                  placeholder="Company Name"
                />

                {/* Search field just below name input */}
                <div style={{ margin: '8px 0' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                    <Alert message={searchError} type="error" showIcon style={{ marginTop: 8 }} />
                  )}
                </div>
                <Input
                  value={editedData.industry}
                  onChange={e => handleFieldChange('industry', e.target.value)}
                  style={{ color: 'rgba(0, 0, 0, 0.65)', marginBottom: '8px', maxWidth: 350 }}
                  placeholder="Industry"
                />
                <div style={{ marginTop: 12 }}>
                  <a href={editedData.website || companyData.website || '#'} target="_blank" rel="noopener noreferrer">
                    Website
                  </a>
                  {((editedData.linkedin || companyData.linkedin) && <>
                    {' | '}
                    <a href={editedData.linkedin || companyData.linkedin || '#'} target="_blank" rel="noopener noreferrer">
                      LinkedIn
                    </a>
                  </>)}
                </div>
              </>
            ) : (
              <>
                <Title level={4} className="gba:company-name">{companyData.name}</Title>
                <Text className="gba:company-industry">{companyData.industry}</Text>
              </>
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="gba:edit-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Space>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSave}
                disabled={!hasChanges}
              >
                Save
              </Button>
              <Button 
                icon={<CloseOutlined />} 
                onClick={handleCancel}
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
          >
            Edit Company
          </Button>
        )}
      </div>

      {/* Main content */}
      <Row gutter={[24, 24]}>
        {/* Left column - Company information */}
        <Col span={16}>
          {/* Company overview */}
          <Card className="gba:card-container">
            <div className="gba:section-title">
              <BankOutlined className="gba:section-title-icon" /> 
              Company Overview
            </div>
            <div className="gba:section-title">About</div>
            {isEditing && editedData ? (
              <Input.TextArea
                value={editedData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                rows={4}
                style={{ marginBottom: '16px' }}
              />
            ) : (
              <Paragraph>{companyData.description}</Paragraph>
            )}
            
            <Row gutter={[24, 16]} className="gba:company-info-row">
              <Col span={12}>
                <div className="gba:company-info-label">
                  <CalendarOutlined className="gba:icon-wrapper" />
                  Founded:
                </div>
                <div className="gba:company-info-value">
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
                <div className="gba:company-info-label">
                  <EnvironmentOutlined className="gba:icon-wrapper" />
                  Headquarters:
                </div>
                <div className="gba:company-info-value">
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
            
            <Row gutter={[24, 16]} className="gba:company-info-row">
              <Col span={12}>
                <div className="gba:company-info-label">
                  <TeamOutlined className="gba:icon-wrapper" />
                  Company Size:
                </div>
                <div className="gba:company-info-value">
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
                <div className="gba:company-info-label">
                  <BankOutlined className="gba:icon-wrapper" />
                  Legal Form:
                </div>
                <div className="gba:company-info-value">
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

          {/* Notable Facts Section */}
          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:section-title">
              <CheckCircleOutlined className="gba:section-title-icon" /> 
              Notable Facts
            </div>
            <div className="gba:account-info-value" style={{ whiteSpace: 'pre-line' }}>
              {(isEditing && editedData ? editedData.notableFacts : companyData.notableFacts) || <span style={{ color: '#ccc' }}>No notable facts available.</span>}
            </div>
          </Card>

          {/* Financial metrics */}
          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:section-title">
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

          {/* Key people */}
          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:section-title">
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

        {/* Right column - Contact and account information */}
        <Col span={8}>
          {/* Main contact */}
          <Card className="gba:card-container">
            <div className="gba:section-title">
              <UserOutlined className="gba:section-title-icon" /> 
              Main Contact
            </div>
            <div className="gba:contact-info">
              <div className="gba:contact-name">{companyData.mainContact.name}</div>
              <div className="gba:contact-position">{companyData.mainContact.position}</div>
              
              <a href={`mailto:${companyData.mainContact.email}`} className="gba:contact-link">
                <MailOutlined className="gba:contact-link-icon" />
                {companyData.mainContact.email}
              </a>
              
              <a href={`tel:${companyData.mainContact.phone}`} className="gba:contact-link">
                <PhoneOutlined className="gba:contact-link-icon" />
                {companyData.mainContact.phone}
              </a>
            </div>
          </Card>

          {/* Account information */}
          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:section-title">
              <BankOutlined className="gba:section-title-icon" /> 
              Account Information
            </div>
            
            <div className="gba:account-info-item">
              <div className="gba:account-info-label">Account Owner</div>
              <div className="gba:account-info-value">{companyData.accountOwner.name}</div>
            </div>
            
            <div className="gba:account-info-item">
              <div className="gba:account-info-label">Last Contacted</div>
              <div className="gba:account-info-value">{companyData.lastContacted}</div>
            </div>
          </Card>

          {/* Activity timeline */}
          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:timeline-header">
              <div className="gba:section-title" style={{ margin: 0 }}>
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

          {/* Legal information */}
          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:section-title">
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

          {/* Geographic presence */}
          <Card className="gba:card-container" style={{ marginTop: '24px' }}>
            <div className="gba:section-title">
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
