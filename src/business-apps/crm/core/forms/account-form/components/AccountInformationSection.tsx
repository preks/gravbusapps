import React from 'react'
import { Input, Label, Card, CardContent, Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useAccountFormContext } from '../context/AccountFormContext'
import OwnerSelector from './OwnerSelector'
import SearchableSelect from '../../opportunity-form/components/SearchableSelect'

const prefixDataTestId = 'AccountForm'

const AccountInformationSection: React.FC = () => {
  const {
    formValues,
    setFormValues,
    error,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions,
    salesCampaigns,
    salesCampaignsLoading,
    salesCampaignsError,
    salesCampaignsHasMore,
    searchSalesCampaigns,
    loadMoreSalesCampaigns
  } = useAccountFormContext()

  return (
    <Card
      className="gba:border-0 gba:shadow-none gba:bg-transparent"
      style={{
        border: '0',
        borderWidth: '0',
        borderStyle: 'none',
        borderColor: 'transparent',
        boxShadow: 'none',
        padding: '0',
        background: 'transparent'
      }}
    >
      <CardContent
        className="gba:space-y-6 gba:p-0"
        style={{
          border: '0',
          borderWidth: '0',
          borderStyle: 'none',
          borderColor: 'transparent',
          padding: '0'
        }}
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Owner */}
        <div>
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Owner <span className="gba:text-red-500">*</span>
          </Label>
          <OwnerSelector
            value={formValues.owner}
            onChange={(value: string) => setFormValues({ owner: value })}
            employees={employeePositions}
            loading={employeePositionsLoading}
            hasMore={employeePositionsHasMore}
            onLoadMore={loadMoreEmployeePositions}
            onSearch={(searchTerm: string) => {
              searchEmployeePositions(searchTerm)
            }}
            error={employeePositionsError}
            dataTestId={formatDataTestId(prefixDataTestId, 'OwnerSelect')}
          />
        </div>

        {/* Account Name */}
        <div>
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Account Name <span className="gba:text-red-500">*</span>
          </Label>
          <Input
            name="accountName"
            value={formValues.accountName}
            onChange={e => setFormValues({ accountName: e.target.value })}
            placeholder="Please Enter..."
            className="gba:border-gray-300 gba:bg-hsl(var(--background))"
            data-testid={formatDataTestId(prefixDataTestId, 'AccountNameInput')}
          />
        </div>

        {/* Sales Campaign Section */}
        <div>
          <SearchableSelect
            label="Sales Campaign"
            name="salesCampaignId"
            value={formValues.salesCampaignId}
            placeholder="Please Select Campaign..."
            options={salesCampaigns as any}
            loading={salesCampaignsLoading}
            hasMore={salesCampaignsHasMore}
            onSearch={searchSalesCampaigns}
            onLoadMore={loadMoreSalesCampaigns}
            onChange={value => {
              setFormValues({
                salesCampaignId: value // Store only ID for backend
              })
            }}
            error={salesCampaignsError}
            className="gba:w-full gba:min-w-[300px]"
            data-testid={formatDataTestId(prefixDataTestId, 'CampaignSelect')}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default AccountInformationSection
