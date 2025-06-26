import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Row,
  Col,
  Card,
  Timeline,
  Tag,
  Input,
  Spin,
  message,
  Form,
  Tabs,
  Alert,
  Select,
  Space,
  Avatar
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
} from "../../overview-screens/CompanyOverview/graphql/company-queries";
import { GET_SALES_ACTIVITIES, SalesActivityResponse } from './queries/salesActivityQueries';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

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
  id?: string;
  version?: number;
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
  numberOfEmployeesRef: '',
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
  const [activityModalVisible, setActivityModalVisible] = useState<boolean>(false);
  console.log('Initial modal state:', activityModalVisible);
  const [activityForm] = Form.useForm();
  const [addingActivity, setAddingActivity] = useState<boolean>(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  const graphQLClient = useGraphqlClient(accessToken);

  const fetchActivities = async (accountId: string) => {
    try {
      const result = await graphQLClient.request<SalesActivityResponse>(
        GET_SALES_ACTIVITIES,
        { accountId }
      );

      if (result && result.SalesActivity) {
        const formattedActivities = result.SalesActivity.map(activity => ({
          id: activity.id,
          version: activity.version,
          title: activity.title,
          date: new Date(activity.createdAt).toLocaleString(getCurrentActiveUserLocale(), {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          description: activity.description
        }));
        setActivities(formattedActivities);
      }
    } catch (error) {
      console.error('Failed to fetch sales activities:', error);
      message.error('Failed to fetch sales activities');
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
          
          // Fetch activities with the ID from the API response directly
          if (apiData.id) {
            fetchActivities(apiData.id);
          }
          
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

      // Fetch activities if we have a company ID
      if (companyData?.id) {
        fetchActivities(companyData.id);
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
    console.log('Add Activity button clicked');
    // Simple workaround until modal issues are resolved
    let title = '';
    let description = '';
    
    // Create a temporary div to host our inputs
    const inputContainer = document.createElement('div');
    inputContainer.style.position = 'fixed';
    inputContainer.style.top = '50%';
    inputContainer.style.left = '50%';
    inputContainer.style.transform = 'translate(-50%, -50%)';
    inputContainer.style.backgroundColor = 'white';
    inputContainer.style.padding = '20px';
    inputContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    inputContainer.style.zIndex = '10000';
    inputContainer.style.borderRadius = '8px';
    inputContainer.style.width = '400px';
    inputContainer.style.maxWidth = '90vw';
    
    // Add a heading
    const heading = document.createElement('h2');
    heading.textContent = 'Add Activity';
    heading.style.marginBottom = '16px';
    inputContainer.appendChild(heading);
    
    // Add the title input
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title:';
    titleLabel.style.display = 'block';
    titleLabel.style.marginBottom = '8px';
    inputContainer.appendChild(titleLabel);
    
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.style.width = '100%';
    titleInput.style.padding = '8px';
    titleInput.style.marginBottom = '16px';
    titleInput.style.borderRadius = '4px';
    titleInput.style.border = '1px solid #d9d9d9';
    inputContainer.appendChild(titleInput);
    
    // Add the description input
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Description:';
    descLabel.style.display = 'block';
    descLabel.style.marginBottom = '8px';
    inputContainer.appendChild(descLabel);
    
    const descInput = document.createElement('textarea');
    descInput.style.width = '100%';
    descInput.style.padding = '8px';
    descInput.style.marginBottom = '16px';
    descInput.style.borderRadius = '4px';
    descInput.style.border = '1px solid #d9d9d9';
    descInput.style.minHeight = '100px';
    inputContainer.appendChild(descInput);
    
    // Add buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '8px';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.backgroundColor = '#f5f5f5';
    cancelBtn.style.border = '1px solid #d9d9d9';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.onclick = () => {
      document.body.removeChild(inputContainer);
      document.body.removeChild(overlay);
    };
    buttonContainer.appendChild(cancelBtn);
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.padding = '8px 16px';
    saveBtn.style.backgroundColor = '#1890ff';
    saveBtn.style.color = 'white';
    saveBtn.style.border = '1px solid #1890ff';
    saveBtn.style.borderRadius = '4px';
    saveBtn.style.cursor = 'pointer';
    saveBtn.onclick = () => {
      title = titleInput.value;
      description = descInput.value;
      
      if (!title || !description) {
        message.error('Please enter both title and description');
        return;
      }
      
      // Submit activity with form values
      submitActivity(title, description);
      
      // Clean up
      document.body.removeChild(inputContainer);
      document.body.removeChild(overlay);
    };
    buttonContainer.appendChild(saveBtn);
    
    inputContainer.appendChild(buttonContainer);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '9999';
    
    // Add to document
    document.body.appendChild(overlay);
    document.body.appendChild(inputContainer);
    
    // Focus on title input
    titleInput.focus();
  };
  
  // Helper function to submit activity
  const submitActivity = async (title: string, description: string) => {
    try {
      setAddingActivity(true);
      
      const payload = {
        changeMode: "INSERT",
        salesActivity: {
          title: title,
          description: description,
          account: companyData.id,
        }
      };

      // Use native fetch for the POST request
      await fetch(
        'https://newwork-dev.newwork.com/processes/customer-relations/saveSalesActivity',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );
      
      message.success('Activity added successfully');
      
      // Add the activity to the state so it shows immediately
      const newActivity = {
        id: `temp-${Date.now()}`,
        title: title,
        date: new Date().toLocaleString(getCurrentActiveUserLocale(), {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        description: description
      };
      
      setActivities([newActivity, ...activities]);
      
      // Refetch activities to get the proper ID and data
      if (companyData.id) {
        fetchActivities(companyData.id);
      }
    } catch (error) {
      console.error('Failed to add activity:', error);
      message.error('Failed to add activity');
    } finally {
      setAddingActivity(false);
    }
  };

  const handleActivitySubmit = async () => {
    try {
      const values = await activityForm.validateFields();
      setAddingActivity(true);
      
      const payload = {
        changeMode: "INSERT",
        salesActivity: {
          title: values.title,
          description: values.description,
          account: companyData.id,
        }
      };

      const response = await fetch(
        'https://newwork-dev.newwork.com/processes/customer-relations/saveSalesActivity',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );
      
      const responseText = await response.text();
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { message: responseText };
      }

      if (response.ok) {
        message.success('Activity added successfully');
        setActivityModalVisible(false);
        // Refresh activities list
        if (companyData.id) {
          fetchActivities(companyData.id);
        }
      } else {
        throw new Error(responseData.message || 'Failed to add activity');
      }
    } catch (error) {
      console.error('Failed to add activity:', error);
      message.error('Failed to add activity');
    } finally {
      setAddingActivity(false);
    }
  };

  const handleActivityCancel = () => {
    setActivityModalVisible(false);
    activityForm.resetFields();
  };

  // Handle deletion of an activity
  const handleDeleteActivity = async (activity: Activity) => {
    // Debug what properties we have on the activity
    console.log('Activity to delete:', JSON.stringify(activity));
  
    
    try {
      message.loading({ content: 'Deleting activity...', key: 'deleteActivity' });
      console.log(activity.id, activity.version)
      const response = await fetch('https://newwork-dev.newwork.com/processes/customer-relations/saveSalesActivity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          changeMode: "DELETE",
          salesActivity: {
            id: activity.id,
            version: activity.version,
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to delete activity: ${errorData}`);
      }
      
      // On success, remove the activity from our local state
      setActivities(prevActivities => {
        return prevActivities.filter(a => a.id !== activity.id);
      });
      
      message.success({ content: 'Activity deleted successfully', key: 'deleteActivity' });
    } catch (error) {
      console.error('Error deleting activity:', error);
      message.error({ 
        content: 'Failed to delete activity: ' + (error instanceof Error ? error.message : String(error)), 
        key: 'deleteActivity' 
      });
    }
  };

  return (
    <div className="gba:company-detail-container" style={{ 
      padding: '24px', 
      backgroundColor: '#ffffff', 
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}
    data-testid="company-detail-container">
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
        style={{ 
          marginBottom: '20px'
        }}
      >
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          className="gba:company-detail-back-button"
          data-testid="back-to-companies-btn"
        >
          Back to Companies
        </Button>
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
                    {activities.length > 0 ? (
                      activities.map((activity, index) => (
                        <Timeline.Item key={activity.id || index} color="blue">
                          <div style={{ position: 'relative' }}>
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
                            {activity.id && (
                              <Button 
                                type="text" 
                                icon={<CloseOutlined />} 
                                size="small"
                                style={{ 
                                  position: 'absolute', 
                                  right: 0, 
                                  top: 0,
                                  padding: '4px',
                                  lineHeight: 1
                                }}
                                onClick={() => handleDeleteActivity(activity)}
                                data-testid={`delete-activity-${activity.id}`}
                              />
                            )}
                          </div>
                        </Timeline.Item>
                      ))
                    ) : (
                      <Timeline.Item>
                        <Text type="secondary">No activities found</Text>
                      </Timeline.Item>
                    )}
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
      
      {/* Custom modal implementation that doesn't rely on Ant Design Modal */}
      {activityModalVisible && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={handleActivityCancel}
          data-testid="custom-modal-backdrop"
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              width: '500px',
              maxWidth: '90%',
              padding: '0',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="custom-modal-content"
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>Add Activity</h3>
              <Button 
                type="text" 
                icon={<CloseOutlined />} 
                onClick={handleActivityCancel}
                style={{ padding: '4px' }}
              />
            </div>
            
            {/* Modal Body */}
            <div style={{ padding: '20px 24px', maxHeight: '70vh', overflow: 'auto' }}>
              <Form
                form={activityForm}
                layout="vertical"
                data-testid="add-activity-form"
                name="activityForm"
              >
                <Form.Item
                  name="title"
                  label="Title"
                  rules={[{ required: true, message: 'Please enter a title' }]}
                >
                  <Input placeholder="Activity title" />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="Description"
                  rules={[{ required: true, message: 'Please enter a description' }]}
                >
                  <Input.TextArea rows={4} placeholder="Activity description" />
                </Form.Item>
              </Form>
            </div>
            
            {/* Modal Footer */}
            <div style={{
              padding: '10px 24px',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <Button onClick={handleActivityCancel}>Cancel</Button>
              <Button 
                type="primary" 
                onClick={handleActivitySubmit}
                loading={addingActivity}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDetail;
