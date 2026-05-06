import React, { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@newwork/nw-design-system'
import { UserSelect, type UserSelectOption } from '@/components/user-select'
import { useUserManagementClient } from '@/common/network/users/useUserManagementClient'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

interface PlatformUserFieldProps {
  accessToken?: string
  initialUserId?: string | null
  dataTestIdPrefix?: string
}

const PlatformUserField: React.FC<PlatformUserFieldProps> = ({
  accessToken,
  initialUserId,
  dataTestIdPrefix = 'investment-contact-form'
}) => {
  const form = useFormContext<any>()
  const userClient = useUserManagementClient(accessToken || '')

  const [initialUser, setInitialUser] = useState<UserSelectOption | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchUser = async () => {
      if (initialUserId && accessToken) {
        try {
          const user = await userClient.getUserById(initialUserId)
          if (!cancelled) setInitialUser(user)
        } catch (error) {
          console.error('Failed to fetch user for contact:', error)
          if (!cancelled) setInitialUser(null)
        }
      } else if (!cancelled) {
        setInitialUser(null)
      }
    }

    fetchUser()
    return () => {
      cancelled = true
    }
  }, [initialUserId, accessToken, userClient])

  return (
    <FormField
      control={form.control}
      name="userId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Platform User</FormLabel>
          <FormControl>
            <UserSelect
              value={field.value || null}
              onValueChange={(userId: string | null) => field.onChange(userId || null)}
              accessToken={accessToken}
              initialUser={initialUser}
              placeholder="Search and assign a platform user..."
              activeOnly={true}
              data-testid={formatDataTestId(dataTestIdPrefix, 'user-select')}
            />
          </FormControl>
          <FormDescription className="gba:text-xs gba:text-muted-foreground">
            Assign a platform user to this contact for portal access
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export default PlatformUserField
export { PlatformUserField }
