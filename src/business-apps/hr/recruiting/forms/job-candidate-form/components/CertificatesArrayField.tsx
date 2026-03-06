import React from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Button,
  Input,
  DateInput,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon, CertificateIcon } from '@phosphor-icons/react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

// Separate component for each certificate item
const CertificateItem: React.FC<{
  certificateIndex: number
  onRemove: () => void
}> = ({ certificateIndex, onRemove }) => {
  const form = useFormContext<any>()

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <CertificateIcon className="gba:w-5 gba:h-5" />
            Certificate {certificateIndex + 1}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            onClick={onRemove}
            className="gba:text-destructive hover:gba:bg-destructive-secondary"
            data-testid={formatDataTestId('job-candidate-form', `certificate-remove-${certificateIndex}`)}
            aria-label="Remove certificate"
          >
            <TrashIcon className="gba:w-4 gba:h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-4">
          <FormField
            control={form.control}
            name={`certificates.${certificateIndex}.title`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certificate Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    data-testid={formatDataTestId('job-candidate-form', `certificate-title-${certificateIndex}`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`certificates.${certificateIndex}.institute`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issuing Organization</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    data-testid={formatDataTestId('job-candidate-form', `certificate-institute-${certificateIndex}`)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name={`certificates.${certificateIndex}.validFrom`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Date</FormLabel>
                  <FormControl>
                    <DateInput
                      {...field}
                      data-testid={formatDataTestId('job-candidate-form', `certificate-validFrom-${certificateIndex}`)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`certificates.${certificateIndex}.validTo`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date</FormLabel>
                  <FormControl>
                    <DateInput
                      {...field}
                      data-testid={formatDataTestId('job-candidate-form', `certificate-validTo-${certificateIndex}`)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name={`certificates.${certificateIndex}.locality`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Locality / City</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    data-testid={formatDataTestId('job-candidate-form', `certificate-locality-${certificateIndex}`)}
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

export const CertificatesArrayField: React.FC = () => {
  const form = useFormContext<any>()

  // Use field array for multiple certificates
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'certificates'
  })

  const handleAddCertificate = () => {
    append({
      title: '',
      institute: '',
      validFrom: '',
      validTo: '',
      locality: ''
    })
  }

  const handleRemoveCertificate = (index: number) => {
    remove(index)
  }

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
          <CertificateIcon className="gba:w-5 gba:h-5" />
          Certificates & Certifications
        </h3>
      </div>

      {fields.length === 0 && (
        <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
          No certificates added. Click the button below to add your professional certifications.
        </div>
      )}

      {fields.map((field, certificateIndex) => (
        <CertificateItem
          key={field.id}
          certificateIndex={certificateIndex}
          onRemove={() => handleRemoveCertificate(certificateIndex)}
        />
      ))}

      {/* Add Certificate Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddCertificate}
        className="gba:w-full gba:mt-2"
        data-testid={formatDataTestId('job-candidate-form', 'certificate-add')}
      >
        <PlusIcon className="gba:w-4 gba:h-4 gba:mr-2" />
        Add Certificate
      </Button>
    </div>
  )
}
