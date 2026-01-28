import React from 'react'
import { FormField, FormItem, FormControl, FormMessage, Button, Input } from '@newwork/nw-design-system'
import { PiPlus, PiTrash, PiSmiley } from 'react-icons/pi'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export const HobbiesArrayField: React.FC = () => {
  const form = useFormContext<any>()

  // Use field array for multiple hobbies
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'hobbies'
  })

  const handleAddHobby = () => {
    append({
      hobby: ''
    })
  }

  const handleRemoveHobby = (index: number) => {
    remove(index)
  }

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
          <PiSmiley className="gba:w-5 gba:h-5" />
          Hobbies & Interests
        </h3>
      </div>

      {fields.length === 0 && (
        <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
          No hobbies added. Click the button below to add your hobbies and interests.
        </div>
      )}

      <div className="gba:space-y-3">
        {fields.map((field, hobbyIndex) => (
          <div key={field.id} className="gba:flex gba:items-start gba:gap-2">
            <div className="gba:flex-1">
              <FormField
                control={form.control}
                name={`hobbies.${hobbyIndex}.hobby`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Reading, Hiking, Photography"
                        data-testid={formatDataTestId('job-candidate-form', `hobby-${hobbyIndex}`)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={() => handleRemoveHobby(hobbyIndex)}
              className="gba:text-destructive hover:gba:bg-destructive-secondary gba:mt-1"
              data-testid={formatDataTestId('job-candidate-form', `hobby-remove-${hobbyIndex}`)}
              aria-label="Remove hobby"
            >
              <PiTrash className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Hobby Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddHobby}
        className="gba:w-full gba:mt-2"
        data-testid={formatDataTestId('job-candidate-form', 'hobby-add')}
      >
        <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
        Add Hobby
      </Button>
    </div>
  )
}
