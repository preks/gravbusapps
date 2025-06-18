import React, { useState, useEffect } from "react";
import { Typography, Row, Col, Space, Divider, Spin, message } from 'antd';
import { 
  MailOutlined, 
  PhoneOutlined, 
  BankOutlined, 
  DollarOutlined,
  UserOutlined, 
  FileTextOutlined,
  MessageOutlined, 
  VideoCameraOutlined, 
  EditOutlined,
  PlusCircleOutlined,
  BarChartOutlined,
  ArrowLeftOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  UserAddOutlined,
  BulbOutlined,
  TeamOutlined,
  MenuOutlined,
  CalendarOutlined,
  CaretDownOutlined,
  CommentOutlined
} from '@ant-design/icons';
import { BusinessAppContextProps } from "../../../../common/BusinessAppContext";
import { Avatar, AvatarFallback, AvatarImage } from "./common/ui/avatar";
import { Badge } from "./common/ui/badge";
import { Button } from "./common/ui/button";
import { Card, CardHeader } from "./common/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./common/ui/tabs";
import { Progress } from "./common/ui/progress";
import { LeadActivityTimeline } from "./components/lead-activity-timeline";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./common/ui/dropdown-menu";
import { CollapsibleCard } from "./common/ui/collapsible-card";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsHelp } from "./components/keyboard-shortcuts-help";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./common/ui/tooltip";
import { useGraphqlClient } from "../../../../common/network/graphql/useGraphQLClient";
import { GET_LEAD_BY_ID, GetLeadByIdResponse } from "./queries/getLeadById";
import EditLead from "./EditLead";

const { Title, Text } = Typography;

interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  title: string;
  date: string;
  user: {
    name: string;
    avatar?: string;
  };
  description?: string;
}

// Define opportunity type
interface Opportunity {
  id: string;
  name: string;
  value: number;
  stage: "Discovery" | "Proposal" | "Negotiation" | "Closed Won" | "Closed Lost";
  probability: number;
  expectedCloseDate: string;
  owner: string;
  stageColor: string;
}

interface Contact {
  email: string;
  name: string;
  phone: string;
  pictureUrl: string;
  jobTitle:string;
}

