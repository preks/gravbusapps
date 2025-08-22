import React, { useState, useEffect, useMemo } from "react";
import {
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
} from "@newwork/nw-design-system";
import {
  ArrowLeftOutlined,
  UserOutlined,
  FileOutlined,
} from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { navigateTo } from "@/common/utils/navigationUtils";
import { useContactData } from "./hooks/useContactData";
import { ContactHeader } from "./components/ContactHeader";
import { CompanyInformation } from "./components/CompanyInformation";
import { ContactPersonalInfo } from "./components/ContactPersonalInfo";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { TasksSection } from "./components/TasksSection";
import { ContactDocuments } from "./components/ContactDocuments";

interface ContactRecordContentProps extends BusinessAppContextProps {
  contactId: string;
  onBack: () => void;
  fromEntity?: string | null;
}

const InvestmentContactRecordContent: React.FC<ContactRecordContentProps> = ({
  contactId,
  onBack,
  fromEntity,
  ...props
}) => {
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { contact: contactData, loading: dataLoading, error: dataError } = useContactData(contactId, props.accessToken);

  // Get source from URL parameters to determine back navigation text
  const source = useMemo(() => {
    return new URLSearchParams(window.location.search).get('source');
  }, []);

  const getBackButtonText = () => {
    if (source === 'investment-relations') {
      return 'Back to Investment Relations';
    }
    if (fromEntity === 'leads') {
      return 'Back to Investment Leads';
    }
    if (fromEntity === 'accounts') {
      return 'Back to Investment Accounts';
    }
    return 'Back to Investment Contacts';
  };

  useEffect(() => {
    const fetchContactData = async () => {
      if (!contactId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        if (contactData) {
          setContact(contactData);
        } else if (dataError) {
          setError(dataError);
        }
      } catch (err) {
        console.error('Error fetching investment contact:', err);
        setError(err instanceof Error ? err.message : 'Failed to load investment contact');
      } finally {
        setLoading(false);
      }
    };

    if (!dataLoading) {
      fetchContactData();
    }
  }, [contactId, contactData, dataLoading, dataError]);

  // Update loading state based on data loading
  useEffect(() => {
    setLoading(dataLoading);
  }, [dataLoading]);

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">{error || 'Investment Contact not found'}</p>
          <Button
            onClick={onBack}
            className="gba:mt-4"
            variant="default"
          >
            {getBackButtonText()}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="gba:contact-details-container"
      data-testid="investment-contact-detail"
      style={{ backgroundColor: "white", padding: "16px" }}
    >
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: "16px" }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="investment-contact-back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>{getBackButtonText()}</span>
        </button>
      </div>

      {/* Contact header */}
      <ContactHeader
        contact={contact}
        contactId={contactId}
        accessToken={props.accessToken}
      />

      {/* Main content with tabs */}
      <div
        className="gba:contact-details-content"
        data-testid="investment-contact-details-content"
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gba:w-full"
        >
          <TabsList className="gba:bg-white gba:border gba:mb-6">
            <TabsTrigger value="overview" data-testid="investment-contact-overview-tab">
              <UserOutlined className="gba:mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="investment-contact-documents-tab">
              <FileOutlined className="gba:mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" data-testid="investment-contact-overview-content">
            {/* First Row: Company Information + Personal Info */}
            <div className="gba:grid gba:grid-cols-4 gba:gap-6 gba:mb-6">
              {/* Company Information - 3/4 width */}
              <div className="gba:col-span-3 gba:flex">
                <CompanyInformation contact={contact} />
              </div>

              {/* Personal Information - 1/4 width */}
              <div className="gba:col-span-1 gba:flex">
                <ContactPersonalInfo contact={contact} />
              </div>
            </div>

            {/* Second Row: Activity Timeline + Tasks */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-6">
              {/* Activity Timeline - 1/2 width */}
              <div>
                <ActivityTimeline contactId={contactId} context={props} />
              </div>

              {/* Tasks - 1/2 width */}
              <div>
                <TasksSection contactId={contactId} context={props} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" data-testid="investment-contact-documents-content">
            <ContactDocuments contactId={contactId} context={props} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

interface InvestmentContactRecordProps extends BusinessAppContextProps {
  contactId?: string;
}

const InvestmentContactRecord: React.FC<InvestmentContactRecordProps> = ({
  contactId: propContactId,
  ...props
}) => {
  const contactId = useMemo(() => {
    return (
      propContactId ||
      new URLSearchParams(window.location.search).get("contactId")
    );
  }, [propContactId]);
  const handleBack = () => {
    // Always navigate to investment relations
    navigateTo('/platform/irm/investment-relations?view=contacts');
  };

  if (!contactId) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-red-500 gba:text-lg">Contact ID is required</p>
          <Button
            onClick={handleBack}
            className="gba:mt-4"
            variant="default"
          >
            Back to Investment Contacts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <InvestmentContactRecordContent
      contactId={contactId}
      onBack={handleBack}
      fromEntity={new URLSearchParams(window.location.search).get('fromEntity')}
      {...props}
    />
  );
};

export default InvestmentContactRecord;