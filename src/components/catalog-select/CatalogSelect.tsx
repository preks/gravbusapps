import React from 'react';
import {
  Combobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

type Variant = 'combobox' | 'select';

export interface CatalogSelectProps extends Partial<BusinessAppContextProps> {
  catalogInstanceId: string; // unique instance id from config (e.g. "birthCountry", "residenceCountry")
  variant?: Variant; // optional; auto-detected when using provider
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  onSearch?: (q: string) => void; // override; otherwise provider wiring
  loading?: boolean; // override; otherwise provider wiring
  options?: Array<{ value: string; label: string | React.ReactNode }>; // override
  hasMore?: boolean; // override
  onLoadMore?: () => void; // override
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  ['data-testid']?: string;
}

import { useCatalogSelectController } from './CatalogSelectProvider';

const CatalogSelect: React.FC<CatalogSelectProps> = ({
  variant,
  catalogInstanceId,
  value,
  onValueChange,
  onSearch,
  loading,
  options,
  hasMore,
  onLoadMore,
  placeholder = 'Select... ',
  searchPlaceholder = 'Type to search... ',
  disabled,
  className,
  'data-testid': dataTestId,
}) => {
  // Try to wire up via provider
  const controller = useCatalogSelectController(catalogInstanceId);
  const wiredVariant = variant ?? controller?.variant ?? 'combobox';
  const wiredOptions = options ?? controller?.options ?? [];
  const wiredLoading = loading ?? controller?.loading ?? false;
  const wiredHasMore = hasMore ?? controller?.hasMore ?? false;
  const wiredOnLoadMore = onLoadMore ?? controller?.onLoadMore;
  const wiredOnSearch = onSearch ?? controller?.onSearch;
  const wiredDisabled = disabled ?? controller?.disabled ?? false;
  const wiredHasOptions = controller?.hasOptions ?? true;
  const wiredControllerValue = controller?.value ?? null;
  const effectiveValue = value !== undefined ? value : wiredControllerValue;
  
  // If parent passes a controlled value but provider updates internally (e.g., bi-directional auto-select),
  // sync the controlled prop back by invoking onValueChange to keep external state in sync.
  const isControlled = value !== undefined;
  React.useEffect(() => {
    if (!isControlled || !onValueChange) return;
    
    // Simple sync: if controller and controlled values differ, notify parent
    const ctrl = wiredControllerValue;
    const controlled = value;
    
    // Normalize both values for comparison (null vs '' are equivalent)
    const normalizedCtrl = ctrl || '';
    const normalizedControlled = controlled || '';
    
    if (normalizedCtrl !== normalizedControlled) {
      onValueChange(ctrl);
    }
  }, [isControlled, onValueChange, wiredControllerValue, value]);
  const testId = dataTestId || `catalog-select-${catalogInstanceId}-${wiredVariant}`;

  // Do not force a no-op search; rely on prefetched options and sentinel observer
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const setSentinelRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node || !wiredOnLoadMore || !wiredHasMore) return;
    // Use dropdown viewport as root if available to get correct intersection behavior
    let root: Element | undefined = undefined;
    const parent = node.parentElement;
    if (parent) {
      // find nearest scrollable parent
      let cur: Element | null = parent;
      while (cur) {
        const style = window.getComputedStyle(cur);
        const overflowY = style.overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          root = cur;
          break;
        }
        cur = cur.parentElement;
      }
    }
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) {
        wiredOnLoadMore();
      }
    }, { root });
    observerRef.current = obs;
    obs.observe(node);
  }, [wiredHasMore, wiredOnLoadMore]);

  const comboboxOptions = React.useMemo(() => {
    return wiredOptions.map((o) => ({ value: String(o.value), label: typeof o.label === 'string' ? o.label : '' }));
  }, [wiredOptions]);

  // Use a more stable key that doesn't change during search
  const stableKey = `${catalogInstanceId}-${wiredVariant}-${wiredDisabled ? 'd' : 'e'}`;

  // Ensure stable handlers so internal Combobox can call latest callbacks even if it captured initial ones
  const onLoadMoreRef = React.useRef<typeof wiredOnLoadMore | undefined>(wiredOnLoadMore);
  const onSearchRef = React.useRef<typeof wiredOnSearch | undefined>(wiredOnSearch);
  React.useEffect(() => { onLoadMoreRef.current = wiredOnLoadMore; }, [wiredOnLoadMore]);
  React.useEffect(() => { onSearchRef.current = wiredOnSearch; }, [wiredOnSearch]);
  const handleLoadMore = React.useCallback(() => {
    const fn = onLoadMoreRef.current;
    if (fn) fn();
  }, [catalogInstanceId, wiredHasMore]);
  const handleSearch = React.useCallback((q: string) => {
    const fn = onSearchRef.current;
    if (fn) fn(q);
  }, [catalogInstanceId]);

  // Debug effect to track component mount and option changes
  React.useEffect(() => {
    return () => {};
  }, []); // Empty deps = mount/unmount only

  React.useEffect(() => {
  }, [catalogInstanceId, wiredVariant, wiredOptions.length, wiredHasMore, wiredLoading, wiredDisabled, effectiveValue, wiredControllerValue, value, isControlled, onValueChange]);

  const handleExternalValueChange = React.useCallback((v: string | null | undefined) => {
    const normalized: string | null = v && v.length > 0 ? v : null;
    if (controller?.setValue) {
      controller.setValue(normalized);
    }
    onValueChange?.(normalized);
  }, [controller, onValueChange]);

  // Clear value when field becomes disabled or has no options
  React.useEffect(() => {
    if ((wiredDisabled || !wiredHasOptions) && effectiveValue) {
      handleExternalValueChange(null);
    }
  }, [wiredDisabled, wiredHasOptions, effectiveValue, handleExternalValueChange]);

  if (wiredVariant === 'combobox') {
    return (
      <Combobox
        key={stableKey}
        className={`gba:w-full gba:h-auto ${className || ''}`}
        options={comboboxOptions}
        value={effectiveValue || ''}
        onValueChange={(v) => handleExternalValueChange(v)}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={wiredLoading ? 'Loading...' : 'No results'}
        onSearch={handleSearch}
        searchDebounce={300}
        loading={Boolean(wiredLoading)}
        onLoadMore={handleLoadMore}
        hasMore={Boolean(wiredHasMore)}
        data-testid={testId}
        align="start"
        disabled={wiredDisabled}
      />
    );
  }

  return (
    <Select
      key={stableKey}
      value={effectiveValue || ''}
      onValueChange={(v) => handleExternalValueChange(v)}
      disabled={wiredDisabled}
    >
      <SelectTrigger className={`gba:w-full ${className || ''}`} data-testid={testId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {wiredOptions.map((opt) => (
          <SelectItem key={String(opt.value)} value={String(opt.value)}>
            {opt.label as any}
          </SelectItem>
        ))}
        {wiredHasMore ? (
          <div
            ref={setSentinelRef}
            data-testid={`${testId}-load-more-sentinel`}
          >
            {wiredLoading ? 'Loading...' : ''}
          </div>
        ) : null}
      </SelectContent>
    </Select>
  );
};

export default CatalogSelect;