interface Lead {
  id: string;
  name: string;
  logo?: string;
  status: string;
  version: string;
  statusRef?: string;
  industryRef?: string;
  industry: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  country?: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  countryRef?: string;
  numberOfEmployeesRef?: string;
  numberOfEmployees?: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  companyWebsite: string;
  address: string;
  revenue: string;
  annualRevenueRef?: string;
  annualRevenue?: {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  regionRef?: string;
  legalForm?: string | {
    value?: string;
    type?: string;
    id?: string;
    code?: string;
  };
  legalFormRef?: string;
  contact: Contact;
  activities: Activity[];
  opportunities: Opportunity[];
  aiSummary: {
    text: string;
    insights: string[];
    recommendations: string[];
  };
}

const LeadOpportunityInvestment: React.FC<BusinessAppContextProps> = (props) => {
  const leadId = "e239bbd1-59d4-4647-abc2-f14b89de8c5a"
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [leadData, setLeadData] = useState<Lead | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  const graphQLClient = useGraphqlClient(props.accessToken);
  
  const hardcodedActivities: Activity[] = [
    {
      id: "act1",
      type: "meeting",
      title: "Initial Discovery Call",
      date: "2023-05-01",
      user: {
        name: "John Doe",
      },
      description: "Discussed their current needs and pain points. They're looking to upgrade their CRM system within the next quarter.",
    },
    {
      id: "act2",
      type: "email",
      title: "Follow-up Email",
      date: "2023-05-03",
      user: {
        name: "John Doe",
      },
      description: "Sent a summary of our discussion and some initial product information.",
    },
    {
      id: "act3",
      type: "call",
      title: "Technical Requirements Call",
      date: "2023-05-10",
      user: {
        name: "Sarah Lee",
      },
      description: "Deep dive into their technical requirements and integration needs.",
    },
  ];
  
  const hardcodedOpportunities: Opportunity[] = [
    {
      id: "1",
      name: "IT Infrastructure Upgrade - Finance Department",
      value: 75000,
      stage: "Proposal",
      stageColor: "#1890ff",
      probability: 60,
      expectedCloseDate: "2023-07-15",
      owner: "John Doe"
    },
    {
      id: "2",
      name: "CRM Implementation - Sales Team",
      value: 45000,
      stage: "Discovery",
      stageColor: "#52c41a",
      probability: 30,
      expectedCloseDate: "2023-08-30",
      owner: "Sarah Lee"
    },
    {
      id: "3",
      name: "Cloud Migration Project",
      value: 120000,
      stage: "Negotiation",
      stageColor: "#722ed1",
      probability: 75,
      expectedCloseDate: "2023-06-30",
      owner: "John Doe"
    },
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
        
        const result = await graphQLClient.request<GetLeadByIdResponse>(
          GET_LEAD_BY_ID,
          {
            id: leadId
          }
        );
        if (result && result.Lead && result.Lead[0]) {
          const apiData = result.Lead[0];
          const transformedData: Lead = {
            id: apiData.id,
            name: apiData.companyName || `${apiData.firstName} ${apiData.lastName}`,
            version: apiData.version,
            status: apiData.status?.value || "New",
            statusRef: apiData.statusRef,
            industry: {
              value: apiData.industry?.value || "",
              type: apiData.industry?.type || "",
              id: apiData.industry?.id || "",
              code: apiData.industry?.code || ""
            },
            country: {
              value: apiData.country?.value || "",
              type: apiData.country?.type || "",
              id: apiData.country?.id || "",
              code: apiData.country?.code || ""
            },
            countryRef: apiData.countryRef,
            industryRef: apiData.industryRef,
            numberOfEmployees: {
              value: apiData.numberOfEmployees?.value || "",
              type: apiData.numberOfEmployees?.type || "",
              id: apiData.numberOfEmployees?.id || "",
              code: apiData.numberOfEmployees?.code || ""
            },
            numberOfEmployeesRef: apiData.numberOfEmployeesRef,
            companyWebsite: apiData.companyWebsite,
            address: [
              apiData.city, 
              apiData.postalCode, 
              apiData.country?.value
            ].filter(Boolean).join(", "),
            revenue: apiData.annualRevenue?.value || "",
            annualRevenueRef: apiData.annualRevenueRef,
            annualRevenue: {
              value: apiData.annualRevenue?.value || "",
              type: apiData.annualRevenue?.type || "",
              id: apiData.annualRevenue?.id || "",
              code: apiData.annualRevenue?.code || ""
            },
            regionRef: apiData.regionRef,
            legalForm: apiData.legalForm?.value || "",
            legalFormRef: apiData.legalFormRef,
            
            contact: apiData.contact ? 
              {
                name: `${apiData.contact.firstName || ''} ${apiData.contact.lastName || ''}`.trim(),
                email: apiData.contact.email || "",
                phone: apiData.contact.phone || "",
                jobTitle: apiData.contact.jobTitle || "",
                pictureUrl: apiData.contact.pictureUrl || ""
              } : 
              {
                name: "",
                email: "",
                phone: "",
                jobTitle: "",
                pictureUrl: ""
              },
            activities: hardcodedActivities,
            opportunities: hardcodedOpportunities,
            aiSummary: hardcodedAiSummary
          };
          
          setLeadData(transformedData);
        } else {
          throw new Error("Lead not found");
        }
      } catch (err) {
        console.error("Error fetching lead data:", err);
        setError("Failed to load lead data. Please try again later.");
        message.error("Failed to load lead data");
        
        setLeadData({
          id: leadData?.id || "",
          version: leadData?.version || "",
          name: leadData?.name || "",
          status: leadData?.status || "",
          statusRef: leadData?.statusRef || "",
          industry: {
            value: leadData?.industry?.value || "",
            type: leadData?.industry?.type || "",
            id: leadData?.industry?.id || "",
            code: leadData?.industry?.code || ""
          },
          industryRef: leadData?.industryRef || "",
          numberOfEmployees: {
            value: leadData?.numberOfEmployees?.value || "",
            type: leadData?.numberOfEmployees?.type || "",
            id: leadData?.numberOfEmployees?.id || "",
            code: leadData?.numberOfEmployees?.code || ""
          },
          numberOfEmployeesRef: leadData?.numberOfEmployeesRef || "",
          companyWebsite: leadData?.companyWebsite || "",
          address: leadData?.address || "",
          revenue: leadData?.revenue || "",
          annualRevenueRef: leadData?.annualRevenueRef || "",
          annualRevenue: {
            value: leadData?.annualRevenue?.value || "",
            type: leadData?.annualRevenue?.type || "",
            id: leadData?.annualRevenue?.id || "",
            code: leadData?.annualRevenue?.code || ""
          },
          regionRef: leadData?.regionRef || "",
          legalForm: leadData?.legalForm || "",
          legalFormRef: leadData?.legalFormRef || "",
          contact: leadData?.contact || {
            name: leadData?.contact?.name || "",
            email: leadData?.contact?.email || "",
            phone: leadData?.contact?.phone || "",
            pictureUrl: leadData?.contact?.pictureUrl || "",
            jobTitle: leadData?.contact?.jobTitle || ""
          },
          country: leadData?.country || {
            value: leadData?.country?.value || "",
            type: leadData?.country?.type || "",
            id: leadData?.country?.id || "",
            code: leadData?.country?.code || ""
          },
          countryRef: leadData?.countryRef || "",
          activities: hardcodedActivities,
          opportunities: hardcodedOpportunities,
          aiSummary: hardcodedAiSummary
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeadData();
  }, [graphQLClient, refreshTrigger]);

  const [activeTab, setActiveTab] = useState("overview");
  const [activeActivityTab, setActiveActivityTab] = useState("activities");
  
  
  if (loading) {
    return (
      <div className="gba:loading-container" data-testid="lead-loading-container" style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'white'
      }}>
        <Spin size="large" tip="Loading lead data..." />
      </div>
    );
  }
  
