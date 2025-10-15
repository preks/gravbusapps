import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Input, Checkbox } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetMileageRulesData } from '../../../queries/MileageRuleQueries';

interface RuleCodeFilterProps extends BusinessAppContextProps {
  value: string[];
  onChange: (value: string[]) => void;
  prefixDataTestId?: string;
}

export const RuleCodeFilter: React.FC<RuleCodeFilterProps> = ({
  value: selectedCodes,
  onChange,
  prefixDataTestId = 'mileage-rule-code-filter',
  ...context
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { fetchPaginatedRuleCodes } = useGetMileageRulesData(context);

  const LIMIT = 50;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('⏱️ Debounce complete, triggering search:', searchTerm || 'empty');
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load initial data or when search changes
  useEffect(() => {
    loadCodes(true);
  }, [debouncedSearch]);

  const loadCodes = async (reset: boolean = false) => {
    if (isLoading) return;

    setIsLoading(true);
    const currentOffset = reset ? 0 : offset;

    try {
      console.log('🔍 Fetching rule codes:', {
        limit: LIMIT,
        offset: currentOffset,
        search: debouncedSearch || 'none',
        reset
      });

      const result = await fetchPaginatedRuleCodes({
        limit: LIMIT,
        offset: currentOffset,
        search: debouncedSearch || undefined
      });

      const newCodes = result.MileageRule.map(rule => rule.code);
      
      console.log('✅ Rule codes fetched:', {
        count: newCodes.length,
        hasMore: newCodes.length === LIMIT
      });
      
      if (reset) {
        setCodes(newCodes);
        setOffset(LIMIT);
      } else {
        setCodes(prev => [...prev, ...newCodes]);
        setOffset(prev => prev + LIMIT);
      }

      setHasMore(newCodes.length === LIMIT);
    } catch (error) {
      console.error('❌ Error loading rule codes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollPercentage = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;

    if (scrollPercentage > 80 && hasMore && !isLoading) {
      loadCodes(false);
    }
  }, [hasMore, isLoading, offset]);

  const handleToggle = (code: string) => {
    const newSelectedCodes = selectedCodes.includes(code)
      ? selectedCodes.filter(c => c !== code)
      : [...selectedCodes, code];
    onChange(newSelectedCodes);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setOffset(0);
    setCodes([]);
    setHasMore(true);
  };

  return (
    <div className="gba:space-y-2" data-testid={prefixDataTestId}>
      <label className="gba:text-sm gba:font-medium">Rule Code</label>
      
      <Input
        placeholder="Search codes..."
        value={searchTerm}
        onChange={handleSearchChange}
        allowClear
        size="small"
        data-testid={`${prefixDataTestId}-search`}
      />
      
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ 
          maxHeight: '200px', 
          overflowY: 'auto',
          padding: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        } as React.CSSProperties}
        className="[&::-webkit-scrollbar]:gba:hidden"
        data-testid={`${prefixDataTestId}-list`}
      >
        {codes.length === 0 && !isLoading ? (
          <div className="gba:text-sm gba:text-gray-500 gba:p-2">
            {searchTerm ? 'No matching codes' : 'No rule codes available'}
          </div>
        ) : (
          <div className="gba:space-y-1">
            {codes.map((code) => (
              <div key={code} className="gba:py-1">
                <Checkbox
                  checked={selectedCodes.includes(code)}
                  onChange={() => handleToggle(code)}
                  data-testid={`${prefixDataTestId}-${code}`}
                >
                  {code}
                </Checkbox>
              </div>
            ))}
            {isLoading && (
              <div className="gba:text-xs gba:text-gray-500 gba:text-center gba:py-2">
                Loading...
              </div>
            )}
            {hasMore && !isLoading && codes.length > 0 && (
              <div className="gba:text-xs gba:text-gray-500 gba:text-center gba:py-2 gba:border-t gba:mt-2">
                Scroll for more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
