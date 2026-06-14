import React from 'react'
import { Button, Input, Label } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, UploadSimpleIcon } from '@phosphor-icons/react'

interface ContractAssetPickerProps {
  selectedLabel: string
  onOpenSearch: () => void
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  accept?: string
}

const ContractAssetPicker: React.FC<ContractAssetPickerProps> = ({
  selectedLabel,
  onOpenSearch,
  onFileChange,
  accept
}) => (
  <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
    <Button variant="outline" type="button" onClick={onOpenSearch} data-testid="customer-360-contract-search-asset">
      <MagnifyingGlassIcon className="gba:size-4" />
      Pick from Drive
    </Button>
    <Label
      htmlFor="customer-360-contract-upload"
      className="gba:inline-flex gba:h-9 gba:cursor-pointer gba:items-center gba:gap-2 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm gba:font-medium gba:shadow-sm hover:gba:bg-accent"
    >
      <UploadSimpleIcon className="gba:size-4" />
      Upload file
    </Label>
    <Input
      id="customer-360-contract-upload"
      type="file"
      accept={accept}
      className="gba:hidden"
      onChange={onFileChange}
      data-testid="customer-360-contract-upload-input"
    />
    <span className="gba:text-sm gba:text-muted-foreground">{selectedLabel}</span>
  </div>
)

export default ContractAssetPicker