  // If there's an error and no lead data, show error state
  if (error && !leadData) {
    return (
      <div className="gba:error-container" data-testid="lead-error-container" style={{ 
        padding: '20px',
        textAlign: 'center',
        backgroundColor: 'white'
      }}>
        <h2>Error</h2>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }
  
  // Now we can safely use leadData since it's either from API or fallback
  const lead = leadData!;

  const handleSaveLead = (updatedData: Partial<Lead>) => {
    setIsEditing(false);
    setLeadData(prev => prev ? { ...prev, ...updatedData } : null);
    // Trigger a refetch from API to ensure we have the latest version
    setRefreshTrigger(prev => prev + 1);
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
      borderBottom: id === "ai-summary-card" && isOpen ? '1px solid #f0f0f0' : 'none',
      cursor: 'pointer'
    };

    const contentStyle: React.CSSProperties = {
      padding: '16px',
      display: isOpen ? 'block' : 'none'
    };

    return (
      <div className={`gba:collapsible-card-${id}`} data-testid={`collapsible-card-${id}`} style={panelStyle}>
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...headerStyle }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>{title}</span>
            {showArrow && (
              <CaretDownOutlined
                style={{ 
                  fontSize: '12px', 
                  marginLeft: '8px',
                  transition: 'transform 0.3s',
                  transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)'
                }}
              />
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

  // If in editing mode, render the EditLead component
  if (isEditing && leadData) {
    return (
      <EditLead 
        {...props} 
        leadData={leadData} 
        onCancel={() => setIsEditing(false)} 
        onSave={handleSaveLead} 
      />
    );
  }

  return (
    <div className="gba:lead-details-container" data-testid="lead-opportunity-investment-detail" style={{ backgroundColor: 'white', padding: '16px' }}>
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          data-testid="back-button"
        >
          <span style={{ marginLeft: '4px' }}>Back to Leads</span>
        </Button>
      </div>

      {/* Lead header */}
      <div className="gba:lead-header" style={{ 
        marginBottom: '24px', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '20px'
      }}>
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
              {lead.name ? lead.name[0] : 'A'}
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                {lead.name}
              </div>
              <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
                <BulbOutlined style={{ marginRight: '4px' }} />
                <span>{typeof lead.industry === 'object' ? lead?.industry?.value || 'Unknown' : lead.industry || 'Unknown'}</span>
                <span style={{ margin: '0 8px' }}>•</span>
                <TeamOutlined style={{ marginRight: '4px' }} />
                <span>{typeof lead.numberOfEmployees === 'object' ? lead?.numberOfEmployees?.value || 'Unknown' : lead.numberOfEmployees || 'Unknown'}</span>
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
              {lead.status || 'Qualified'}
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
              onClick={() => setIsEditing(true)}
            >
              Edit Lead
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

      {/* Main content - Two column layout */}
      <Row gutter={24}>
        {/* Left Column: Company Info, Contacts, Opportunities, Quick Actions, Calendar */}
        <Col span={12}>
          {/* Company Information section */}
          <CollapsibleCard
            title="Company Information"
            defaultOpen={true}
            id="company-info-card"
            style={{ marginBottom: '24px' }}
            showArrow={true}
          >
            <div data-testid="company-info" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <EnvironmentOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Address</div>
                  <div style={{ fontSize: '16px', color: '#000000' }}>{lead.address || '---'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <CalendarOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Annual Revenue</div>
                  <div style={{ fontSize: '16px', color: '#000000' }}>{lead.annualRevenue?.value || '---'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <GlobalOutlined style={{ color: '#8c8c8c', fontSize: '18px', marginRight: '12px', marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 'normal', color: '#8c8c8c', marginBottom: '4px' }}>Website</div>
                  {lead.companyWebsite ? (
                    <a href={`https://${lead.companyWebsite}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '16px', color: '#1677ff' }}>
                      {lead.companyWebsite}
                    </a>
                  ) : (
                    <div style={{ fontSize: '16px', color: '#000000' }}>---</div>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleCard>
          
          {/* Contacts section */}
          <CollapsibleCard
            title="Contacts"
            defaultOpen={true}
            id="contacts-card"
            extra={
              <Button 
                type="text" 
                icon={<UserAddOutlined />} 
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
              >
                Add
              </Button>
            }
            style={{ marginBottom: '24px' }}
            showArrow={true}
          >
            {lead.contact && lead.contact.name ? (
              <div data-testid="contacts-list" className="gba:contacts-list" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div 
                  className="gba:contact-item"
                  data-testid="contact-item"
                  style={{ paddingBottom: '24px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
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
                      {lead.contact.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="gba:contact-details" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <div 
                          className="gba:contact-name" 
                          data-testid="contact-name" 
                          style={{ fontSize: '16px', fontWeight: '500', marginRight: '8px' }}
                        >
                          {lead.contact.name}
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
                        {lead.contact.jobTitle}
                      </div>
                      
                      <div 
                        className="gba:contact-email"
                        data-testid="contact-email"
                        style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', color: '#595959' }}
                      >
                        <MailOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#8c8c8c' }} />
                        <div>{lead.contact.email}</div>
                      </div>
                      <div 
                        className="gba:contact-phone"
                        data-testid="contact-phone"
                        style={{ display: 'flex', alignItems: 'center', color: '#595959' }}
                      >
                        <PhoneOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#8c8c8c' }} />
                        <div>{lead.contact.phone}</div>
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
            ) : null}
          </CollapsibleCard>
          
          {/* Opportunities section */}
          <CollapsibleCard
            title="Opportunities"
            defaultOpen={true}
            id="opportunities-card"
            extra={
              <Button 
                type="text" 
                icon={<PlusCircleOutlined />}
                style={{
                  color: '#000000',
                  padding: '0 8px',
                  height: 'auto',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px'
                }} 
                data-testid="add-opportunity-button"
                className="gba:add-opportunity-button"
              >
                Add
              </Button>
            }
            style={{ 
              marginBottom: '24px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #f0f0f0',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
            }}
            showArrow={true}
          >
            <div data-testid="opportunities-list" className="gba:opportunities-list" style={{ display: 'flex', flexDirection: 'column' }}>
              {lead.opportunities.map((opportunity, index) => {
                // All progress bars are black
                const progressBarColor = '#000000';
                
                // Determine the badge background color based on the stage
                let badgeBgColor = '#f9f0ff'; // Light purple for Proposal
                let badgeTextColor = '#722ed1'; // Purple
                
                if (opportunity.stage === 'Discovery') {
                  badgeBgColor = '#e6f7ff'; // Light blue
                  badgeTextColor = '#1890ff'; // Blue
                } else if (opportunity.stage === 'Negotiation') {
                  badgeBgColor = '#fff7e6'; // Light yellow
                  badgeTextColor = '#fa8c16'; // Orange
                }
                
                return (
                  <div 
                    key={opportunity.id}
                    className="gba:opportunity-item"
                    data-testid={`opportunity-item-${opportunity.id}`}
                    style={{
                      padding: '24px',
                      margin: '8px 0',
                      border: '1px solid #f0f0f0',
                      borderRadius: '8px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div 
                          className="gba:opportunity-name"
                          data-testid={`opportunity-name-${opportunity.id}`}
                          style={{ 
                            fontSize: '16px', 
                            fontWeight: '700', 
                            marginBottom: '8px',
                            color: '#262626'
                          }}
                        >
                          {opportunity.name}
                        </div>
                        <div 
                          className="gba:opportunity-value"
                          data-testid={`opportunity-value-${opportunity.id}`}
                          style={{ 
                            fontSize: '16px', 
                            fontWeight: '700', 
                            color: '#262626',
                            marginBottom: '16px'
                          }}
                        >
                          $ {opportunity.value.toLocaleString()}
                        </div>
                      </div>
                      <div
                        className="gba:opportunity-stage-badge"
                        data-testid={`opportunity-stage-${opportunity.id}`}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '16px',
                          backgroundColor: badgeBgColor,
                          color: badgeTextColor,
                          fontSize: '14px',
                          fontWeight: '600',
                        }}
                      >
                        {opportunity.stage}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div 
                          className="gba:opportunity-probability-label"
                          style={{ fontSize: '14px', color: '#8c8c8c' }}
                        >
                          Probability
                        </div>
                        <div 
                          className="gba:opportunity-probability-value"
                          data-testid={`opportunity-probability-${opportunity.id}`}
                          style={{ fontSize: '14px', fontWeight: '500' }}
                        >
                          {opportunity.probability}%
                        </div>
                      </div>
                      <div 
                        className="gba:opportunity-progress-bar"
                        style={{ 
                          height: '6px', 
                          backgroundColor: '#f5f5f5', 
                          borderRadius: '3px', 
                          overflow: 'hidden',
                          marginBottom: '12px'
                        }}
                      >
                        <div 
                          style={{ 
                            width: `${opportunity.probability}%`, 
                            height: '100%', 
                            backgroundColor: progressBarColor 
                          }} 
                        />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#8c8c8c' }}>
                      <div className="gba:opportunity-close-date">
                        Expected close: <span style={{ color: '#595959' }}>{opportunity.expectedCloseDate}</span>
                      </div>
                      <div className="gba:opportunity-owner">
                        Owner: <span style={{ color: '#595959' }}>{opportunity.owner}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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

        {/* Right Column: AI Summary, Activity Timeline */}
        <Col span={12}>
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
                {/* Activity 1 */}
                <div 
                  className="gba:activity-item" 
                  data-testid="activity-item-1"
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
                      zIndex: 2 /* Ensure icon is above the vertical line */
                    }}
                  >
                    <PhoneOutlined style={{ 
                      fontSize: '16px', 
                      padding: '8px', 
                      borderRadius: '50%', 
                      border: '1px solid #f0f0f0',
                      backgroundColor: '#fff' /* Ensure background is white to cover the line */
                    }} />
                  </div>

                  <div style={{ marginLeft: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div 
                        className="gba:activity-title"
                        data-testid="activity-title-1"
                        style={{ 
                          fontWeight: '600', 
                          fontSize: '16px' 
                        }}
                      >
                        Sales call with Jane Smith
                      </div>
                      <div 
                        className="gba:activity-time"
                        data-testid="activity-time-1"
                        style={{ 
                          color: '#8c8c8c', 
                          fontSize: '14px' 
                        }}
                      >
                        May 20, 2023, 5:30 PM
                      </div>
                    </div>

                    <div 
                      className="gba:activity-description"
                      data-testid="activity-description-1"
                      style={{ 
                        marginBottom: '12px',
                        fontSize: '14px',
                        color: '#595959'
                      }}
                    >
                      Discussed product features and pricing options. Jane showed interest in our enterprise plan.
                    </div>

                    <div 
                      className="gba:activity-details"
                      data-testid="activity-details-1"
                      style={{ 
                        backgroundColor: '#f9f9f9',
                        padding: '12px',
                        borderRadius: '4px',
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', marginBottom: '4px' }}>
                        <div style={{ fontWeight: '500', marginRight: '8px', fontSize: '14px' }}>Duration:</div>
                        <div style={{ fontSize: '14px', color: '#595959' }}>25 minutes</div>
                      </div>
                      <div style={{ display: 'flex' }}>
                        <div style={{ fontWeight: '500', marginRight: '8px', fontSize: '14px' }}>Outcome:</div>
                        <div style={{ fontSize: '14px', color: '#595959' }}>Positive</div>
                      </div>
                    </div>

                    <div 
                      className="gba:activity-owner"
                      style={{
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Avatar 
                        style={{ 
                          backgroundColor: '#1890ff',
                          marginRight: '8px',
                          fontSize: '12px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                        size={24}
                      >
                        AJ
                      </Avatar>
                      <span style={{ fontSize: '14px', color: '#595959' }}>Alex Johnson</span>
                    </div>
                  </div>
                </div>

                {/* Activity 2 */}
                <div 
                  className="gba:activity-item" 
                  data-testid="activity-item-2"
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
                      zIndex: 2 /* Ensure icon is above the vertical line */
                    }}
                  >
                    <MailOutlined style={{ 
                      fontSize: '16px', 
                      padding: '8px', 
                      borderRadius: '50%', 
                      border: '1px solid #f0f0f0',
                      backgroundColor: '#fff' /* Ensure background is white to cover the line */
                    }} />
                  </div>

                  <div style={{ marginLeft: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div 
                        className="gba:activity-title"
                        data-testid="activity-title-2"
                        style={{ 
                          fontWeight: '600', 
                          fontSize: '16px' 
                        }}
                      >
                        Sent proposal to John Doe
                      </div>
                      <div 
                        className="gba:activity-time"
                        data-testid="activity-time-2"
                        style={{ 
                          color: '#8c8c8c', 
                          fontSize: '14px' 
                        }}
                      >
                        May 18, 2023, 1:15 PM
                      </div>
                    </div>

                    <div 
                      className="gba:activity-description"
                      data-testid="activity-description-2"
                      style={{ 
                        marginBottom: '12px',
                        fontSize: '14px',
                        color: '#595959'
                      }}
                    >
                      Sent the customized proposal with pricing details and implementation timeline.
                    </div>

                    <div 
                      className="gba:activity-details"
                      data-testid="activity-details-2"
                      style={{ 
                        backgroundColor: '#f9f9f9',
                        padding: '12px',
                        borderRadius: '4px',
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ display: 'flex' }}>
                        <div style={{ fontWeight: '500', marginRight: '8px', fontSize: '14px' }}>Attachments:</div>
                        <div style={{ fontSize: '14px', color: '#1890ff', cursor: 'pointer' }}>Proposal_Acme_Corp_v1.pdf</div>
                      </div>
                    </div>

                    <div 
                      className="gba:activity-owner"
                      style={{
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Avatar 
                        style={{ 
                          backgroundColor: '#f5f5f5',
                          marginRight: '8px',
                          color: '#595959',
                          fontSize: '12px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                        size={24}
                      >
                        SW
                      </Avatar>
                      <span style={{ fontSize: '14px', color: '#595959' }}>Sarah Williams</span>
                    </div>
                  </div>
                </div>

                {/* Activity 3 */}
                <div 
                  className="gba:activity-item" 
                  data-testid="activity-item-3"
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
                      zIndex: 2 /* Ensure icon is above the vertical line */
                    }}
                  >
                    <VideoCameraOutlined style={{ 
                      fontSize: '16px', 
                      padding: '8px', 
                      borderRadius: '50%', 
                      border: '1px solid #f0f0f0',
                      backgroundColor: '#fff' /* Ensure background is white to cover the line */
                    }} />
                  </div>

                  <div style={{ marginLeft: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div 
                        className="gba:activity-title"
                        data-testid="activity-title-3"
                        style={{ 
                          fontWeight: '600', 
                          fontSize: '16px' 
                        }}
                      >
                        Product demo with technical team
                      </div>
                      <div 
                        className="gba:activity-time"
                        data-testid="activity-time-3"
                        style={{ 
                          color: '#8c8c8c', 
                          fontSize: '14px' 
                        }}
                      >
                        May 15, 2023, 6:00 PM
                      </div>
                    </div>

                    <div 
                      className="gba:activity-description"
                      data-testid="activity-description-3"
                      style={{ 
                        marginBottom: '12px',
                        fontSize: '14px',
                        color: '#595959'
                      }}
                    >
                      Demonstrated our platform's API integration capabilities to their development team.
                    </div>

                    <div 
                      className="gba:activity-details"
                      data-testid="activity-details-3"
                      style={{ 
                        backgroundColor: '#f9f9f9',
                        padding: '12px',
                        borderRadius: '4px',
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', marginBottom: '4px' }}>
                        <div style={{ fontWeight: '500', marginRight: '8px', fontSize: '14px' }}>Duration:</div>
                        <div style={{ fontSize: '14px', color: '#595959' }}>1 hour</div>
                      </div>
                      <div style={{ display: 'flex' }}>
                        <div style={{ fontWeight: '500', marginRight: '8px', fontSize: '14px' }}>Attendees:</div>
                        <div style={{ fontSize: '14px', color: '#595959' }}>Jane Smith, John Doe, Technical Team</div>
                      </div>
                    </div>

                    <div 
                      className="gba:activity-owner"
                      style={{
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Avatar 
                        style={{ 
                          backgroundColor: '#722ed1',
                          marginRight: '8px',
                          fontSize: '12px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                        size={24}
                      >
                        MC
                      </Avatar>
                      <span style={{ fontSize: '14px', color: '#595959' }}>Michael Chen</span>
                    </div>
                  </div>
                </div>

                {/* Activity 4 */}
                <div 
                  className="gba:activity-item" 
                  data-testid="activity-item-4"
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
                      zIndex: 2 /* Ensure icon is above the vertical line */
                    }}
                  >
                    <CommentOutlined style={{ 
                      fontSize: '16px', 
                      padding: '8px', 
                      borderRadius: '50%', 
                      border: '1px solid #f0f0f0',
                      backgroundColor: '#fff' /* Ensure background is white to cover the line */
                    }} />
                  </div>

                  <div style={{ marginLeft: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div 
                        className="gba:activity-title"
                        data-testid="activity-title-4"
                        style={{ 
                          fontWeight: '600', 
                          fontSize: '16px' 
                        }}
                      >
                        Follow-up message to Jane Smith
                      </div>
                      <div 
                        className="gba:activity-time"
                        data-testid="activity-time-4"
                        style={{ 
                          color: '#8c8c8c', 
                          fontSize: '14px' 
                        }}
                      >
                        May 14, 2023, 12:45 PM
                      </div>
                    </div>

                    <div 
                      className="gba:activity-description"
                      data-testid="activity-description-4"
                      style={{ 
                        marginBottom: '12px',
                        fontSize: '14px',
                        color: '#595959'
                      }}
                    >
                      Sent a message to check if they had any questions about the proposal.
                    </div>

                    <div 
                      className="gba:activity-owner"
                      style={{
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Avatar 
                        style={{ 
                          backgroundColor: '#1890ff',
                          marginRight: '8px',
                          fontSize: '12px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                        size={24}
                      >
                        AJ
                      </Avatar>
                      <span style={{ fontSize: '14px', color: '#595959' }}>Alex Johnson</span>
                    </div>
                  </div>
                </div>

                {/* Activity 5 */}
                <div 
                  className="gba:activity-item" 
                  data-testid="activity-item-5"
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
                      zIndex: 2 /* Ensure icon is above the vertical line */
                    }}
                  >
                    <MailOutlined style={{ 
                      fontSize: '16px', 
                      padding: '8px', 
                      borderRadius: '50%', 
                      border: '1px solid #f0f0f0',
                      backgroundColor: '#fff' /* Ensure background is white to cover the line */
                    }} />
                  </div>

                  <div style={{ marginLeft: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div 
                        className="gba:activity-title"
                        data-testid="activity-title-5"
                        style={{ 
                          fontWeight: '600', 
                          fontSize: '16px' 
                        }}
                      >
                        Initial outreach
                      </div>
                      <div 
                        className="gba:activity-time"
                        data-testid="activity-time-5"
                        style={{ 
                          color: '#8c8c8c', 
                          fontSize: '14px' 
                        }}
                      >
                        May 10, 2023, 2:30 PM
                      </div>
                    </div>

                    <div 
                      className="gba:activity-description"
                      data-testid="activity-description-5"
                      style={{ 
                        marginBottom: '12px',
                        fontSize: '14px',
                        color: '#595959'
                      }}
                    >
                      Sent an introduction email highlighting our solutions relevant to their industry.
                    </div>

                    <div 
                      className="gba:activity-owner"
                      style={{
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Avatar 
                        style={{ 
                          backgroundColor: '#f5f5f5',
                          marginRight: '8px',
                          color: '#595959',
                          fontSize: '12px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}
                        size={24}
                      >
                        SW
                      </Avatar>
                      <span style={{ fontSize: '14px', color: '#595959' }}>Sarah Williams</span>
                    </div>
                  </div>
                </div>
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

export default LeadOpportunityInvestment;