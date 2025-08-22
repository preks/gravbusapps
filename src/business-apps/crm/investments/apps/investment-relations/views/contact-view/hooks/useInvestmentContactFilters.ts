import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { DataFilterGroup, DataFilter } from "@/components/data-filter/DataFilter";
import { DateRangeFilter } from "@/business-apps/crm/common/components/lead-list/components/DateRangeFilter";

interface SimpleItem { id: string; label: string; }

export const useInvestmentContactFilters = (
  context: BusinessAppContextProps,
  selectedFilters: string[],
  setSelectedFilters: (filters: string[]) => void
) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const [owners, setOwners] = useState<SimpleItem[]>([]);
  const [languages, setLanguages] = useState<SimpleItem[]>([]);
  const [saluations, setSaluations] = useState<SimpleItem[]>([]);
  const [titles, setTitles] = useState<SimpleItem[]>([]);

  const [loading, setLoading] = useState({ owners: false, languages: false, saluations: false, titles: false });
  const [errors, setErrors] = useState<{ [k: string]: Error | null }>({});

  // Birth date range filter state
  const [birthDateAfter, setBirthDateAfter] = useState<string | undefined>(undefined);
  const [birthDateBefore, setBirthDateBefore] = useState<string | undefined>(undefined);

  const loadDistinct = useCallback(async (key: string, search: string = "") => {
    if (!context.accessToken) return;
    const setL = (k: keyof typeof loading, v: boolean) => setLoading(prev => ({ ...prev, [k]: v }));
    const setE = (k: string, e: Error | null) => setErrors(prev => ({ ...prev, [k]: e }));
    try {
      switch (key) {
        case 'owners':
          setL('owners', true); setE('owners', null);
          const ownersRes = await graphqlClient.request<{ InvestmentContact: Array<{ ownerEmployee: { id: string; displayName?: string; firstName?: string; lastName?: string } | null }> }>(`
            query GetContactOwners {
              InvestmentContact(
                where: { isDeleted: { _eq: false }, ownerEmployee: { id: { _isNull: false } ${search.trim() ? `, _or: [ { firstName: { _ilike: "%${search}%" } }, { lastName: { _ilike: "%${search}%" } }, { displayName: { _ilike: "%${search}%" } } ]` : ''} } }
                distinctOn: [ownerEmployeeId]
                limit: 50
              ) {
                ownerEmployee { id displayName firstName lastName }
              }
            }
          `);
          setOwners((ownersRes.InvestmentContact || []).filter(r => r.ownerEmployee).map(r => {
            const e = r.ownerEmployee!; const label = e.displayName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown';
            return { id: e.id, label };
          }));
          setL('owners', false);
          break;
        case 'languages':
          setL('languages', true); setE('languages', null);
          const langRes = await graphqlClient.request<{ InvestmentContact: Array<{ language: { id: string; code?: string; value?: string } | null }> }>(`
            query GetContactLanguages {
              InvestmentContact(
                where: { isDeleted: { _eq: false } ${search.trim() ? `, language: { _or: [ { code: { _ilike: "%${search}%" } }, { value: { _ilike: "%${search}%" } } ] }` : ''} }
                distinctOn: [languageId]
                limit: 50
              ) { language { id code value } }
            }
          `);
          setLanguages((langRes.InvestmentContact || []).filter(r => r.language).map(r => {
            const l = r.language!; return { id: l.id, label: l.code || l.value || 'Language' };
          }));
          setL('languages', false);
          break;
        case 'saluations':
          setL('saluations', true); setE('saluations', null);
          const salRes = await graphqlClient.request<{ InvestmentContact: Array<{ salutation: { id: string; code?: string; value?: string } | null }> }>(`
            query GetContactSaluations {
              InvestmentContact(
                where: { isDeleted: { _eq: false } ${search.trim() ? `, salutation: { _or: [ { code: { _ilike: "%${search}%" } }, { value: { _ilike: "%${search}%" } } ] }` : ''} }
                distinctOn: [salutationId]
                limit: 50
              ) { salutation { id code value } }
            }
          `);
          setSaluations((salRes.InvestmentContact || []).filter(r => r.salutation).map(r => {
            const s = r.salutation!; return { id: s.id, label: s.code || s.value || 'Salutation' };
          }));
          setL('saluations', false);
          break;
        case 'titles':
          setL('titles', true); setE('titles', null);
          const titRes = await graphqlClient.request<{ InvestmentContact: Array<{ academicTitle: { id: string; code?: string; value?: string } | null }> }>(`
            query GetContactTitles {
              InvestmentContact(
                where: { isDeleted: { _eq: false } ${search.trim() ? `, academicTitle: { _or: [ { code: { _ilike: "%${search}%" } }, { value: { _ilike: "%${search}%" } } ] }` : ''} }
                distinctOn: [academicTitleId]
                limit: 50
              ) { academicTitle { id code value } }
            }
          `);
          setTitles((titRes.InvestmentContact || []).filter(r => r.academicTitle).map(r => {
            const t = r.academicTitle!; return { id: t.id, label: t.code || t.value || 'Title' };
          }));
          setL('titles', false);
          break;
      }
    } catch (e) {
      setE(key, e as Error);
      setL(key as any, false);
    }
  }, [context.accessToken, graphqlClient]);

  useEffect(() => {
    loadDistinct('owners');
    loadDistinct('languages');
    loadDistinct('saluations');
    loadDistinct('titles');
  }, [loadDistinct]);

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    owners.forEach(o => { map[`owner:${o.id}`] = o.label; });
    languages.forEach(l => { map[`language:${l.id}`] = l.label; });
    saluations.forEach(s => { map[`salutation:${s.id}`] = s.label; });
    titles.forEach(t => { map[`title:${t.id}`] = t.label; });
    return map;
  }, [owners, languages, saluations, titles]);

  const toFilters = useCallback((items: SimpleItem[], prefix: string): DataFilter[] => {
    return items.map(i => ({ id: `${prefix}:${i.id}`, label: i.label, selected: selectedFilters.includes(`${prefix}:${i.id}`) }));
  }, [selectedFilters]);

  const filterGroups: DataFilterGroup[] = useMemo(() => [
    {
      id: 'owners',
      title: 'Owner',
      filters: toFilters(owners, 'owner'),
      backendSearch: (search: string) => ({ filters: toFilters(owners, 'owner'), loading: loading.owners, error: errors.owners })
    },
    {
      id: 'languages',
      title: 'Language',
      filters: toFilters(languages, 'language'),
      backendSearch: (search: string) => ({ filters: toFilters(languages, 'language'), loading: loading.languages, error: errors.languages })
    },
    {
      id: 'saluations',
      title: 'Salutation',
      filters: toFilters(saluations, 'salutation'),
      backendSearch: (search: string) => ({ filters: toFilters(saluations, 'salutation'), loading: loading.saluations, error: errors.saluations })
    },
    {
      id: 'titles',
      title: 'Academic Title',
      filters: toFilters(titles, 'title'),
      backendSearch: (search: string) => ({ filters: toFilters(titles, 'title'), loading: loading.titles, error: errors.titles })
    },
    {
      id: 'birthDate',
      title: 'Birth Date',
      customComponent: React.createElement(DateRangeFilter as any, {
        createdAfter: birthDateAfter,
        createdBefore: birthDateBefore,
        onDateRangeChange: (after?: string, before?: string) => {
          setBirthDateAfter(after);
          setBirthDateBefore(before);
        },
        className: "gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent",
      }),
      hideSearch: true,
    }
  ], [owners, languages, saluations, titles, loading, errors, toFilters, birthDateAfter, birthDateBefore]);

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilters(selected ? [...selectedFilters, filterId] : selectedFilters.filter(f => f !== filterId));
  }, [selectedFilters, setSelectedFilters]);

  return { filterGroups, filterLabelMap, handleFilterChange, birthDateAfter, birthDateBefore };
};


