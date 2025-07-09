import React, { useState, useEffect } from "react";
import { Typography, Row, Col, Spin, message, Form, Input, Select, DatePicker } from 'antd';
import { 
  MailOutlined, 
  PhoneOutlined, 
  FileTextOutlined,
  VideoCameraOutlined, 
  EnvironmentOutlined,
  GlobalOutlined,
  BulbOutlined,
  TeamOutlined,
  CalendarOutlined,
  CaretDownOutlined,
  CommentOutlined,
  BankOutlined,
  UserOutlined,
  StarOutlined,
  TagsOutlined,
  FunnelPlotOutlined,
  EditOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from "../../../../../common/BusinessAppContext";
import { Avatar  } from "../../../overview-screens/LeadsOverview/common/ui/avatar";
import { Button } from "../../../overview-screens/LeadsOverview/common/ui/button";
import { useGraphqlClient } from "../../../../../common/network/graphql/useGraphQLClient";
import { getOpportunityByIdQuery } from "./queries/getOpportunityByIdQuery";
import {getActivityByOpportunityId} from "./queries/getActivityByOpportunityId";

// import EditLead from "./EditLead";
import { useCatalogManagerClient } from "../../../../../common/network/catalogs/useCatalogManagerClient";
import dayjs from 'dayjs';

const { Text } = Typography;

interface Lead {
  id: string;
  version: string;
  contact: {
    id: string;
    version: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
  };
}

interface OpportunityStatus {
  id: string;
  value: string;
  code: string;
}

interface Currency {
  id: string;
  value: string;
  code: string;
}

interface SalesPipeline {
  id: string;
  value: string;
  code: string;
}

interface SalesPipelineStage {
  id: string;
  value: string;
  code: string;
}

interface OwnerEmployee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

interface Account {
  id: string;
  version: string;
  name: string;
  industryRef: string;
  industry: {
    code: string;
    id: string;
    type: string;
    value: string;
  };
  numberOfEmployees: {
    type: string;
    value: string;
    id: string;
    code: string;
  };
  foundationDate: string;
  numberOfEmployeesRef: string;
  addressLine: string;
  annualRevenueRef: string;
  annualRevenue: {
    type: string;
    value: string;
    id: string;
    code: string;
  };
  website: string;
  ownerEmployeeId?: string;
  ownerEmployee?: {
    firstName: string;
    lastName: string;
  };
}

interface OpportunityData {
  id: string;
  version: number;
  name: string;
  notesSummary: string;
  stage:string;
  estimatedAmount: number;
  winningChance: number;
  currencyRef: string;
  currency: Currency;
  account: Account;
  accountId: string;
  numberOfEmployeesRef:string;
  numberOfEmployees:string;
  accountFoundationDate: string;
  industryRef: string;
  industry: {
    value: string;
    type: string;
    id: string;
    code: string;
  };
  accountName:string;
  accountAddress:string;
  accountAnualRevenue:string;
  accountWebsite:string;
  salesPipeline: SalesPipeline;
  salesPipelineStage: SalesPipelineStage;
  opportunityStatus: OpportunityStatus;
  ownerEmployee: OwnerEmployee;
  createdAt: string;
  updatedAt: string;
  expectedClosingDate?: string;
  priority?: string;
  source?: string;
  activityTimeline: OpportunityActivity[];
  lead: Lead;
}

interface OpportunityActivity {
  id: string;
  version: string;
  title: string;
  leadId: string;
  opportunityId: string;
  ownerEmployeeId: string;
  ownerEmployee: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  description: string;
  activityType: {
    code: string;
    id: string;
    type: string;
    value: string;
  };
}

interface OpportunityDetailProps extends BusinessAppContextProps {
  opportunityId: string;
  onBack?: () => void;
}


interface ReferenceData {
  id: string;
  code: string;
  value: string;
}

const OpportunityDetail: React.FC<OpportunityDetailProps> = ({ opportunityId, onBack, accessToken }) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isEditingCompanyInfo, setIsEditingCompanyInfo] = useState<boolean>(false);
  const [isEditingContactInfo, setIsEditingContactInfo] = useState<boolean>(false);
  const [isEditingLeadInfo, setIsEditingLeadInfo] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [leadForm] = Form.useForm();
  const [revenueSizeOptions, setRevenueSizeOptions] = useState<ReferenceData[]>([]);
  const [leadSourceOptions, setLeadSourceOptions] = useState<ReferenceData[]>([]);
  const [leadStatusOptions, setLeadStatusOptions] = useState<ReferenceData[]>([]);
  const [industryOptions, setIndustryOptions] = useState<ReferenceData[]>([]);
  const [numberOfEmployeesOptions, setNumberOfEmployeesOptions] = useState<ReferenceData[]>([]);
  const [countryOptions, setCountryOptions] = useState<ReferenceData[]>([]);
  const [leadRatingOptions, setLeadRatingOptions] = useState<ReferenceData[]>([]);
  const [loadingCatalogData, setLoadingCatalogData] = useState<boolean>(false);
  const [savingCompanyInfo, setSavingCompanyInfo] = useState<boolean>(false);
  const [savingContactInfo, setSavingContactInfo] = useState<boolean>(false);
  const [savingLeadInfo, setSavingLeadInfo] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!!opportunityId);
  const [error, setError] = useState<string | null>(null);

  const [opportunityData, setOpportunityData] = useState<OpportunityData>();
  
  const catalogClient = useCatalogManagerClient(accessToken);
    
  const graphQLClient = useGraphqlClient(accessToken);
  const hardcodedActivities: OpportunityActivity[] = [
    {
      id: "act1",
      version: "1",
      title: "Initial Discovery Call",
      leadId: "",
      opportunityId: opportunityId || "",
      ownerEmployeeId: "",
      ownerEmployee: {
        firstName: "John",
        lastName: "Doe"
      },
      createdAt: "2023-05-01",
      description: "Discussed their current needs and pain points. They're looking to upgrade their CRM system within the next quarter.",
      activityType: {
        code: "MEETING",
        id: "InvestmentActivityType:v1:MEETING",
        type: "activity",
        value: "Meeting"
      }
    },
    {
      id: "act2",
      version: "1",
      title: "Follow-up Email",
      leadId: "",
      opportunityId: opportunityId || "",
      ownerEmployeeId: "",
      ownerEmployee: {
        firstName: "John",
        lastName: "Doe"
      },
      createdAt: "2023-05-03",
      description: "Sent a summary of our discussion and some initial product information.",
      activityType: {
        code: "EMAIL",
        id: "InvestmentActivityType:v1:EMAIL",
        type: "activity",
        value: "Email"
      }
    },
    {
      id: "act3",
      version: "1",
      title: "Technical Requirements Call",
      leadId: "",
      opportunityId: opportunityId || "",
      ownerEmployeeId: "",
      ownerEmployee: {
        firstName: "Sarah",
        lastName: "Lee"
      },
      createdAt: "2023-05-10",
      description: "Deep dive into their technical requirements and integration needs.",
      activityType: {
        code: "CALL",
        id: "InvestmentActivityType:v1:CALL",
        type: "activity",
        value: "Call"
      }
    }
  ];
  
  const hardcodedAiSummary = {
    text: "Acme Corporation is showing strong interest in our enterprise solution. They're currently evaluating our API capabilities against competitors. The technical team was impressed during the demo, but pricing remains a concern for procurement. The CTO (Jane Smith) is our champion, while the Procurement Manager (John Doe) needs more convincing on ROI.",
    insights: [
      "Technical team is impressed with our API capabilities",
      "Pricing is a potential obstacle for procurement",
      "CTO is supportive but needs help convincing Finance team",
      "Competitor X is also being evaluated"
    ],
    recommendations: [
      "Schedule ROI discussion with Procurement Manager",
      "Send case studies from similar technology companies",
      "Prepare custom implementation timeline"
    ]
  };

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await graphQLClient.request(
          getOpportunityByIdQuery,
          {
            id: opportunityId
          }
        );
        
        const activityResult = await graphQLClient.request(
          getActivityByOpportunityId,
          {
            id: opportunityId,
            limit: 20,
            offset: 0
          }
        );
        if (result && result?.Opportunity && result?.Opportunity[0]) {
          const apiData = result?.Opportunity[0];
          const activities: OpportunityActivity[] = 
            (activityResult?.SalesActivity && activityResult.SalesActivity.length > 0) 
              ? activityResult.SalesActivity.map((activity: any) => ({
                  id: activity.id || "",
                  version: activity.version || "1",
                  title: activity.title || "",
                  leadId: activity.leadId || "",
                  opportunityId: activity.opportunityId || opportunityId || "",
                  ownerEmployeeId: activity.ownerEmployeeId || "",
                  ownerEmployee: activity.ownerEmployee ? {
                    firstName: activity.ownerEmployee.firstName || "",
                    lastName: activity.ownerEmployee.lastName || ""
                  } : {
                    firstName: "",
                    lastName: ""
                  },
                  createdAt: activity.createdAt || "",
                  description: activity.description || "",
                  activityType: activity.activityType || {
                    code: activity.type?.toUpperCase() || "NOTE",
                    id: `InvestmentActivityType:v1:${activity.type?.toUpperCase() || "NOTE"}`,
                    type: "activity",
                    value: activity.type ? activity.type.charAt(0).toUpperCase() + activity.type.slice(1) : "Note"
                  }
                }))
              : hardcodedActivities;
          
          const transformedData: OpportunityData = {
            id: apiData.id,
            name: apiData.name,
            version: apiData.version,
            winningChance: apiData.winningChance,
            estimatedAmount: apiData.estimatedAmount,
            currency: apiData?.currency?.value,
            currencyRef: apiData.currencyRef,
            stage: apiData?.stage,
            salesPipelineStage: apiData?.salesPipelineStage,
            numberOfEmployeesRef: apiData?.account?.numberOfEmployeesRef,
            numberOfEmployees: apiData?.account?.numberOfEmployees?.value,
            accountAddress: apiData?.account?.addressLine,
            accountName: apiData?.account?.name,
            accountAnualRevenue: apiData?.account?.annualRevenue,
            accountFoundationDate: apiData?.account?.foundationDate,
            accountWebsite: apiData?.account?.website,
            industry: apiData?.account?.industry?.value,
            industryRef: apiData?.account?.industry?.id,
            opportunityStatus: apiData?.opportunityStatus,
            notesSummary: apiData.notesSummary,
            account: apiData.account,
            accountId: apiData.accountId,
            salesPipeline: apiData?.salesPipeline,
            ownerEmployee: apiData.ownerEmployee,
            createdAt: apiData.createdAt,
            updatedAt: apiData.updatedAt,
            activityTimeline: activities,
            lead: apiData.lead
          };
          setOpportunityData(transformedData);
        } else {
          throw new Error("Opportunity not found");
        }
      } catch (err) {
        console.error("Error fetching opportunity data:", err);
        setError("Failed to load opportunity data. Please try again later.");
        message.error("Failed to load opportunity data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeadData();
  }, [graphQLClient, opportunityId]);

  const [activeTab, setActiveTab] = useState("overview");
  const [activeActivityTab, setActiveActivityTab] = useState("activities");
  
  
  if (loading) {
    return (
      <div className="gba:loading-container" data-testid="lead-loading-container" style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'white',
        padding: '16px 16px 16px 24px'
      }}>
        <Spin size="large" tip="Loading lead data..." />
      </div>
    );
  }
  
  // If there's an error and no lead data, show error state
  if (error && !opportunityData) {
    return (
      <div className="gba:error-container" data-testid="lead-error-container" style={{ 
        padding: '20px',
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '16px 16px 16px 24px'
      }}>
        <h2>Error</h2>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }
  
  // Now we can safely use leadData since it's either from API or fallback
  const lead = opportunityData!;


  const handleCancelCompanyEdit = () => {
    form.resetFields();
    setIsEditingCompanyInfo(false);
  };

  const handleAddContact = () => {
    setIsEditingContactInfo(true);
    
    // Reset contact form
    contactForm.resetFields();
  };


  const handleCancelContactEdit = () => {
    contactForm.resetFields();
    setIsEditingContactInfo(false);
  };

  const fetchRevenueSizeOptions = async () => {
    if (revenueSizeOptions.length === 0) {
      try {
        setLoadingCatalogData(true);
        
        const fetchAllCatalogEntries = async (catalogIdentifier: string, version: string = 'v1') => {
          let allEntries: any[] = [];
          let offset = 0;
          const limit = 100; 
          let hasMore = true;

          while (hasMore) {
            const response = await catalogClient.getCatalogEntriesList({
              catalogIdentifier,
              version
            }, {
              limit,
              offset
            });

            if (response.data && response.data.length > 0) {
              allEntries = [...allEntries, ...response.data];
              offset += limit;
              
              if (response.data.length < limit) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }

          return allEntries
            .map((entry: any) => ({
              id: entry.id,
              code: entry.code,
              value: entry.value
            }))
            .sort((a, b) => a.value.localeCompare(b.value));
        };
        
        const revenueSizeData = await fetchAllCatalogEntries('RevenueSize');
        setRevenueSizeOptions(revenueSizeData);
      } catch (err) {
        console.error('Error fetching catalog data:', err);
        message.error('Failed to load reference data');
      } finally {
        setLoadingCatalogData(false);
      }
    }
  };

  
  const handleCancelLeadInfoEdit = () => {
    leadForm.resetFields();
    setIsEditingLeadInfo(false);
  };

  const fetchCatalogOptions = async (catalogClient: any) => {
    if (revenueSizeOptions.length === 0 || leadSourceOptions.length === 0 || leadStatusOptions.length === 0 || industryOptions.length === 0 || numberOfEmployeesOptions.length === 0 || countryOptions.length === 0 || leadRatingOptions.length === 0) {
      try {
        setLoadingCatalogData(true);
        
        const fetchAllCatalogEntries = async (catalogIdentifier: string, version: string = 'v1') => {
          let allEntries: any[] = [];
          let offset = 0;
          const limit = 100; 
          let hasMore = true;

          while (hasMore) {
            const response = await catalogClient.getCatalogEntriesList({
              catalogIdentifier,
              version
            }, {
              limit,
              offset
            });

            if (response.data && response.data.length > 0) {
              allEntries = [...allEntries, ...response.data];
              offset += limit;
              
              if (response.data.length < limit) {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }

          return allEntries
            .map((entry: any) => ({
              id: entry.id,
              code: entry.code,
              value: entry.value
            }))
            .sort((a, b) => a.value.localeCompare(b.value));
        };
        
        // Fetch revenue size options if not already loaded
        if (revenueSizeOptions.length === 0) {
          const revenueSizeData = await fetchAllCatalogEntries('RevenueSize');
          setRevenueSizeOptions(revenueSizeData);
        }
        
        // Fetch lead source options if not already loaded
        if (leadSourceOptions.length === 0) {
          const leadSourceData = await fetchAllCatalogEntries('LeadSource');
          setLeadSourceOptions(leadSourceData);
        }
        
        // Fetch lead status options if not already loaded
        if (leadStatusOptions.length === 0) {
          const leadStatusData = await fetchAllCatalogEntries('LeadStatus');
          setLeadStatusOptions(leadStatusData);
        }
        
        // Fetch industry options
        if (industryOptions.length === 0) {
          const industryData = await fetchAllCatalogEntries('IndustryClass');
          setIndustryOptions(industryData);
        }
        
        // Fetch employee size options
        if (numberOfEmployeesOptions.length === 0) {
          const employeeSizeData = await fetchAllCatalogEntries('EmployeeSize');
          setNumberOfEmployeesOptions(employeeSizeData);
        }
        
        // Fetch country options
        if (countryOptions.length === 0) {
          const countryData = await fetchAllCatalogEntries('Country');
          setCountryOptions(countryData);
        }
        
        // Fetch lead rating options
        if (leadRatingOptions.length === 0) {
          const leadRatingData = await fetchAllCatalogEntries('SalesLeadRating');
          setLeadRatingOptions(leadRatingData);
        }
      } catch (err) {
        console.error('Error fetching catalog data:', err);
        message.error('Failed to load reference data');
      } finally {
        setLoadingCatalogData(false);
      }
    }
  };

  const CollapsibleCard: React.FC<{
    title: string;
    defaultOpen?: boolean;
    id: string;
    extra?: React.ReactNode;
    style?: React.CSSProperties;
    showArrow?: boolean;
    children: React.ReactNode;
  }> = ({ title, defaultOpen = true, id, extra, style, showArrow = true, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    const panelStyle: React.CSSProperties = {
      marginBottom: 0,
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #f0f0f0',
      overflow: 'hidden',
      ...style
    };

    const headerStyle: React.CSSProperties = {
      padding: '12px 16px',
      fontSize: '16px',
      fontWeight: 500,
      color: '#333333',
      borderBottom: id === "ai-summary-card" && isOpen ? '1px solid #f0f0f0' : 'none'
    };

    const contentStyle: React.CSSProperties = {
      padding: '16px',
      display: isOpen ? 'block' : 'none'
    };

    return (
      <div className={`gba:collapsible-card-${id}`} data-testid={`collapsible-card-${id}`} style={panelStyle}>
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...headerStyle }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>{title}</span>
            {showArrow && (
              <div 
                className="gba:collapse-arrow"
                data-testid={`collapse-arrow-${id}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <CaretDownOutlined
                  style={{ 
                    fontSize: '12px', 
                    marginLeft: '8px',
                    transition: 'transform 0.3s',
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)'
                  }}
                />
              </div>
            )}
          </div>
          {extra}
        </div>
        <div style={contentStyle}>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="gba:opportunity-detail-container"
      data-testid="opportunity-detail-container"
      style={{ 
        backgroundColor: 'white', 
        paddingLeft: '72px',
        paddingRight: '24px',
        paddingTop: '16px',
        paddingBottom: '16px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px', marginTop: '24px', paddingLeft: '0' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          data-testid="back-button"
          onClick={onBack}
        >
          <span style={{ marginLeft: '4px' }}>Back to Opportunities</span>
        </Button>
      </div>

      {/* Opportunity header */}
      <div 
        className="gba:opportunity-header" 
        style={{ 
          marginBottom: '24px', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '20px',
          paddingLeft: '24px'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              backgroundColor: '#f5f5f5', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '20px', 
              color: '#1890ff', 
              fontWeight: 'bold' 
            }}>
              {opportunityData?.name ? opportunityData?.name[0] : 'Unknown'}
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                {opportunityData?.name || 'Unknown'}
              </div>
              <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
                <BulbOutlined style={{ marginRight: '4px' }} />
                <span>{opportunityData?.account?.industry?.value || 'Unknown'}</span>
                <span style={{ margin: '0 8px' }}>•</span>
                <TeamOutlined style={{ marginRight: '4px' }} />
                <span>{opportunityData?.account?.numberOfEmployees?.value || 'Unknown'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              backgroundColor: '#f0f7ff',
              color: '#1677ff',
              padding: '4px 16px',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: 'normal'
            }} data-testid="lead-status-badge">
              {/* {opportunityData?.status || 'Qualified'} */}
            </div>
            
            <Button 
              type="default"
              style={{
                borderColor: '#d9d9d9',
                color: '#000000',
                backgroundColor: 'white',
                height: '36px',
                padding: '0 16px',
                fontWeight: 'normal',
                fontSize: '14px',
                borderRadius: '4px'
              }}
              data-testid="edit-lead-button"
              // onClick={handleUpdateAccount}
            >
              Edit
            </Button>
            
            <Button 
              type="primary"
              style={{
                backgroundColor: '#000000',
                borderColor: '#000000',
                height: '36px',
                padding: '0 16px',
                fontWeight: 'normal',
                fontSize: '14px',
                borderRadius: '4px'
              }}
              data-testid="schedule-meeting-button"
            >
              Schedule Meeting
            </Button>
          </div>
        </div>
      </div>

      <Row gutter={24} className="gba:opportunity-detail-content" style={{ width: '100%', marginTop: '16px', paddingLeft: '0', marginLeft: '0' }}>
        <Col span={12} style={{ paddingLeft: '0' }}>
          <CollapsibleCard
            title="Company Information"
            defaultOpen={true}
            id="company-info-card"
            style={{ 
              marginBottom: '24px',
              paddingLeft: '0'
            }}
            showArrow
          >
            {isEditingCompanyInfo ? (
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  companyName: opportunityData?.accountName || '',
                  addressLine: opportunityData?.accountAddress || '',
                  annualRevenue: opportunityData?.accountAnualRevenue || '',
                  foundationDate: opportunityData?.accountFoundationDate ? dayjs(opportunityData.accountFoundationDate) : undefined,
                  website: opportunityData?.accountWebsite || ''
                }}
                data-testid="company-info-form"
              >
                <Form.Item
                  name="companyName"
                  label="Company Name"
                  data-testid="company-name-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<BankOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
                
                <Form.Item
                  name="addressLine"
                  label="Address"
                  data-testid="address-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<EnvironmentOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>

                <Form.Item
                  name="annualRevenue"
                  label="Annual Revenue"
                  data-testid="revenue-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Select
                    placeholder="Select annual revenue"
                    loading={loadingCatalogData}
                    allowClear
                    style={{ width: '100%' }}
                    data-testid="annual-revenue-select"
                  >
                    {revenueSizeOptions.map(option => (
                      <Select.Option key={option.id} value={option.id}>
                        {option.value}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="foundationDate"
                  label="Foundation Date"
                  data-testid="foundation-date-input"
                  style={{ marginBottom: '16px' }}
                >
                  <DatePicker 
                    style={{ 
                      width: '100%',
                      border: '1px solid #d9d9d9',
                      borderRadius: '2px'
                    }} 
                    format="YYYY-MM-DD"
                    placeholder="Select foundation date"
                    data-testid="foundation-date-picker"
                    suffixIcon={<CalendarOutlined style={{ color: '#8c8c8c' }} />}
                  />
                </Form.Item>

                <Form.Item
                  name="website"
                  label="Website"
                  data-testid="website-input"
                >
                  <Input prefix={<GlobalOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
              </Form>
            ) : (
              lead?.account === null ? (
                <div data-testid="no-company-info" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '16px', color: '#8c8c8c', marginBottom: '12px' }}>
                    Company information does not exist
                  </div>
                  <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                    Click the Add button to create company information
                  </div>
                </div>
              ) : (
                <div data-testid="company-info" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }} data-testid="company-name">
                    <BankOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Company Name</div>
                      <div style={{ fontSize: '16px', color: '#000000' }}>{opportunityData?.account?.name || '---'}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <EnvironmentOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Address</div>
                      <div style={{ fontSize: '16px', color: '#000000' }}>{opportunityData?.account?.addressLine || '---'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <CalendarOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Annual Revenue</div>
                      <div style={{ fontSize: '16px', color: '#000000' }}>{opportunityData?.account?.annualRevenue?.value || '---'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start' }} data-testid="foundation-date">
                    <CalendarOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Foundation Date</div>
                      <div style={{ fontSize: '16px', color: '#000000' }}>{opportunityData?.account?.foundationDate || '---'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <GlobalOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Website</div>
                      {opportunityData?.account?.website ? (
                        <a href={`https://${opportunityData?.account?.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '16px', color: '#1677ff' }}>
                          {opportunityData?.account?.website}
                        </a>
                      ) : (
                        <div style={{ fontSize: '16px', color: '#000000' }}>---</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </CollapsibleCard>
          
          {/* Contacts section */}
          <CollapsibleCard
            title="Contacts"
            defaultOpen={true}
            id="contacts-card"
            extra={isEditingContactInfo ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="primary"
                  size="small"
                  onClick={handleSaveContactInfo}
                  data-testid="save-contact-info-button"
                  loading={savingContactInfo}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  onClick={handleCancelContactEdit}
                  data-testid="cancel-contact-info-button"
                  disabled={savingContactInfo}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                style={{
                  color: '#000000',
                  padding: '0',
                  height: 'auto',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                data-testid="add-contact-button"
                className="gba:add-contact-button"
                onClick={!opportunityData?.lead?.contact || !opportunityData?.lead?.contact?.id ? handleAddContact : handleUpdateContact}
              >
                {!opportunityData?.lead?.contact || !opportunityData?.lead?.contact?.id ? "Add" : "Edit"}
              </Button>
            )}
            style={{ marginBottom: '24px' }}
            showArrow
          >
            {isEditingContactInfo ? (
              <Form
                form={contactForm}
                layout="vertical"
                initialValues={{
                  contactName: opportunityData?.lead?.contact?.firstName + ' ' + opportunityData?.lead?.contact?.lastName || '',
                  contactEmail: opportunityData?.lead?.contact?.email || '',
                  contactPhone: opportunityData?.lead?.contact?.phone || '',
                  contactJobTitle: opportunityData?.lead?.contact?.jobTitle || ''
                }}
                data-testid="contact-info-form"
              >
                <Form.Item
                  name="contactName"
                  label="Full Name"
                  data-testid="contact-name-input"
                  rules={[{ required: true, message: 'Please enter a name' }]}
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<UserOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
                
                <Form.Item
                  name="contactJobTitle"
                  label="Job Title"
                  data-testid="job-title-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<TeamOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
                
                <Form.Item
                  name="contactEmail"
                  label="Email"
                  data-testid="contact-email-input"
                  style={{ marginBottom: '16px' }}
                  rules={[
                    { 
                      type: 'email',
                      message: 'Please enter a valid email'
                    }
                  ]}
                >
                  <Input prefix={<MailOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>

                <Form.Item
                  name="contactPhone"
                  label="Phone"
                  data-testid="contact-phone-input"
                >
                  <Input prefix={<PhoneOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
              </Form>
            ) : (
              opportunityData?.lead?.contact && opportunityData?.lead?.contact?.firstName && opportunityData?.lead?.contact?.lastName ? (
                <div data-testid="contacts-list" className="gba:contacts-list" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div 
                    className="gba:contact-item"
                    data-testid="contact-item"
                    style={{ paddingBottom: '24px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start' }} data-testid="contact-name">
                      <div
                        className="gba:contact-avatar"
                        data-testid="contact-avatar"
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: '#f5f5f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '16px',
                          fontSize: '16px',
                          color: '#666',
                          fontWeight: 'bold',
                        }}
                      >
                        {opportunityData?.lead?.contact?.firstName[0] + opportunityData?.lead?.contact?.lastName[0]}
                      </div>
                      <div className="gba:contact-details" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                          <div 
                            className="gba:contact-name" 
                            data-testid="contact-name" 
                            style={{ fontSize: '16px', fontWeight: '500', marginRight: '8px' }}
                          >
                            {opportunityData?.lead?.contact?.firstName + ' ' + opportunityData?.lead?.contact?.lastName}
                          </div>
                          <span
                            className="gba:contact-primary-badge"
                            data-testid="contact-primary-badge"
                            style={{
                              fontSize: '12px',
                              padding: '2px 8px',
                              backgroundColor: '#1677ff',
                              color: 'white',
                              borderRadius: '10px',
                              fontWeight: 'normal',
                            }}
                          >
                            Primary
                          </span>
                        </div>
                        <div 
                          className="gba:contact-position" 
                          data-testid="contact-position"
                          style={{ color: '#8c8c8c', fontSize: '14px', marginBottom: '12px' }}
                        >
                          {opportunityData?.lead?.contact?.jobTitle}
                        </div>
                        
                        <div 
                          className="gba:contact-email"
                          data-testid="contact-email"
                          style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', color: '#595959' }}
                        >
                          <MailOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#8c8c8c' }} />
                          <div>{opportunityData?.lead?.contact?.email}</div>
                        </div>
                        <div 
                          className="gba:contact-phone"
                          data-testid="contact-phone"
                          style={{ display: 'flex', alignItems: 'center', color: '#595959' }}
                        >
                          <PhoneOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#8c8c8c' }} />
                          <div>{opportunityData?.lead?.contact?.phone}</div>
                        </div>
                      </div>
                    </div>
                    <div className="gba:contact-actions" style={{ display: 'flex', gap: '16px' }}>
                      <Button 
                        className="gba:contact-call-button"
                        data-testid="contact-call-button"
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          height: '40px' 
                        }}
                        icon={<PhoneOutlined />}
                      >
                        Call
                      </Button>
                      <Button 
                        className="gba:contact-email-button"
                        data-testid="contact-email-button"
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          height: '40px' 
                        }}
                        icon={<MailOutlined />}
                      >
                        Email
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div data-testid="no-contact-info" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '16px', color: '#8c8c8c', marginBottom: '12px' }}>
                    Contact information does not exist
                  </div>
                  <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                    Click the Add button to create contact information
                  </div>
                </div>
              )
            )}
          </CollapsibleCard>
          

          <CollapsibleCard
            title="Opportunity Information"
            defaultOpen={true}
            id="lead-info-card"
            style={{ 
              marginBottom: '24px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #f0f0f0',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
            }}
            showArrow
            extra={isEditingLeadInfo ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="primary"
                  size="small"
                  onClick={handleSaveLeadInfo}
                  data-testid="save-lead-info-button"
                  loading={savingLeadInfo}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  onClick={handleCancelLeadInfoEdit}
                  data-testid="cancel-lead-info-button"
                  disabled={savingLeadInfo}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                style={{
                  color: '#000000',
                  padding: '0',
                  height: 'auto',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                data-testid="edit-lead-info-button"
                // onClick={handleUpdateLeadInfo}
              >
                Edit
              </Button>
            )}
          >
            {isEditingLeadInfo ? (
              <Form
                form={leadForm}
                layout="vertical"
                initialValues={{
                  opportunityName: opportunityData?.name || '',
                  winningChance: opportunityData?.winningChance || '',
                  currency: opportunityData?.currencyRef || '',
                  leadStatus: opportunityData?.statusRef || '',
                  leadSource: opportunityData?.sourceRef || '',
                  industry: opportunityData?.industryRef || '',
                  numberOfEmployees: opportunityData?.numberOfEmployeesRef || '',
                  revenue: lead?.annualRevenueRef || '',
                  companyWebsite: lead?.companyWebsite || '',
                  country: lead?.countryRef || '',
                  address: lead?.address || ''
                }}
                data-testid="lead-info-form"
              >
                <Form.Item
                  name="opportunityName"
                  label="Opportunity Name"
                  data-testid="lead-name-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<BankOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
                
                <Form.Item
                  name="winningChance"
                  label="Winning Chance"
                  data-testid="lead-rating-input"
                  style={{ marginBottom: '16px' }}
                >
                </Form.Item>

                <Form.Item
                    name="companyWebsite"
                  label="Company Website"
                  data-testid="company-website-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<GlobalOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>

                <Form.Item
                  name="country"
                  label="Country"
                  data-testid="country-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Select
                    placeholder="Select country"
                    allowClear
                    style={{ width: '100%' }}
                    data-testid="country-select"
                  >
                    {countryOptions.map(option => (
                      <Select.Option key={option.id} value={option.id}>
                        {option.value}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="address"
                  label="Address"
                  data-testid="address-input"
                >
                  <Input prefix={<EnvironmentOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
              </Form>
            ) : (
              <div data-testid="lead-info" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <UserOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}> Name</div>
                    <div style={{ fontSize: '16px', color: '#000000' }}>{opportunityData?.name || '---'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <StarOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Winning chance</div>
                    <div style={{ fontSize: '16px', color: '#000000' }}>{opportunityData?.winningChance || '---'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <FunnelPlotOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Currency</div>
                    <div style={{ fontSize: '16px', color: '#000000' }}>{opportunityData?.currency?.value || '---'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <TagsOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Estimated Amount</div>
                    <div style={{ fontSize: '16px', color: '#000000' }}>{opportunityData?.estimatedAmount || '---'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <BankOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Sales Pipeline</div>
                    <div style={{ fontSize: '16px', color: '#000000' }}>{opportunityData?.salesPipeline?.value || '---'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <BankOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Stage</div>
                    <div style={{ fontSize: '16px', color: '#000000' }}>{opportunityData?.stage || '---'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <BankOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Opportunity Status</div>
                    <div style={{ fontSize: '16px', color: '#000000' }}>{opportunityData?.opportunityStatus?.value || '---'}</div>
                  </div>
                </div>
              </div>
            )}
          </CollapsibleCard>

          {/* Quick Actions section */}
          <CollapsibleCard
            title="Quick Actions"
            defaultOpen={true}
            id="quick-actions-card"
            style={{ marginBottom: '24px' }}
          >
            <div data-testid="quick-actions-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button
                icon={<FileTextOutlined />}
                block
                style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                data-testid="add-note-action"
              >
                Add Note
              </Button>
              <Button
                icon={<PhoneOutlined />}
                block
                style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                data-testid="log-call-action"
              >
                Log Call
              </Button>
              <Button
                icon={<VideoCameraOutlined />}
                block
                style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                data-testid="schedule-meeting-action"
              >
                Schedule Meeting
              </Button>
              <Button
                icon={<MailOutlined />}
                block
                style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                data-testid="send-email-action"
              >
                Send Email
              </Button>
            </div>
          </CollapsibleCard>
          
          {/* Outlook Calendar section */}
          <CollapsibleCard
            title="Outlook Calendar"
            defaultOpen={true}
            id="outlook-calendar-card"
            style={{ marginBottom: '0' }}
          >
            <div data-testid="outlook-calendar" style={{ padding: '8px 0' }}>
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px' }}>
                No upcoming meetings
              </Text>
            </div>
          </CollapsibleCard>
        </Col>
        
        {/* Right Column */}
        <Col span={12} style={{ paddingLeft: '0' }}>
          {/* Contact Information section */}
          <CollapsibleCard
            title="Contact Information"
            defaultOpen={true}
            id="contact-info-card"
            style={{ 
              marginBottom: '24px',
              paddingLeft: '0'
            }}
            showArrow
          >
            {isEditingContactInfo ? (
              <Form
                form={contactForm}
                layout="vertical"
                initialValues={{
                  contactName: opportunityData?.lead?.contact?.firstName + ' ' + opportunityData?.lead?.contact?.lastName || '',
                  contactEmail: opportunityData?.lead?.contact?.email || '',
                  contactPhone: opportunityData?.lead?.contact?.phone || '',
                  contactJobTitle: opportunityData?.lead?.contact?.jobTitle || ''
                }}
                data-testid="contact-info-form"
              >
                <Form.Item
                  name="contactName"
                  label="Full Name"
                  data-testid="contact-name-input"
                  rules={[{ required: true, message: 'Please enter a name' }]}
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<UserOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
                
                <Form.Item
                  name="contactJobTitle"
                  label="Job Title"
                  data-testid="job-title-input"
                  style={{ marginBottom: '16px' }}
                >
                  <Input prefix={<TeamOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
                
                <Form.Item
                  name="contactEmail"
                  label="Email"
                  data-testid="contact-email-input"
                  style={{ marginBottom: '16px' }}
                  rules={[
                    { 
                      type: 'email',
                      message: 'Please enter a valid email'
                    }
                  ]}
                >
                  <Input prefix={<MailOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>

                <Form.Item
                  name="contactPhone"
                  label="Phone"
                  data-testid="contact-phone-input"
                >
                  <Input prefix={<PhoneOutlined style={{ color: '#8c8c8c' }} />} />
                </Form.Item>
              </Form>
            ) : (
              opportunityData?.lead?.contact && opportunityData?.lead?.contact?.firstName && opportunityData?.lead?.contact?.lastName ? (
                <div data-testid="contacts-list" className="gba:contacts-list" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div 
                    className="gba:contact-item"
                    data-testid="contact-item"
                    style={{ paddingBottom: '24px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start' }} data-testid="contact-name">
                      <div
                        className="gba:contact-avatar"
                        data-testid="contact-avatar"
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: '#f5f5f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '16px',
                          fontSize: '16px',
                          color: '#666',
                          fontWeight: 'bold',
                        }}
                      >
                        {opportunityData?.lead?.contact?.firstName[0] + opportunityData?.lead?.contact?.lastName[0]}
                      </div>
                      <div className="gba:contact-details" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                          <div 
                            className="gba:contact-name" 
                            data-testid="contact-name" 
                            style={{ fontSize: '16px', fontWeight: '500', marginRight: '8px' }}
                          >
                            {opportunityData?.lead?.contact?.firstName + ' ' + opportunityData?.lead?.contact?.lastName}
                          </div>
                          <span
                            className="gba:contact-primary-badge"
                            data-testid="contact-primary-badge"
                            style={{
                              fontSize: '12px',
                              padding: '2px 8px',
                              backgroundColor: '#1677ff',
                              color: 'white',
                              borderRadius: '10px',
                              fontWeight: 'normal',
                            }}
                          >
                            Primary
                          </span>
                        </div>
                        <div 
                          className="gba:contact-position" 
                          data-testid="contact-position"
                          style={{ color: '#8c8c8c', fontSize: '14px', marginBottom: '12px' }}
                        >
                          {opportunityData?.lead?.contact?.jobTitle}
                        </div>
                        
                        <div 
                          className="gba:contact-email"
                          data-testid="contact-email"
                          style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', color: '#595959' }}
                        >
                          <MailOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#8c8c8c' }} />
                          <div>{opportunityData?.lead?.contact?.email}</div>
                        </div>
                        <div 
                          className="gba:contact-phone"
                          data-testid="contact-phone"
                          style={{ display: 'flex', alignItems: 'center', color: '#595959' }}
                        >
                          <PhoneOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#8c8c8c' }} />
                          <div>{opportunityData?.lead?.contact?.phone}</div>
                        </div>
                      </div>
                    </div>
                    <div className="gba:contact-actions" style={{ display: 'flex', gap: '16px' }}>
                      <Button 
                        className="gba:contact-call-button"
                        data-testid="contact-call-button"
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          height: '40px' 
                        }}
                        icon={<PhoneOutlined />}
                      >
                        Call
                      </Button>
                      <Button 
                        className="gba:contact-email-button"
                        data-testid="contact-email-button"
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          height: '40px' 
                        }}
                        icon={<MailOutlined />}
                      >
                        Email
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div data-testid="no-contact-info" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '16px', color: '#8c8c8c', marginBottom: '12px' }}>
                    Contact information does not exist
                  </div>
                  <div style={{ fontSize: '14px', color: '#8c8c8c' }}>
                    Click the Add button to create contact information
                  </div>
                </div>
              )
            )}
          </CollapsibleCard>

          {/* AI Summary */}
          <CollapsibleCard
            title="AI Summary"
            defaultOpen={true}
            id="ai-summary-card"
            extra={
              <Button 
                type="text" 
                style={{ color: '#1677ff', padding: '0', height: 'auto', fontSize: '14px' }}
                data-testid="refresh-ai-summary"
              >
                Refresh
              </Button>
            }
            style={{ 
              marginBottom: '24px',
              backgroundColor: '#f0f7ff'
            }}
          >
            <div data-testid="ai-summary" style={{ padding: '0' }}>
              <div style={{ marginBottom: '20px', color: '#595959', lineHeight: '1.5' }}>
                {hardcodedAiSummary.text}
              </div>
              
              <div style={{ display: 'flex', gap: '48px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '500', 
                    marginBottom: '16px', 
                    color: '#1677ff' 
                  }}>
                    Key Insights
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {hardcodedAiSummary.insights.map((insight, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div style={{ 
                          color: '#1677ff', 
                          marginRight: '8px', 
                          fontSize: '18px', 
                          lineHeight: '1.2' 
                        }}>•</div>
                        <div style={{ fontSize: '14px', color: '#595959', lineHeight: '1.5' }}>{insight}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '500', 
                    marginBottom: '16px', 
                    color: '#1677ff' 
                  }}>
                    Recommended Next Steps
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {hardcodedAiSummary.recommendations.map((recommendation, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div style={{ 
                          color: '#1677ff', 
                          marginRight: '8px', 
                          fontSize: '18px', 
                          lineHeight: '1.2' 
                        }}>•</div>
                        <div style={{ fontSize: '14px', color: '#595959', lineHeight: '1.5' }}>{recommendation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{ 
                fontSize: '12px', 
                color: '#8c8c8c', 
                textAlign: 'left',
                borderTop: '1px solid #e8e8e8',
                paddingTop: '12px'
              }}>
                Last updated: May 21, 2023, 8:30 AM
              </div>
            </div>
          </CollapsibleCard>

          {/* Activity Timeline section */}
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #f0f0f0',
              overflow: 'hidden',
              marginBottom: '24px'
            }}
          >
            {/* Tabs */}
            <div 
              className="gba:activity-tabs" 
              data-testid="activity-tabs"
              style={{
                display: 'flex',
                backgroundColor: '#f0f7ff',
                borderRadius: '8px 8px 0 0'
              }}
            >
              <div 
                className={`gba:activity-tab${activeActivityTab === 'activities' ? '-active' : ''}`}
                data-testid="activities-tab"
                style={{
                  padding: '12px 24px',
                  fontWeight: '500',
                  color: activeActivityTab === 'activities' ? '#1890ff' : '#8c8c8c',
                  backgroundColor: activeActivityTab === 'activities' ? 'white' : 'transparent',
                  flex: 1,
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveActivityTab('activities')}
              >
                Activities
              </div>
              <div 
                className={`gba:activity-tab${activeActivityTab === 'notes' ? '-active' : ''}`}
                data-testid="notes-tab"
                style={{
                  padding: '12px 24px',
                  fontWeight: '500',
                  color: activeActivityTab === 'notes' ? '#1890ff' : '#8c8c8c',
                  backgroundColor: activeActivityTab === 'notes' ? 'white' : 'transparent',
                  flex: 1,
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveActivityTab('notes')}
              >
                Notes
              </div>
              <div 
                className={`gba:activity-tab${activeActivityTab === 'documents' ? '-active' : ''}`}
                data-testid="documents-tab"
                style={{
                  padding: '12px 24px',
                  fontWeight: '500',
                  color: activeActivityTab === 'documents' ? '#1890ff' : '#8c8c8c',
                  backgroundColor: activeActivityTab === 'documents' ? 'white' : 'transparent',
                  flex: 1,
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveActivityTab('documents')}
              >
                Documents
              </div>
            </div>

            {/* Activities content */}
            {activeActivityTab === 'activities' && (
            <div className="gba:activity-content" data-testid="activity-content">
              {/* Activity Timeline Header */}
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px'
                }}
              >
                <div 
                  className="gba:activity-timeline-title" 
                  data-testid="activity-timeline-title"
                  style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  Activity Timeline
                  <CaretDownOutlined 
                    style={{ 
                      marginLeft: '8px',
                      fontSize: '12px'
                    }} 
                  />
                </div>
                <Button
                  type="primary"
                  data-testid="add-activity-button"
                  className="gba:add-activity-button"
                  style={{
                    backgroundColor: '#000000',
                    borderColor: '#000000',
                    fontWeight: '500',
                    height: '36px',
                    borderRadius: '4px'
                  }}
                >
                  Add Activity
                </Button>
              </div>

              {/* Activity Timeline Items */}
              <div style={{ padding: '0 24px', position: 'relative' }}>
                {opportunityData?.activityTimeline?.map((activity, index) => {
                  // Determine icon based on activity type
                  const getActivityIcon = () => {
                    const type = activity.activityType?.code?.toUpperCase();
                    switch (type) {
                      case 'CALL':
                        return (
                          <PhoneOutlined style={{ 
                            fontSize: '16px', 
                            padding: '8px', 
                            borderRadius: '50%', 
                            border: '1px solid #f0f0f0',
                            backgroundColor: '#fff'
                          }} />
                        );
                      case 'EMAIL':
                        return (
                          <MailOutlined style={{ 
                            fontSize: '16px', 
                            padding: '8px', 
                            borderRadius: '50%', 
                            border: '1px solid #f0f0f0',
                            backgroundColor: '#fff'
                          }} />
                        );
                      case 'MEETING':
                        return (
                          <VideoCameraOutlined style={{ 
                            fontSize: '16px', 
                            padding: '8px', 
                            borderRadius: '50%', 
                            border: '1px solid #f0f0f0',
                            backgroundColor: '#fff'
                          }} />
                        );
                      default:
                        return (
                          <CommentOutlined style={{ 
                            fontSize: '16px', 
                            padding: '8px', 
                            borderRadius: '50%', 
                            border: '1px solid #f0f0f0',
                            backgroundColor: '#fff'
                          }} />
                        );
                    }
                  };

                  // Format date and time
                  const formattedDate = activity.createdAt 
                    ? dayjs(activity.createdAt).format('MMM D, YYYY, h:mm A') 
                    : '';
                  
                  // Get owner initials for avatar
                  const ownerInitials = activity.ownerEmployee 
                    ? `${activity.ownerEmployee.firstName?.[0] || ''}${activity.ownerEmployee.lastName?.[0] || ''}`
                    : '';
                  
                  // Get owner full name
                  const ownerName = activity.ownerEmployee
                    ? `${activity.ownerEmployee.firstName || ''} ${activity.ownerEmployee.lastName || ''}`.trim()
                    : '';
                  
                  return (
                    <div 
                      key={activity.id}
                      className="gba:activity-item" 
                      data-testid={`activity-item-${index + 1}`}
                      style={{ 
                        padding: '24px 0', 
                        position: 'relative'
                      }}
                    >
                      <div 
                        className="gba:activity-icon" 
                        style={{
                          position: 'absolute',
                          left: '0',
                          top: '24px',
                          zIndex: 2
                        }}
                      >
                        {getActivityIcon()}
                      </div>

                      <div style={{ marginLeft: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div 
                            className="gba:activity-title"
                            data-testid={`activity-title-${index + 1}`}
                            style={{ 
                              fontWeight: '600', 
                              fontSize: '16px' 
                            }}
                          >
                            {activity.title}
                          </div>
                          <div 
                            className="gba:activity-time"
                            data-testid={`activity-time-${index + 1}`}
                            style={{ 
                              color: '#8c8c8c', 
                              fontSize: '14px' 
                            }}
                          >
                            {formattedDate}
                          </div>
                        </div>

                        {activity.description && (
                          <div 
                            className="gba:activity-description"
                            data-testid={`activity-description-${index + 1}`}
                            style={{ 
                              marginBottom: '12px',
                              fontSize: '14px',
                              color: '#595959'
                            }}
                          >
                            {activity.description}
                          </div>
                        )}

                        <div 
                          className="gba:activity-owner"
                          style={{
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Avatar 
                            style={{ 
                              backgroundColor: ['#1890ff', '#f5f5f5', '#722ed1', '#52c41a', '#faad14'][index % 5],
                              color: index % 5 === 1 ? '#595959' : '#fff',
                              marginRight: '8px',
                              fontSize: '12px',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}
                            size={24}
                          >
                            {ownerInitials || '--'}
                          </Avatar>
                          <span style={{ fontSize: '14px', color: '#595959' }}>{ownerName || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {/* Notes content */}
            {activeActivityTab === 'notes' && (
            <div className="gba:notes-content" data-testid="notes-content">
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div 
                    className="gba:notes-title" 
                    data-testid="notes-title"
                    style={{
                      fontWeight: '600',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    Notes
                    <CaretDownOutlined 
                      style={{ 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }} 
                    />
                  </div>
                  <Button
                    type="primary"
                    data-testid="add-note-button"
                    className="gba:add-note-button"
                    style={{
                      backgroundColor: '#000000',
                      borderColor: '#000000',
                      fontWeight: '500',
                      height: '36px',
                      borderRadius: '4px'
                    }}
                  >
                    Add Note
                  </Button>
                </div>
                <div style={{ color: '#8c8c8c', textAlign: 'left' }}>
                  No notes have been added yet.
                </div>
              </div>
            </div>
            )}

            {/* Documents content */}
            {activeActivityTab === 'documents' && (
            <div className="gba:documents-content" data-testid="documents-content">
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div 
                    className="gba:documents-title" 
                    data-testid="documents-title"
                    style={{
                      fontWeight: '600',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    Documents
                    <CaretDownOutlined 
                      style={{ 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }} 
                    />
                  </div>
                  <Button
                    type="primary"
                    data-testid="upload-document-button"
                    className="gba:upload-document-button"
                    style={{
                      backgroundColor: '#000000',
                      borderColor: '#000000',
                      fontWeight: '500',
                      height: '36px',
                      borderRadius: '4px'
                    }}
                  >
                    Upload
                  </Button>
                </div>
                <div style={{ color: '#8c8c8c', textAlign: 'left' }}>
                  No documents have been uploaded yet.
                </div>
              </div>
            </div>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default OpportunityDetail;