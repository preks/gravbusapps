import { useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { parseCsv, validateCsvHeaders } from '../utils/csvUtils';
import { validateContactRow } from '../utils/contactValidation';
import { ImportResult, ImportProgress, ImportedContact } from '../types/importTypes';

const INSERT_CONTACT_MUTATION = `
  mutation InsertContact($contact: ContactInsertInput!) {
    insertContactOne(object: $contact) {
      id
      firstName
      lastName
      email
    }
  }
`;

export const useContactImport = (context: BusinessAppContextProps) => {
  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const parseAndValidateCsv = useCallback((file: File): Promise<ImportedContact[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          setProgress({ status: 'parsing', progress: 25, message: 'Parsing CSV file...' });
          
          const csvText = e.target?.result as string;
          const { data, errors: parseErrors } = parseCsv(csvText);
          
          if (parseErrors.length > 0) {
            reject(new Error(`CSV parsing failed: ${parseErrors[0].message}`));
            return;
          }

          // Validate headers
          const headers = Object.keys(data[0] || {});
          const missingHeaders = validateCsvHeaders(headers);
          if (missingHeaders.length > 0) {
            reject(new Error(`Missing required columns: ${missingHeaders.join(', ')}`));
            return;
          }

          setProgress({ status: 'validating', progress: 50, message: 'Validating contacts...' });

          // Validate each row
          const contacts: ImportedContact[] = data.map((row, index) => {
            const validationErrors = validateContactRow(row, index + 2); // +2 for 1-based + header row
            
            return {
              ...row,
              email: row.email || '',
              isValid: validationErrors.length === 0,
              errors: validationErrors.map(e => e.message)
            };
          });

          resolve(contacts);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  }, []);

  const importContacts = useCallback(async (contacts: ImportedContact[]): Promise<ImportResult> => {
    setProgress({ status: 'uploading', progress: 75, message: 'Uploading contacts...' });

    try {
      // Filter out invalid contacts
      const validContacts = contacts.filter(c => c.isValid);
      const invalidContacts = contacts.filter(c => !c.isValid);

      let successful = 0;
      const errors: Array<{ row: number; contact: ImportedContact; error: string }> = [];

      // Import contacts one by one using GraphQL mutations
      for (let i = 0; i < validContacts.length; i++) {
        const contact = validContacts[i];
        
        try {
          const contactData = {
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            email: contact.email,
            phone: contact.phone || null,
            jobTitle: contact.jobTitle || null,
            department: contact.department || null,
            contactType: contact.contactType || 'CUSTOMER',
            linkedinUrl: contact.linkedinUrl || null,
            xingUrl: contact.xingUrl || null,
            bio: contact.bio || null,
            companyName: contact.companyName || null,
            recordState: 'ACTIVE',
            sourceApp: 'CRM'
          };

          await graphqlClient.request(INSERT_CONTACT_MUTATION, { contact: contactData });
          successful++;
        } catch (error) {
          errors.push({
            row: i + 2,
            contact,
            error: error instanceof Error ? error.message : 'Failed to create contact'
          });
        }

        // Update progress
        const progressPercent = 75 + Math.floor((i / validContacts.length) * 25);
        setProgress({ 
          status: 'uploading', 
          progress: progressPercent, 
          message: `Uploading contacts... (${i + 1}/${validContacts.length})` 
        });
      }

      // Add invalid contacts to errors
      invalidContacts.forEach((contact, index) => {
        errors.push({
          row: index + 2,
          contact,
          error: contact.errors.join(', ')
        });
      });

      const result: ImportResult = {
        total: contacts.length,
        successful,
        failed: contacts.length - successful,
        errors
      };

      setImportResult(result);
      setProgress({ 
        status: 'completed', 
        progress: 100, 
        message: `Import completed: ${result.successful} successful, ${result.failed} failed` 
      });

      return result;
    } catch (error) {
      setProgress({ 
        status: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'Import failed' 
      });
      throw error;
    }
  }, [context.accessToken, graphqlClient]);

  const processImport = useCallback(async (file: File): Promise<ImportResult> => {
    try {
      const contacts = await parseAndValidateCsv(file);
      return await importContacts(contacts);
    } catch (error) {
      setProgress({ 
        status: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'Import failed' 
      });
      throw error;
    }
  }, [parseAndValidateCsv, importContacts]);

  const resetImport = useCallback(() => {
    setProgress({ status: 'idle', progress: 0, message: '' });
    setImportResult(null);
  }, []);

  return {
    progress,
    importResult,
    processImport,
    resetImport
  };
};

