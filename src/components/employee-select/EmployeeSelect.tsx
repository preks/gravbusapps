import React from 'react';
import { Combobox, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system';
import { Building2, Briefcase } from 'lucide-react';

export interface EmployeeOption {
  id: string;
  displayName: string;
  pictureThumbnail?: string;
  organizationalUnitName?: string;
  jobPositionName?: string;
}

export interface EmployeeSelectProps {
  value?: string | null;
  employees: EmployeeOption[];
  onValueChange?: (value: string | null) => void;
  onSearch?: (q: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  ['data-testid']?: string;
}

const EmployeeSelect = React.forwardRef<HTMLButtonElement, EmployeeSelectProps & Record<string, any>>(({
  value,
  employees,
  onValueChange,
  onSearch,
  loading,
  hasMore,
  onLoadMore,
  placeholder = 'Search Employee...',
  searchPlaceholder = 'Type to search...',
  className,
  'data-testid': dataTestId = 'employee-select',
  ...rest
}, ref) => {
  const options: any[] = React.useMemo(() => {
    return (employees || []).map((a: EmployeeOption) => {
      const initials = (a.displayName || '?')
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      const hasOU = Boolean(a.organizationalUnitName);
      const hasJP = Boolean(a.jobPositionName);
      return {
        value: a.id,
        label: (
          <div className="gba:flex gba:items-start gba:gap-3 gba:w-full">
            <Avatar className="gba:self-center" size="sm">
              {a.pictureThumbnail ? (
                <AvatarImage
                  src={`data:image/jpeg;base64,${a.pictureThumbnail}`}
                  alt={a.displayName}
                />
              ) : (
                <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
              )}
            </Avatar>
            <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-1">
              <div className="gba:text-sm gba:font-medium gba:truncate gba:text-left">{a.displayName}</div>
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:text-xs gba:text-left">
                {hasOU ? (
                  <span className="gba:flex gba:items-center gba:gap-1">
                    <Building2 className="gba:w-3 gba:h-3" />{a.organizationalUnitName}
                  </span>
                ) : (
                  <span className="gba:opacity-0">&nbsp;</span>
                )}
                {(hasOU && hasJP) && <span>·</span>}
                {hasJP ? (
                  <span className="gba:flex gba:items-center gba:gap-1">
                    <Briefcase className="gba:w-3 gba:h-3" />{a.jobPositionName}
                  </span>
                ) : (
                  <span className="gba:opacity-0">&nbsp;</span>
                )}
              </div>
            </div>
          </div>
        ),
      } as any;
    });
  }, [employees]);

  return (
    <Combobox
      ref={ref as any}
      className={`nw:w-full nw:h-auto ${className || ''}`}
      options={options as any}
      value={value || ''}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={loading ? 'Loading...' : 'No employees found'}
      onSearch={onSearch}
      searchDebounce={300}
      loading={Boolean(loading)}
      onLoadMore={onLoadMore}
      hasMore={Boolean(hasMore)}
      data-testid={dataTestId}
      align="start"
      {...rest}
    />
  );
});

EmployeeSelect.displayName = 'EmployeeSelect';

export default EmployeeSelect;


