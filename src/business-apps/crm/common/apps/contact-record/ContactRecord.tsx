import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo } from "@/common/utils/navigationUtils";
import { ContactData, useGetContactById } from './queries/ContactQueries';
import { ContactHeader } from './components/ContactHeader';
import { CompanyInformation } from './components/CompanyInformation';
import { ContactPersonalInfo } from './components/ContactPersonalInfo';
import { ActivityTimeline } from './components/ActivityTimeline';
import { TasksSection } from './components/TasksSection';

interface ContactRecordContentProps extends BusinessAppContextProps {
  contactId: string;
  onBack: () => void;
}

const ContactRecordContent: React.FC<ContactRecordContentProps> = ({ contactId, onBack, ...props }) => {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchContactById } = useGetContactById({ accessToken: props.accessToken });

  useEffect(() => {
    const fetchContactData = async () => {
      if (!contactId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const contactData = await fetchContactById(contactId);
        
        if (contactData) {
          setContact(contactData);
        } else {
          setError('Contact not found');
        }
      } catch (err) {
        console.error('Error fetching contact:', err);
        setError(err instanceof Error ? err.message : 'Failed to load contact');
      } finally {
        setLoading(false);
      }
    };

    fetchContactData();
  }, [contactId, fetchContactById]);

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">{error || 'Contact not found'}</p>
          <button
            onClick={onBack}
            className="gba:mt-4 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded"
          >
            Back to Contacts Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:contact-details-container" data-testid="contact-opportunity-investment-detail" style={{ backgroundColor: 'white', padding: '16px' }}>
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: '16px' }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>Back to Contacts Overview</span>
        </button>
      </div>

      {/* Contact header */}
      <ContactHeader 
        contact={contact} 
        contactId={contactId} 
        additionalData={props} 
        accessToken={props.accessToken} 
      />

      {/* Main content */}
      <div className="gba:contact-details-content" data-testid="contact-details-content">
        
        {/* First Row: Company Information + Personal Info */}
        <Row gutter={24} style={{ marginBottom: '24px', display: 'flex', alignItems: 'stretch' }}>
          {/* Company Information - 3/4 width */}
          <Col span={18} style={{ display: 'flex' }}>
            <CompanyInformation contact={contact} />
          </Col>

          {/* Personal Information - 1/4 width */}
          <Col span={6} style={{ display: 'flex' }}>
            <ContactPersonalInfo contact={contact} />
          </Col>
        </Row>

        {/* Second Row: Activity Timeline + Tasks */}
        <Row gutter={24}>
          {/* Activity Timeline - 1/2 width */}
          <Col span={12}>
            <ActivityTimeline contactId={contactId} context={props} />
          </Col>

          {/* Tasks - 1/2 width */}
          <Col span={12}>
            <TasksSection contactId={contactId} context={props} />
          </Col>
        </Row>
      </div>
    </div>
  );
};

interface ContactRecordProps extends BusinessAppContextProps {
  contactId?: string;
  onBack?: () => void;
}

const ContactRecord: React.FC<ContactRecordProps> = (props) => {
  const contactId = useMemo(() => {
    return props.contactId || new URLSearchParams(window.location.search).get('contactId');
  }, [props.contactId]);
  
  const handleBack = () => {
    if (props.onBack) {
      props.onBack();
    } else {
      // Navigate back to contacts overview
      navigateTo('/platform/crm/contacts-overview');
    }
  };

  if (!contactId) {
    return (
      <div data-testid="contact-record-no-id">
        <p>No contact ID provided</p>
      </div>
    );
  }
  
  return (
    <ContactRecordContent
      {...props}
      contactId={contactId}
      onBack={handleBack}
    />
  );
};

export { ContactRecord, ContactRecordContent }; 

export default ContactRecord; 