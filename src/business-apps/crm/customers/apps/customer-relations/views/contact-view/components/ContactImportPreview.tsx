import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '@newwork/nw-design-system';
import { ImportedContact } from '../types/importTypes';

interface ContactImportPreviewProps {
  contacts: ImportedContact[];
  maxRows?: number;
}

/**
 * ContactImportPreview component
 * 
 * Displays a preview of contacts that will be imported with validation status.
 * This is a placeholder for future enhancement to show parsed CSV data before import.
 */
export const ContactImportPreview: React.FC<ContactImportPreviewProps> = ({
  contacts,
  maxRows = 10
}) => {
  const previewContacts = contacts.slice(0, maxRows);

  return (
    <div className="gba:space-y-2" data-testid="contact-import-preview">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-sm gba:font-medium">Preview ({contacts.length} contacts)</h3>
        {contacts.length > maxRows && (
          <p className="gba:text-xs gba:text-muted-foreground">
            Showing first {maxRows} of {contacts.length}
          </p>
        )}
      </div>

      <div className="gba:border gba:rounded-md gba:overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-12">Status</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Job Title</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewContacts.map((contact, index) => (
              <TableRow key={index}>
                <TableCell>
                  {contact.isValid ? (
                    <Badge variant="success" className="gba:text-xs">✓</Badge>
                  ) : (
                    <Badge variant="destructive" className="gba:text-xs">✗</Badge>
                  )}
                </TableCell>
                <TableCell>{contact.firstName || '-'}</TableCell>
                <TableCell>{contact.lastName || '-'}</TableCell>
                <TableCell>{contact.email || '-'}</TableCell>
                <TableCell>{contact.phone || '-'}</TableCell>
                <TableCell>{contact.jobTitle || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {contacts.some(c => !c.isValid) && (
        <div className="gba:mt-2">
          <p className="gba:text-xs gba:text-destructive gba:font-medium">
            {contacts.filter(c => !c.isValid).length} contact(s) have validation errors and will not be imported.
          </p>
        </div>
      )}
    </div>
  );
};

