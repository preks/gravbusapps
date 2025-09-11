import React, { useMemo, useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system';
import { ContactData } from '@/business-apps/crm/common/apps/contact-record/queries/ContactQueries';
import { PiLinkedinLogo, PiShareNetwork, PiUser, PiIdentificationCard, PiEnvelope, PiPhone, PiCaretLeft, PiCaretRight } from 'react-icons/pi';

// UPDATED: Redesigned ContactSection to match wireframe - v2.0

interface ContactSectionProps extends Partial<BusinessAppContextProps> {
  contactId?: string;
  contact?: any;
  contacts?: any[];
  className?: string;
  'data-testid'?: string;
}

const ContactSection: React.FC<ContactSectionProps> = ({ contactId, contact, contacts, className = '', ...props }) => {
  const contactList: ContactData[] = useMemo(() => {
    const arr = Array.isArray(contacts) ? (contacts as ContactData[]).filter(Boolean) : [];
    return arr;
  }, [contacts]);

  const hasMultiple = contactList.length > 1;
  const initialSelected: ContactData | null = contact || (contactList.length > 0 ? contactList[0] : null);
  const [selectedContact, setSelectedContact] = useState<ContactData | null>(initialSelected);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Update selected contact when contactList changes
  useEffect(() => {
    if (contactList.length > 0 && !selectedContact) {
      setSelectedContact(contactList[0]);
      setCurrentIndex(0);
    }
  }, [contactList, selectedContact]);

  // Carousel navigation
  const handlePrevious = () => {
    if (hasMultiple) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : contactList.length - 1;
      setCurrentIndex(newIndex);
      setSelectedContact(contactList[newIndex]);
    }
  };

  const handleNext = () => {
    if (hasMultiple) {
      const newIndex = currentIndex < contactList.length - 1 ? currentIndex + 1 : 0;
      setCurrentIndex(newIndex);
      setSelectedContact(contactList[newIndex]);
    }
  };

  // Use the correct contact data source
  const displayContact = hasMultiple ? selectedContact : (contact || initialSelected);

  return (
    <div data-testid={props['data-testid'] || 'contact-section'} className={`gba:w-full ${className}`}>
      <ContactPersonalInfo
        contact={displayContact as ContactData}
        hasMultiple={hasMultiple}
        currentIndex={currentIndex}
        totalCount={contactList.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />
    </div>
  );
};

export default ContactSection;

// Removed redundant Company Information card for contacts

// Inlined from '@/business-apps/crm/common/apps/contact-record/components/ContactPersonalInfo'
interface ContactPersonalInfoProps {
  contact: ContactData;
  hasMultiple?: boolean;
  currentIndex?: number;
  totalCount?: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

const ContactPersonalInfo: React.FC<ContactPersonalInfoProps> = ({ 
  contact, 
  hasMultiple,
  currentIndex = 0,
  totalCount = 1,
  onPrevious,
  onNext 
}) => {
  // Helper function to build full name
  const buildFullName = () => {
    const parts = [];
    if (contact?.academicTitle?.value) parts.push(contact.academicTitle.value);
    if (contact?.firstName) parts.push(contact.firstName);
    if (contact?.lastName) parts.push(contact.lastName);
    return parts.length > 0 ? parts.join(' ') : '-';
  };

  // Helper function to build job info
  const buildJobInfo = () => {
    const parts = [];
    if (contact?.jobTitle) parts.push(contact.jobTitle);
    if ((contact as any)?.department) {
      const department = (contact as any).department as string;
      parts.push(department.charAt(0).toUpperCase() + department.slice(1));
    }
    return parts.length > 0 ? parts.join(' • ') : '-';
  };

  // Check if contact has image/avatar
  const hasContactImage = (contact as any)?.pictureThumbnailUrl || (contact as any)?.pictureThumbnail || (contact as any)?.avatar;
  
  // Get dynamic field values
  const fullName = buildFullName();
  const jobInfo = buildJobInfo();
  const hasName = fullName && fullName !== '-';
  const hasJobInfo = jobInfo && jobInfo !== '-';
  const hasEmail = contact?.email;
  const hasPhone = contact?.phone;

  return (
    <Card className="gba:w-full">
      <CardHeader className="gba:flex gba:items-center gba:justify-between">

          <CardTitle className="gba:text-base">
            Contact Information
            {hasMultiple && (
              <span className="gba:text-xs gba:opacity-60 gba:ml-2">
                {currentIndex + 1} of {totalCount}
              </span>
            )}
          </CardTitle>
          {hasMultiple && (
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                data-testid="contacts-carousel-prev"
                className="gba:p-1 gba:h-6 gba:w-6"
              >
                <PiCaretLeft style={{ fontSize: '12px' }} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                data-testid="contacts-carousel-next"
                className="gba:p-1 gba:h-6 gba:w-6"
              >
                <PiCaretRight style={{ fontSize: '12px' }} />
              </Button>
            </div>
          )}

      </CardHeader>
      <CardContent>
        {/* Full Name with carousel navigation - v3.1 */}
        {hasName && (
          <div style={{ marginBottom: hasJobInfo || hasEmail || hasPhone ? '6px' : '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Show contact avatar if available, otherwise show icon */}
            {hasContactImage ? (
              <Avatar className="gba:h-7 gba:w-7">
                <AvatarImage src={(contact as any)?.pictureThumbnailUrl || (contact as any)?.pictureThumbnail || (contact as any)?.avatar} alt={fullName} />
                <AvatarFallback>
                  <PiUser style={{ fontSize: '14px' }} />
                </AvatarFallback>
              </Avatar>
            ) : (
               <div className="gba:h-7 gba:w-7 gba:flex gba:items-center gba:justify-center gba:bg-blue-50 gba:rounded-full">
                 <PiUser 
                   style={{ fontSize: '14px', color: '#3b82f6' }} 
                   title="Contact name"
                 />
               </div>
            )}
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {fullName}
            </div>
          </div>
        )}

        {/* Job Title + Department - Only show if has job info */}
        {hasJobInfo && (
          <div style={{ marginBottom: hasEmail || hasPhone ? '6px' : '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <PiIdentificationCard 
               style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
               title="Job title and department"
             />
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
              {jobInfo}
            </div>
          </div>
        )}

        {/* Email - Only show if has email */}
        {hasEmail && (
          <div style={{ marginBottom: hasPhone ? '6px' : '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <PiEnvelope 
               style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
               title="Email address"
             />
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
              <a 
                href={`mailto:${contact.email}`}
                style={{ color: '#3b82f6', textDecoration: 'none' }}
                data-testid="contact-personal-info-email-link"
              >
                {contact.email}
              </a>
            </div>
          </div>
        )}

        {/* Phone with Social Media Icons - Only show if has phone or social links */}
        {(hasPhone || contact?.linkedinUrl || contact?.xingUrl) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {hasPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PiPhone 
                  style={{ fontSize: '14px', color: '#6b7280', minWidth: '14px' }} 
                  title="Phone number"
                />
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                  <a 
                    href={`tel:${contact.phone}`}
                    style={{ color: '#3b82f6', textDecoration: 'none' }}
                    data-testid="contact-phone-link"
                  >
                    {contact.phone}
                  </a>
                </div>
              </div>
            )}
            
            {/* Social Media Icons - right aligned */}
            {(contact?.linkedinUrl || contact?.xingUrl) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {contact?.linkedinUrl && (
                  <button
                    onClick={() => window.open(contact.linkedinUrl, '_blank', 'noopener,noreferrer')}
                    className="gba:p-1 gba:text-blue-600 hover:gba:text-blue-800 gba:transition-colors"
                    data-testid="contact-linkedin-icon"
                    title="LinkedIn Profile"
                    style={{ padding: '2px' }}
                  >
                    <PiLinkedinLogo style={{ fontSize: '14px' }} />
                  </button>
                )}
                {contact?.xingUrl && (
                  <button
                    onClick={() => window.open(contact.xingUrl, '_blank', 'noopener,noreferrer')}
                    className="gba:p-1 gba:text-green-600 hover:gba:text-green-800 gba:transition-colors"
                    data-testid="contact-xing-icon"
                    title="XING Profile"
                    style={{ padding: '2px' }}
                  >
                    <PiShareNetwork style={{ fontSize: '14px' }} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};