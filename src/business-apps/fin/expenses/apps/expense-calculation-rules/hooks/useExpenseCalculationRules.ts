import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useExpenseCalculationRulesQueries } from '../queries/ExpenseCalculationRules.queries';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';

export interface CalculationTypeOption {
  id: string;
  code: string;
  value: string;
  translations?: { localeCode: string; value: string }[];
}

export interface ExpenseRuleListItem {
  id: string;
  code?: string;
  name?: string;
  calculationType?: any;
  standard?: boolean;
  activeFrom?: string | null;
  activeTo?: string | null;
  currency?: any;
}

export interface UseExpenseCalculationRulesResult {
  items: ExpenseRuleListItem[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  calculationTypes: CalculationTypeOption[];
  reload: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (value: string) => void;
  setSort: (field: string, order: 'ASC' | 'DESC' | '') => void;
  setValidityRange: (from: string | null, to: string | null) => void;
  setStandard: (value: boolean | null) => void;
  setSelectedCalculationCodes: (codes: string[]) => void;
  setSelectedCurrencyCodes: (codes: string[]) => void;
  currentPage: number;
  pageSize: number;
  search: string;
  sortField: string | null;
  sortOrder: 'ASC' | 'DESC' | '';
  validityFrom: string | null;
  validityTo: string | null;
  standard: boolean | null;
  selectedCalculationCodes: string[];
  selectedCurrencyCodes: string[];
}

export const useExpenseCalculationRules = (
  context: BusinessAppContextProps
): UseExpenseCalculationRulesResult => {
  const { fetchCalculationTypes, fetchExpenseRules } = useExpenseCalculationRulesQueries(context);

  const [items, setItems] = useState<ExpenseRuleListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('');
  const [validityFrom, setValidityFrom] = useState<string | null>(null);
  const [validityTo, setValidityTo] = useState<string | null>(null);
  const [standard, setStandard] = useState<boolean | null>(null);
  const [selectedCalculationCodes, setSelectedCalculationCodes] = useState<string[]>([]);
  const [selectedCurrencyCodes, setSelectedCurrencyCodes] = useState<string[]>([]);

  const [calculationTypes, setCalculationTypes] = useState<CalculationTypeOption[]>([]);

  const orderBy = useMemo(() => {
    if (!sortField || !sortOrder) return undefined;
    const dir = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST';
    if (sortField === 'calculation') {
      return [{ calculationTypeRef: dir } as any];
    }
    if (sortField === 'currency') {
      return [{ currency: { code: dir } } as any];
    }
    return [{ [sortField]: dir } as any];
  }, [sortField, sortOrder]);

  const buildWhere = useCallback(() => {
    const where: any = { code: { _isNull: false }, isDeleted: { _eq: false } };

    if (search && search.trim()) {
      const pattern = `%${search.trim()}%`;
      where._or = [
        { code: { _ilike: pattern } },
        { name: { _ilike: pattern } },
      ];
    }
    if (typeof standard === 'boolean') {
      where.standard = { _eq: standard };
    }
    if (validityFrom) {
      where.activeFrom = { _gte: validityFrom };
    }
    if (validityTo) {
      where.activeTo = { _lte: validityTo };
    }
    if (selectedCalculationCodes?.length) {
      where.calculationTypeRef = { code: { _in: selectedCalculationCodes } } as any;
    }
    if (selectedCurrencyCodes?.length) {
      where.currency = { code: { _in: selectedCurrencyCodes } } as any;
    }
    return where;
  }, [search, standard, validityFrom, validityTo, selectedCalculationCodes, selectedCurrencyCodes]);

  // Load calculation types ONCE
  const typesLoadedRef = useRef(false);
  useEffect(() => {
    if (!context.accessToken || typesLoadedRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const types = await fetchCalculationTypes();
        if (!cancelled) setCalculationTypes(types as any);
      } catch {}
      finally {
        if (!cancelled) typesLoadedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [context.accessToken]);

  // Load rules whenever dependencies change
  useEffect(() => {
    if (!context.accessToken) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const where = buildWhere();
        const offset = (currentPage - 1) * pageSize;
        const { ExpenseRule, ExpenseRuleAggregate } = await fetchExpenseRules({
          orderBy,
          limit: pageSize,
          offset,
          where,
          activeUserLocale: getCurrentActiveUserLocale(),
        });
        if (!cancelled) {
          setItems(ExpenseRule as any);
          const aggCount = (ExpenseRuleAggregate && (ExpenseRuleAggregate as any).aggregate && (ExpenseRuleAggregate as any).aggregate.count) ?? 0;
          setTotalCount(aggCount);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load rules');
          setItems([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [context.accessToken, buildWhere, currentPage, pageSize, orderBy, fetchExpenseRules]);

  // no standalone setSort helper; use inline setter in return to avoid extra re-creations

  return {
    items,
    totalCount,
    isLoading,
    error,
    calculationTypes,
    reload: () => {
      // trigger by flipping a harmless dependency: just set page to same value to re-run effect
      setCurrentPage((p) => p);
    },
    setPage: setCurrentPage,
    setPageSize,
    setSearch: (v: string) => { 
      if (v !== search) {
        setCurrentPage(1);
        setSearch(v);
      }
    },
    setSort: (field, order) => { 
      const nextField = field || null;
      const nextOrder = order;
      const changed = (nextField !== sortField) || (nextOrder !== sortOrder);
      if (changed) setCurrentPage(1);
      setSortField(nextField); 
      setSortOrder(nextOrder); 
    },
    setValidityRange: (from, to) => { 
      const changed = (from !== validityFrom) || (to !== validityTo);
      if (changed) setCurrentPage(1);
      setValidityFrom(from); 
      setValidityTo(to); 
    },
    setStandard: (v) => { 
      const changed = v !== standard;
      if (changed) setCurrentPage(1);
      setStandard(v); 
    },
    setSelectedCalculationCodes: (codes) => { 
      const sameLen = codes?.length === selectedCalculationCodes?.length;
      const sameVals = sameLen && codes.every((c, i) => c === selectedCalculationCodes[i]);
      const changed = !sameVals;
      if (changed) setCurrentPage(1);
      setSelectedCalculationCodes(codes); 
    },
    setSelectedCurrencyCodes: (codes: string[]) => { 
      const sameLen = codes?.length === selectedCurrencyCodes?.length;
      const sameVals = sameLen && codes.every((c, i) => c === selectedCurrencyCodes[i]);
      const changed = !sameVals;
      if (changed) setCurrentPage(1);
      setSelectedCurrencyCodes(codes); 
    },
    currentPage,
    pageSize,
    search,
    sortField,
    sortOrder,
    validityFrom,
    validityTo,
    standard,
    selectedCalculationCodes,
    selectedCurrencyCodes,
  };
};


