import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Input, Checkbox } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetMileageRulesData } from '../../../queries/MileageRuleQueries';

interface NameFilterProps extends BusinessAppContextProps {
  value: string[];
  onChange: (value: string[]) => void;
  prefixDataTestId?: string;
}

export const NameFilter: React.FC<NameFilterProps> = ({
  value: selectedNames,
  onChange,
  prefixDataTestId = 'mileage-rule-name-filter',
  ...context
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { fetchPaginatedRuleNames } = useGetMileageRulesData(context);

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
    loadNames(true);
  }, [debouncedSearch]);

  const loadNames = async (reset: boolean = false) => {
    if (isLoading) return;

    setIsLoading(true);
    const currentOffset = reset ? 0 : offset;

    try {
      console.log('🔍 Fetching rule names:', {
        limit: LIMIT,
        offset: currentOffset,
        search: debouncedSearch || 'none',
        reset
      });

      const result = await fetchPaginatedRuleNames({
        limit: LIMIT,
        offset: currentOffset,
        search: debouncedSearch || undefined
      });

      const newNames = result.MileageRule.map(rule => rule.name);
      
      console.log('✅ Rule names fetched:', {
        count: newNames.length,
        hasMore: newNames.length === LIMIT
      });
      
      if (reset) {
        setNames(newNames);
        setOffset(LIMIT);
      } else {
        setNames(prev => [...prev, ...newNames]);
        setOffset(prev => prev + LIMIT);
      }

      setHasMore(newNames.length === LIMIT);
    } catch (error) {
      console.error('❌ Error loading rule names:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollPercentage = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;

    if (scrollPercentage > 80 && hasMore && !isLoading) {
      loadNames(false);
    }
  }, [hasMore, isLoading, offset]);

  const handleToggle = (name: string) => {
    const newSelectedNames = selectedNames.includes(name)
      ? selectedNames.filter(n => n !== name)
      : [...selectedNames, name];
    onChange(newSelectedNames);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setOffset(0);
    setNames([]);
    setHasMore(true);
  };

  return (
    <div className="gba:space-y-2" data-testid={prefixDataTestId}>
      <label className="gba:text-sm gba:font-medium">Name</label>
      
      <Input
        placeholder="Search names..."
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
        {names.length === 0 && !isLoading ? (
          <div className="gba:text-sm gba:text-gray-500 gba:p-2">
            {searchTerm ? 'No matching names' : 'No rule names available'}
          </div>
        ) : (
          <div className="gba:space-y-1">
            {names.map((name) => (
              <div key={name} className="gba:py-1">
                <Checkbox
                  checked={selectedNames.includes(name)}
                  onChange={() => handleToggle(name)}
                  data-testid={`${prefixDataTestId}-${name}`}
                >
                  {name}
                </Checkbox>
              </div>
            ))}
            {isLoading && (
              <div className="gba:text-xs gba:text-gray-500 gba:text-center gba:py-2">
                Loading...
              </div>
            )}
            {hasMore && !isLoading && names.length > 0 && (
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
