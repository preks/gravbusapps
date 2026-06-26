import React, { useState } from 'react';
import { Button } from '@newwork/nw-design-system';
import { Upload } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ContactImportDialog } from './ContactImportDialog';

interface ContactImportButtonProps extends BusinessAppContextProps {
  onImportSuccess?: () => void;
}

export const ContactImportButton: React.FC<ContactImportButtonProps> = (props) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        data-testid="contact-import-button"
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="gba:flex gba:items-center gba:gap-2"
      >
        <Upload className="gba:h-4 gba:w-4" />
        Import Contacts
      </Button>

      <ContactImportDialog
        {...props}
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          setIsDialogOpen(false);
          props.onImportSuccess?.();
        }}
      />
    </>
  );
};

