import React, { useMemo, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system';
import dayjs from 'dayjs';
import { ContactData } from '@/business-apps/crm/common/apps/contact-record/queries/ContactQueries';

interface ContactSectionProps extends Partial<BusinessAppContextProps> {
  contactId?: string;
  contact?: any;
  contacts?: any[];
  'data-testid'?: string;
}

const ContactSection: React.FC<ContactSectionProps> = ({ contactId, contact, contacts, ...props }) => {
  const contactList: ContactData[] = useMemo(() => {
    const arr = Array.isArray(contacts) ? (contacts as ContactData[]).filter(Boolean) : [];
    return arr;
  }, [contacts]);

  const hasMultiple = contactList.length > 1;
  const initialSelected: ContactData | null = contact || (contactList.length === 1 ? contactList[0] : null);
  const [mode, setMode] = useState<'list' | 'detail'>(hasMultiple ? 'list' : 'detail');
  const [selectedContact, setSelectedContact] = useState<ContactData | null>(initialSelected);

  const handleSelect = (c: ContactData) => {
    setSelectedContact(c);
    setMode('detail');
  };

  const handleBackToList = () => {
    setMode('list');
  };

  return (
    <div data-testid={props['data-testid'] || 'contact-section'} className="gba:w-full gba:space-y-6">
      {mode === 'list' ? (
        <Card className="gba:w-full gba:h-full">
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="contacts-list" role="list" className="gba:flex gba:flex-col gba:items-start gba:gap-2 gba:text-left">
              {contactList.map((c) => {
                const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || '-';
                const initials = `${(c.firstName || '').charAt(0)}${(c.lastName || '').charAt(0)}`.toUpperCase() || '?';
                const rawSrc = (c as any).pictureThumbnailUrl || (c as any).pictureThumbnail || (c as any).avatar || (c as any)?.ownerEmployee?.pictureThumbnail;
                const src = rawSrc ? (String(rawSrc).startsWith('data:') || String(rawSrc).startsWith('http') ? String(rawSrc) : `data:image/jpeg;base64,${rawSrc}`) : undefined;
                return (
                  <button
                    key={c.id}
                    data-testid={`contacts-list-item-${c.id}`}
                    onClick={() => handleSelect(c)}
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <Avatar className="gba:h-8 gba:w-8">
                      {src ? <AvatarImage src={src} alt={fullName} /> : <AvatarFallback>{initials || '?'}</AvatarFallback>}
                    </Avatar>
                    <div className="gba:flex gba:flex-col gba:items-start">
                      <div>{fullName}</div>
                      {c.email ? <div className="gba:opacity-80">{c.email}</div> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <ContactPersonalInfo
          contact={selectedContact || (contact as ContactData)}
          canGoBack={contactList.length > 1}
          onBack={handleBackToList}
        />
      )}
    </div>
  );
};

export default ContactSection;

// Removed redundant Company Information card for contacts

// Inlined from '@/business-apps/crm/common/apps/contact-record/components/ContactPersonalInfo'
interface ContactPersonalInfoProps {
  contact: ContactData;
  canGoBack?: boolean;
  onBack?: () => void;
}

const ContactPersonalInfo: React.FC<ContactPersonalInfoProps> = ({ contact, canGoBack, onBack }) => {
  return (
    <Card className="gba:w-full gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>Contact Information</CardTitle>
          {canGoBack ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              data-testid="contacts-back-to-list-button"
            >
              Back to Contacts
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Academic Title</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>{contact?.academicTitle?.value || '-'}</div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>First Name</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>{contact?.firstName || '-'}</div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Last Name</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>{contact?.lastName || '-'}</div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Email</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>
              {contact?.email ? (
                <a 
                  href={`mailto:${contact.email}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                  data-testid="contact-personal-info-email-link"
                >
                  {contact.email}
                </a>
              ) : '-'}
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Phone Number</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>
              {contact?.phone ? (
                <a 
                  href={`tel:${contact.phone}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                >
                  {contact.phone}
                </a>
              ) : '-'}
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Job Title</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>{contact?.jobTitle || '-'}</div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Department</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>{
              (contact as any)?.department
                ? ((contact as any).department as string).charAt(0).toUpperCase() + ((contact as any).department as string).slice(1)
                : '-'
            }</div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>LinkedIn</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>
              {contact?.linkedinUrl ? (
                <a 
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                  data-testid="contact-linkedin-link"
                >
                  View Profile
                </a>
              ) : '-'}
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>XING</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>
              {contact?.xingUrl ? (
                <a 
                  href={contact.xingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                  data-testid="contact-xing-link"
                >
                  View Profile
                </a>
              ) : '-'}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>Created At</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>
              {contact?.createdAt ? dayjs(contact.createdAt).format('MMM D, YYYY, h:mm A') : '-'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};