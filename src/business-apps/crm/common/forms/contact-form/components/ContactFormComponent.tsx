import React from 'react';
import { useContactFormContext } from '../context/ContactFormContext';
import { Button, Spinner, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import OwnerInformationSection from './OwnerInformationSection';
import PersonalInformationSection from './PersonalInformationSection';
import ProfessionalInformationSection from './ProfessionalInformationSection';

import AccountInformationSection from './AccountInformationSection';
import AdditionalInformationSection from './AdditionalInformationSection';

const prefixDataTestId = 'ContactForm';

const ContactFormComponent: React.FC = () => {
  const {
    formValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
  } = useContactFormContext();

  // Safety check - if context is not properly initialized, show error
  if (!formValues) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: Form context not properly initialized. Please refresh the page.
        </div>
      </div>
    );
  }

  // Check if all mandatory fields are filled
  const isFormValid = 
    formValues.firstName &&
    formValues.lastName &&
    formValues.email &&
    formValues.ownerEmployeeId;

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      await onSubmit(formValues);
      
      // Determine if this is an update or create operation
      const isUpdate = formValues.id;
      
      // Prepare comprehensive contact payload following the API structure
      const contactPayload: any = {
        sourceApp: "CRM",
        firstName: toStringOrUndefined(formValues.firstName),
        lastName: toStringOrUndefined(formValues.lastName),
        academicTitleRef: toStringOrUndefined(formValues.academicTitleRef),
        birthDate: toStringOrUndefined(formValues.birthDate),
        languageRef: toStringOrUndefined(formValues.languageRef),
        bio: toStringOrUndefined(formValues.bio),
        pictureUrl: toStringOrUndefined(formValues.pictureUrl),
        jobTitle: toStringOrUndefined(formValues.jobTitle),
        department: toStringOrUndefined(formValues.department),
        contactRole: toStringOrUndefined(formValues.contactRole),
        contactType: toStringOrUndefined(formValues.contactType),
        workExperienceYears: formValues.workExperienceYears ? parseInt(formValues.workExperienceYears) : undefined,
        email: toStringOrUndefined(formValues.email),
        phone: toStringOrUndefined(formValues.phone),
        fax: toStringOrUndefined(formValues.fax),
        linkedinUrl: toStringOrUndefined(formValues.linkedinUrl),
        xingUrl: toStringOrUndefined(formValues.xingUrl),
        accountId: toStringOrUndefined(formValues.accountId),
        ownerEmployeeId: toStringOrUndefined(formValues.ownerEmployeeId),
        ownerOrganizationId: toStringOrUndefined(formValues.ownerOrganizationId),
        notesSummary: toStringOrUndefined(formValues.notesSummary),
        recordState: formValues.recordState || 'ACTIVE',
      };

      // For updates, include the contact ID and version
      if (isUpdate) {
        contactPayload.id = formValues.id;
        if (formValues.version !== undefined) {
          contactPayload.version = formValues.version;
        }
      }

      // Initialize empty arrays for relationships
      contactPayload.addresses = [];
      contactPayload.communicationChannels = [];
      contactPayload.tags = [];

      const payload = {
        contact: contactPayload
      };
      
      // Log the payload for debugging
      console.log(`${isUpdate ? 'Updating' : 'Creating'} contact with payload:`, payload);
      
      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent('pse_submit', payload);
    } catch (err) {
      console.error('Error submitting contact form:', err);
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel();
      
      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent('pse_pause', null);
    } catch (err) {
      console.error('Error cancelling contact form:', err);
    }
  };

  // Debug: Test data loading vs AccountForm approach
  const {
    academicTitles,
    languages,
    contactTypes,
    contactRoles,
    departments,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
  } = useContactFormContext();

  const debugInfo = (() => {
    try {
      // Test Tailwind functionality and version
      const tailwindStatus = (() => {
        if (typeof window === 'undefined') return 'SSR';
        
        try {
          // Detect Tailwind version and source
          const versionInfo = (() => {
            // Check for Tailwind global object
            const tailwindGlobal = (window as any).tailwind || (window as any).Tailwind;
            if (tailwindGlobal?.version) {
              return `v${tailwindGlobal.version}`;
            }
            
            // Check CSS stylesheets for version hints
            const stylesheets = Array.from(document.styleSheets);
            for (const sheet of stylesheets) {
              try {
                const href = (sheet as any).href || 'inline';
                if (href.includes('tailwind') || href.includes('main.css') || href.includes('index.css')) {
                  const sheetInfo = href.includes('main.css') ? 'main.css' : 
                                   href.includes('index.css') ? 'index.css' :
                                   href.includes('tailwind') ? 'tailwind.css' : 'unknown';
                  return `${sheetInfo}`;
                }
              } catch (e) {
                // Cross-origin or other stylesheet access error
              }
            }
            
            // Check for Tailwind CSS custom properties that indicate presence
            const testEl = document.createElement('div');
            document.body.appendChild(testEl);
            const styles = window.getComputedStyle(testEl);
            document.body.removeChild(testEl);
            
            // Check if CSS custom properties exist (Tailwind 3+ feature)
            const hasTailwindProps = Object.keys(styles).some(key => 
              styles.getPropertyValue(`--tw-${key}`) || 
              key.includes('--tw-')
            );
            
            return hasTailwindProps ? 'v3+detected' : 'unknown';
          })();

          // Test CSS loading sources
          const cssSourceInfo = (() => {
            const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            const sources = links.map(link => {
              const href = link.getAttribute('href') || '';
              if (href.includes('main.css')) return 'main.css';
              if (href.includes('index.css')) return 'index.css';
              if (href.includes('tailwind')) return 'tailwind.css';
              if (href.includes('assets')) return 'assets/';
              if (href.startsWith('http')) return 'external';
              return href ? 'other' : '';
            }).filter(Boolean);
            
            return sources.length > 0 ? `CSS:[${sources.join(',')}]` : 'CSS:none';
          })();
          
          // Create a test element to check if Tailwind classes work
          const testEl = document.createElement('div');
          testEl.className = 'gba:hidden gba:bg-red-500 gba:p-4';
          testEl.style.position = 'absolute';
          testEl.style.top = '-9999px';
          document.body.appendChild(testEl);
          
          const styles = window.getComputedStyle(testEl);
          const isHidden = styles.display === 'none';
          const hasBackground = styles.backgroundColor !== '' && styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
          const hasPadding = styles.padding !== '' && styles.padding !== '0px';
          
          document.body.removeChild(testEl);
          
          const workingClasses = [
            isHidden ? 'hidden✅' : 'hidden❌',
            hasBackground ? 'bg✅' : 'bg❌', 
            hasPadding ? 'p✅' : 'p❌'
          ].join('');
          
          return `TW:${workingClasses} ${versionInfo} ${cssSourceInfo}`;
        } catch (e) {
          return `TW:ERROR(${e instanceof Error ? e.message : 'unknown'})`;
        }
      })();

      const dataStatus = {
        tailwind: tailwindStatus,
        staticData: `Titles:${academicTitles.length} Languages:${languages.length} Types:${contactTypes.length}`,
        employees: `${employeePositions.length} items ${employeePositionsLoading ? '(Loading...)' : ''} ${employeePositionsError ? `(Error: ${employeePositionsError})` : ''}`,
        contactData: `Roles:${contactRoles.length} Departments:${departments.length}`,
        components: `Select:${typeof Select === 'function' ? '✅' : '❌'} Trigger:${typeof SelectTrigger === 'function' ? '✅' : '❌'}`
      };
      
      return Object.entries(dataStatus).map(([key, value]) => `${key}:${value}`).join(' | ');
    } catch (error) {
      return `Debug Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  })();

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      {/* Debug Info */}
      <div className="gba:bg-yellow-100 gba:border gba:border-yellow-400 gba:text-yellow-800 gba:px-3 gba:py-2 gba:rounded gba:text-xs gba:mb-4 gba:font-mono">
        🔧 DEBUG: {debugInfo}
      </div>
      
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={formatDataTestId(prefixDataTestId, 'Form')}>
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          
          {/* Contact Owner Section - First and most important */}
          <OwnerInformationSection />

          {/* Personal Information Section */}
          <PersonalInformationSection />

          {/* Professional Information Section */}
          <ProfessionalInformationSection />

          {/* Account Information Section */}
          <AccountInformationSection />

          {/* Additional Information Section */}
          <AdditionalInformationSection />

          {/* Error Display */}
          {error && (
            <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4">
              <div className="gba:text-red-800 gba:text-sm">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Submit and Cancel Buttons - Fixed at bottom */}
        <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200 gba:flex gba:gap-3">
          <Button
            variant="secondary"
            className="gba:flex-1"
            size="lg"
            onClick={handleCancel}
            data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            disabled={!isFormValid}
            className="gba:flex-1"
            size="lg"
            onClick={handleSubmit}
            data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
          >
            {isLoading && <Spinner size="sm" className="gba:mr-2" />}
            {formValues.id ? 'Update Contact' : 'Create Contact'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContactFormComponent; 