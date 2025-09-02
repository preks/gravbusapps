import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useGetCampaignTypes, CAMPAIGN_TYPE_CATALOG, CAMPAIGN_TYPE_VERSION } from '@/business-apps/crm/customers/apps/customer-relations/views/campaign-view/components/campaign-list/hooks/useGetCampaignTypes';
import type { CampaignFormValues, CampaignFormContextValue } from '../types';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import dayjs from 'dayjs';

interface ProviderProps {
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<CampaignFormValues>;
  onSubmit: (values: CampaignFormValues) => Promise<void>;
  onCancel: () => Promise<void>;
}

const CampaignFormContext = createContext<CampaignFormContextValue | null>(null);

export const useCampaignFormContext = (): CampaignFormContextValue => {
  const ctx = useContext(CampaignFormContext);
  if (!ctx) throw new Error('useCampaignFormContext must be used within CampaignFormProvider');
  return ctx;
};

export const CampaignFormProvider: React.FC<React.PropsWithChildren<ProviderProps>> = ({
  businessAppContext,
  initialValues,
  onSubmit,
  onCancel,
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive values from initialValues or process payload for update mode
  const payloadSalesCampaign = (businessAppContext?.additionalData as any)?.salesCampaign
    || (businessAppContext?.additionalData as any)?.psi_taskPayload?.psi_initialParameters?.salesCampaign
    || (businessAppContext?.additionalData as any)?.psi_taskPayload?.initialParameters?.salesCampaign
    || (businessAppContext?.additionalData as any)?.saveSalesCampaignModelInput?.salesCampaign
    || ((businessAppContext?.additionalData as any)?.salesCampaignId && { id: (businessAppContext?.additionalData as any)?.salesCampaignId })
    || ((businessAppContext?.additionalData as any)?.campaignId && { id: (businessAppContext?.additionalData as any)?.campaignId })
    || ((businessAppContext?.additionalData as any)?.id && { id: (businessAppContext?.additionalData as any)?.id })
    || ((businessAppContext?.additionalData as any)?.entityId && { id: (businessAppContext?.additionalData as any)?.entityId });
  const payloadChangeMode = (businessAppContext?.additionalData as any)?.changeMode
    || (businessAppContext?.additionalData as any)?.psi_taskPayload?.psi_initialParameters?.changeMode
    || (businessAppContext?.additionalData as any)?.psi_taskPayload?.initialParameters?.changeMode
    || (businessAppContext?.additionalData as any)?.saveSalesCampaignModelInput?.changeMode;

  const resolvedId = initialValues?.id ?? payloadSalesCampaign?.id;
  const resolvedVersion = initialValues?.version ?? payloadSalesCampaign?.version ?? 0;
  const resolvedName = initialValues?.name ?? payloadSalesCampaign?.name ?? '';
  const resolvedTypeRef = initialValues?.typeRef ?? payloadSalesCampaign?.typeRef ?? '';
  const resolvedStart = initialValues?.startDate ?? payloadSalesCampaign?.startDate ?? '';
  const resolvedEnd = initialValues?.endDate ?? payloadSalesCampaign?.endDate ?? '';
  const resolvedDescription = initialValues?.description ?? payloadSalesCampaign?.description ?? '';

  const [formValues, setFormValues] = useState<CampaignFormValues>({
    id: resolvedId,
    version: resolvedVersion,
    name: resolvedName,
    typeRef: resolvedTypeRef,
    startDate: resolvedStart ? dayjs(resolvedStart).format('YYYY-MM-DD') : '',
    endDate: resolvedEnd ? dayjs(resolvedEnd).format('YYYY-MM-DD') : '',
    description: resolvedDescription,
  });

  // If we have only an id and are in update mode, fetch existing values to prefill
  const graphqlClient = useGraphQLClient(businessAppContext.accessToken);
  useEffect(() => {
    const shouldFetch = Boolean(resolvedId) && (!resolvedName || !resolvedTypeRef || !resolvedStart || !resolvedEnd);
    if (!shouldFetch) return;
    let isCancelled = false;
    const query = `
      query GetSalesCampaignById($id: uuid!) {
        SalesCampaign(where: { id: { _eq: $id }, isDeleted: { _eq: false } }, limit: 1) {
          id
          name
          description
          startDate
          endDate
          typeRef
          version
        }
      }
    `;
    (async () => {
      try {
        const result = await graphqlClient.request<{ SalesCampaign: any[] }>(query, { id: resolvedId });
        const item = result?.SalesCampaign?.[0];
        if (!isCancelled && item) {
          setFormValues({
            id: item.id,
            version: item.version ?? 0,
            name: item.name ?? '',
            typeRef: item.typeRef ?? '',
            startDate: item.startDate ? dayjs(item.startDate).format('YYYY-MM-DD') : '',
            endDate: item.endDate ? dayjs(item.endDate).format('YYYY-MM-DD') : '',
            description: item.description ?? '',
          });
        }
      } catch (_) {
        // ignore and keep defaults
      }
    })();
    return () => {
      isCancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessAppContext.accessToken, resolvedId]);

  // Load campaign types from catalog (v2)
  const { campaignTypeOptions, isLoading: typesLoading, error: typesError } = useGetCampaignTypes(businessAppContext);
  useMemo(() => {
    setIsLoading(typesLoading);
    setError(typesError ? (typesError as any).message || 'Failed to load campaign types' : null);
  }, [typesLoading, typesError]);

  const value: CampaignFormContextValue = useMemo(
    () => ({
      businessAppContext,
      formValues,
      onSubmit,
      onCancel,
      isLoading,
      error,
      isUpdateMode: Boolean(initialValues?.id) || Boolean(resolvedId) || payloadChangeMode === 'UPDATE',
      campaignTypes: campaignTypeOptions.map((opt) => ({
        id: `${CAMPAIGN_TYPE_CATALOG}:${CAMPAIGN_TYPE_VERSION}:${opt.code || opt.value || opt.id}`,
        label: opt.label,
      })),
    }),
    [businessAppContext, JSON.stringify(formValues), onSubmit, onCancel, isLoading, error, initialValues?.id, resolvedId, payloadChangeMode, JSON.stringify(campaignTypeOptions)]
  );

  return <CampaignFormContext.Provider value={value}>{children}</CampaignFormContext.Provider>;
};


