import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@newwork/nw-design-system'
import { PiPlus, PiTrash, PiLightbulb } from 'react-icons/pi'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

// Separate component for each skill item
const SkillItem: React.FC<{
  skillIndex: number
  onRemove: () => void
}> = ({ skillIndex, onRemove }) => {
  const form = useFormContext<any>()

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <PiLightbulb className="gba:w-5 gba:h-5" />
            Skill {skillIndex + 1}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            onClick={onRemove}
            className="gba:text-destructive hover:gba:bg-destructive-secondary"
            data-testid={formatDataTestId('job-candidate-form', `skill-remove-${skillIndex}`)}
            aria-label="Remove skill"
          >
            <PiTrash className="gba:w-4 gba:h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          <FormField
            control={form.control}
            name={`skills.${skillIndex}.skillName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skill Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., JavaScript, Project Management, Leadership"
                    data-testid={formatDataTestId('job-candidate-form', `skill-name-${skillIndex}`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`skills.${skillIndex}.level`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proficiency Level</FormLabel>
                <FormControl>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger data-testid={formatDataTestId('job-candidate-form', `skill-level-${skillIndex}`)}>
                      <SelectValue placeholder="Select proficiency level..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                      <SelectItem value="Expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`skills.${skillIndex}.skillId`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skill ID (Optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="External skill identifier"
                    data-testid={formatDataTestId('job-candidate-form', `skill-id-${skillIndex}`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export const SkillsArrayField: React.FC = () => {
  const form = useFormContext<any>()

  // Use field array for multiple skills
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'skills'
  })

  const handleAddSkill = () => {
    append({
      skillName: '',
      level: '',
      skillId: ''
    })
  }

  const handleRemoveSkill = (index: number) => {
    remove(index)
  }

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
          <PiLightbulb className="gba:w-5 gba:h-5" />
          Skills & Competencies
        </h3>
      </div>

      {fields.length === 0 && (
        <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
          No skills added. Click the button below to add your skills and competencies.
        </div>
      )}

      {fields.map((field, skillIndex) => (
        <SkillItem key={field.id} skillIndex={skillIndex} onRemove={() => handleRemoveSkill(skillIndex)} />
      ))}

      {/* Add Skill Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddSkill}
        className="gba:w-full gba:mt-2"
        data-testid={formatDataTestId('job-candidate-form', 'skill-add')}
      >
        <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
        Add Skill
      </Button>
    </div>
  )
}
