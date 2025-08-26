import React, { useMemo, useState } from 'react';
import { Button, Input, Alert, AlertDescription, Spinner } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';

export type DocumentCreationEntityType = 'account' | 'contact' | 'lead';

export interface DocumentCreationPopupValues {
  entityType: DocumentCreationEntityType;
  entityId: string;
  parentDocument?: string | null;
  folder: boolean;
  name?: string;
}

export interface DocumentCreationPopupProps extends BusinessAppContextProps {
  initialValues?: Partial<DocumentCreationPopupValues>;
}

const prefixDataTestId = 'DocumentCreationPopup';

const DocumentCreationPopup: React.FC<DocumentCreationPopupProps> = ({ initialValues = {}, ...props }) => {
  const values = useMemo<DocumentCreationPopupValues>(() => {
    const src = { ...(props as any), ...(initialValues as any) } as any;
    const crm = src?.crmDocument || {};
    const accountId = src?.accountId || src?.account || crm?.account || '';
    const contactId = src?.contactId || src?.contact || crm?.contact || '';
    const leadId = src?.leadId || src?.lead || crm?.lead || '';

    let entityType: DocumentCreationEntityType = 'account';
    let entityId = '';
    if (accountId) { entityType = 'account'; entityId = String(accountId); }
    else if (contactId) { entityType = 'contact'; entityId = String(contactId); }
    else if (leadId) { entityType = 'lead'; entityId = String(leadId); }

    const computedFolder = Boolean(
      src?.folder === true || crm?.format === 'FOLDER' || (!crm?.file && !src?.file)
    );
    const parentDocument = src?.parentDocument ?? null;
    const name = src?.name ?? '';

    return {
      entityType,
      entityId,
      parentDocument,
      folder: computedFolder,
      name,
    } as DocumentCreationPopupValues;
  }, [initialValues, props]);

  const [name, setName] = useState<string>(values.name || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (values.folder ? 'Create Folder' : 'Create Document'), [values.folder]);
  const actionLabel = useMemo(() => (values.folder ? 'Create' : 'Create'), [values.folder]);

  const entityIdKey = useMemo(() => {
    switch (values.entityType) {
      case 'account': return 'accountId';
      case 'contact': return 'contactId';
      case 'lead': return 'leadId';
      default: return 'accountId';
    }
  }, [values.entityType]);

  const handleSubmit = async () => {
    setError(null);
    const trimmed = (name || '').trim();
    if (!trimmed) {
      setError('Please provide a name.');
      return;
    }
    try {
      setSubmitting(true);
      // Build crmDocument payload in the format expected by createCrmDocument
      const entityBindingKey = (() => {
        switch (values.entityType) {
          case 'account': return 'account';
          case 'contact': return 'contact';
          case 'lead': return 'lead';
          default: return 'account';
        }
      })();

      // Resolve a reliable entity id from multiple possible sources
      const source = { ...(props as any), ...(initialValues as any) } as any;
      const urlParams = new URLSearchParams(window.location.search);
      const idFromUrl = (() => {
        switch (values.entityType) {
          case 'account': return urlParams.get('accountId');
          case 'contact': return urlParams.get('contactId');
          case 'lead': return urlParams.get('leadId');
          default: return null;
        }
      })();
      const resolvedId =
        values.entityId ||
        source?.crmDocument?.[entityBindingKey] ||
        source?.[entityBindingKey] ||
        source?.accountId || source?.contactId || source?.leadId ||
        source?.account || source?.contact || source?.lead ||
        idFromUrl ||
        '';

      const crmDocument = {
        version: 0,
        name: trimmed,
        parentDocument: values.parentDocument || undefined,
        format: values.folder ? 'FOLDER' : 'FILE',
        [entityBindingKey]: resolvedId,
      } as Record<string, any>;

      dispatchProcessContinueEvent('pse_submit', {
        [entityIdKey]: resolvedId,
        crmDocument,
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to submit');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {});
  };

  return (
    <div className="gba:max-w-md gba:mx-auto gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
      {error && (
        <Alert variant="destructive" className="gba:mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="gba:mb-4">
        <h2 className="gba:text-xl gba:font-semibold" data-testid={formatDataTestId(prefixDataTestId, 'Title')}>{title}</h2>
      </div>

      <div className="gba:mb-4">
        <Input
          placeholder={initialValues.folder ? 'Folder name' : 'Document name'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
        />
      </div>

      <div className="gba:flex gba:gap-3">
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={submitting}
          data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={submitting || !name.trim()}
          data-testid={formatDataTestId(prefixDataTestId, 'CreateButton')}
        >
          {submitting ? <Spinner size="sm" /> : actionLabel}
        </Button>
      </div>
    </div>
  );
};

export default DocumentCreationPopup;
export { DocumentCreationPopup };


