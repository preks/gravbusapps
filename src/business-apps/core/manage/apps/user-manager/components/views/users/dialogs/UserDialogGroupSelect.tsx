import { type Control } from 'react-hook-form'
import { Checkbox, FormControl, FormField, FormItem, FormLabel, Spinner } from '@newwork/nw-design-system'
import type { GroupRecord } from '@/common/network/users/types'
import type { CreateFormValues } from './userDialogFormConfig'

export function UserDialogGroupSelect({
  control,
  groups,
  groupsLoading,
  label
}: Readonly<{
  control: Control<CreateFormValues>
  groups: GroupRecord[]
  groupsLoading: boolean
  label: string
}>) {
  return (
    <div>
      <FormLabel className="gba:mb-2 gba:block">{label}</FormLabel>
      {groupsLoading ? (
        <Spinner data-testid="user-management-user-dialog-groups-loading" />
      ) : (
        <div
          className="gba:max-h-40 gba:overflow-y-auto gba:space-y-2 gba:border gba:rounded gba:p-2"
          data-testid="user-management-user-dialog-groups-list"
        >
          {groups.map(group => (
            <FormField
              key={group.id}
              control={control}
              name="groupIds"
              render={({ field }) => {
                const selected = field.value ?? []
                const withoutGroup = selected.filter(id => id !== group.id)
                const handleCheckedChange = (isChecked: boolean | 'indeterminate') => {
                  field.onChange(isChecked === true ? [...selected, group.id] : withoutGroup)
                }
                return (
                  <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-2 gba:space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={selected.includes(group.id)}
                        onCheckedChange={handleCheckedChange}
                        data-testid={`user-management-user-dialog-group-${group.id}`}
                      />
                    </FormControl>
                    <FormLabel className="gba:font-normal">{group.displayName || group.name}</FormLabel>
                  </FormItem>
                )
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
