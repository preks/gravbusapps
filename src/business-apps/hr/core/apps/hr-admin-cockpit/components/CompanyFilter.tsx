import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { useActiveStructureCompanies } from '@/business-apps/hr/compensation-planning/hooks/useActiveStructureCompanies'
import { useDataQualityContext } from '../hooks/dataQualityHooks'
import translations from '../_i18n'

interface CompanyFilterProps {
  readonly accessToken: string
}

export function CompanyFilter({ accessToken }: Readonly<CompanyFilterProps>) {
  const { t } = useTranslation(translations)
  const ctx = useDataQualityContext()
  const { companies, loading: companiesLoading } = useActiveStructureCompanies(accessToken)

  return (
    <div className="gba:flex gba:items-center gba:gap-1">
      <Select
        disabled={companiesLoading}
        value={ctx.filters.companyId ?? '__all__'}
        onValueChange={v => ctx.setFilters(f => ({ ...f, companyId: v === '__all__' ? null : v }))}
      >
        <SelectTrigger className="gba:w-52" aria-label={t('company-filter-label')}>
          <SelectValue placeholder={t('company-filter-all')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('company-filter-all')}</SelectItem>
          {companies.map(c => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
