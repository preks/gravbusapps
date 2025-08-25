import React, { useEffect, useMemo, useState } from 'react';
import type { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

interface AuditInvestmentLike {
  createdAt?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  version?: number | null;
}

interface AuditInfoPanelProps {
  show: boolean;
  investment: AuditInvestmentLike | null | undefined;
  context?: BusinessAppContextProps;
  userNamesById?: Record<string, string>;
  'data-testid'?: string;
}

const AuditInfoPanel: React.FC<AuditInfoPanelProps> = ({ show, investment, context, userNamesById: externalNames, 'data-testid': dataTestId = 'audit-info-panel' }) => {
  const [userNamesById, setUserNamesById] = useState<Record<string, string>>(externalNames || {});
  const graphqlClient = context?.accessToken ? useGraphQLClient(context.accessToken) : null;

  const userIdsToResolve = useMemo(() => {
    if (!investment) return [] as string[];
    const ids = [investment.createdBy || '', investment.updatedBy || ''].filter(Boolean) as string[];
    return Array.from(new Set(ids));
  }, [investment?.createdBy, investment?.updatedBy]);

  useEffect(() => {
    if (externalNames) return; // honor provided mapping
    const fetchUsers = async () => {
      if (!graphqlClient || userIdsToResolve.length === 0) return;
      const whereIn = userIdsToResolve.map(id => `"${id}"`).join(', ');
      const employeeOr = userIdsToResolve.map(id => `{ additionalProperties: { _contains: { userId: "${id}" } } }`).join(', ');
      const query = `
        query ResolveAuditUsers {
          BusinessPartnerPerson(where: { userId: { _in: [${whereIn}] } }) {
            userId
            firstName
            lastName
            preferredName
          }
          Employee(where: { _or: [${employeeOr}] }) {
            additionalProperties
            displayName
            firstName
            lastName
          }
        }
      `;
      try {
        const result = await graphqlClient.request<{
          BusinessPartnerPerson: Array<{ userId?: string | null; firstName?: string | null; lastName?: string | null; preferredName?: string | null }>;
          Employee: Array<{ additionalProperties?: any; displayName?: string | null; firstName?: string | null; lastName?: string | null }>;
        }>(query);
        const mapping: Record<string, string> = {};
        for (const p of result.BusinessPartnerPerson || []) {
          const uid = p.userId || '';
          if (!uid) continue;
          const bestName = p.preferredName || [p.firstName, p.lastName].filter(Boolean).join(' ');
          if (bestName) mapping[uid] = bestName;
        }
        for (const e of result.Employee || []) {
          const uid = e?.additionalProperties?.userId as string | undefined;
          if (!uid || mapping[uid]) continue;
          const bestName = e.displayName || [e.firstName, e.lastName].filter(Boolean).join(' ');
          if (bestName) mapping[uid] = bestName;
        }
        if (Object.keys(mapping).length) setUserNamesById(prev => ({ ...prev, ...mapping }));
      } catch (e) {
        // Silently ignore; fall back to UUID display
      }
    };
    fetchUsers();
  }, [graphqlClient, userIdsToResolve, externalNames]);

  if (!show || !investment) return null;

  return (
    <div className="gba:mt-3 gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4 gba:bg-gray-50 gba:border gba:rounded-md gba:p-3" data-testid={dataTestId}>
      <div>
        <div className="gba:text-xs gba:text-gray-500">{getTranslationFromI18nKeyAndLabel('crm.common.createdAt', 'Created At')}</div>
        <div className="gba:text-sm gba:font-semibold gba:text-gray-900">{investment.createdAt ? new Date(investment.createdAt).toLocaleString('de-DE') : '-'}</div>
      </div>
      <div>
        <div className="gba:text-xs gba:text-gray-500">{getTranslationFromI18nKeyAndLabel('crm.common.createdBy', 'Created By')}</div>
        <div className="gba:text-sm gba:font-semibold gba:text-gray-900">{investment.createdBy ? (userNamesById[investment.createdBy] || '-') : '-'}</div>
      </div>
      <div>
        <div className="gba:text-xs gba:text-gray-500">{getTranslationFromI18nKeyAndLabel('crm.common.updatedAt', 'Updated At')}</div>
        <div className="gba:text-sm gba:font-semibold gba:text-gray-900">{investment.updatedAt ? new Date(investment.updatedAt).toLocaleString('de-DE') : '-'}</div>
      </div>
      <div>
        <div className="gba:text-xs gba:text-gray-500">{getTranslationFromI18nKeyAndLabel('crm.common.updatedBy', 'Updated By')}</div>
        <div className="gba:text-sm gba:font-semibold gba:text-gray-900">{investment.updatedBy ? (userNamesById[investment.updatedBy] || '-') : '-'}</div>
      </div>
      <div>
        <div className="gba:text-xs gba:text-gray-500">{getTranslationFromI18nKeyAndLabel('crm.common.version', 'Version')}</div>
        <div className="gba:text-sm gba:font-semibold gba:text-gray-900">{typeof investment.version === 'number' ? investment.version : '-'}</div>
      </div>
    </div>
  );
};

export default AuditInfoPanel;


