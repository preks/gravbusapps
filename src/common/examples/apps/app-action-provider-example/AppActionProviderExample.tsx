'use client'

import React, { useState } from 'react'
import {
  Textarea,
  Label,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
  Form
} from '@newwork/nw-design-system'
import { AppActionProvider } from '@/components/app-action-provider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface AppActionProviderExampleProps extends BusinessAppContextProps {
  'data-testid'?: string
}

// Define Zod schema for form validation
const noteSchema = z.object({
  note: z.string().min(1, 'Note is required').max(1000, 'Note must be less than 1000 characters').trim()
})

type NoteFormData = z.infer<typeof noteSchema>

/**
 * Example screen demonstrating AppActionProvider usage
 * Shows how to create a form with a TextArea that executes a process
 */
export const AppActionProviderExample: React.FC<AppActionProviderExampleProps> = ({
  accessToken,
  'data-testid': dataTestId = 'app-action-component-example'
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = useForm<NoteFormData>({
    defaultValues: { note: '' },
    resolver: zodResolver(noteSchema)
  })

  const transformData = (formData: NoteFormData) => {
    return {
      investmentNote: {
        investment: '90e298a0-e19f-4244-84b6-3b8dfb83c746',
        title: 'Test Note',
        text: formData.note
      },
      changeMode: 'INSERT'
    }
  }

  const handleSuccess = () => {
    form.reset({ note: '' })
    setSuccessMessage('Note created successfully!')
    setErrorMessage(null)

    setTimeout(() => setSuccessMessage(null), 5000)
  }

  const handleError = (error: Error) => {
    setErrorMessage(error.message)
    setSuccessMessage(null)
  }

  return (
    <div className="gba:p-6 gba:max-w-2xl gba:mx-auto" data-testid={dataTestId}>
      <div className="gba:mb-6">
        <h1 className="gba:text-2xl gba:font-bold gba:mb-2" data-testid={`${dataTestId}-title`}>
          Investment Note Creation
        </h1>
        <p className="gba:text-muted-foreground" data-testid={`${dataTestId}-description`}>
          Create a new investment note using the AppActionProvider
        </p>
      </div>

      {successMessage && (
        <Alert
          variant="default"
          className="gba:mb-4 gba:bg-success gba:text-success-foreground"
          data-testid={`${dataTestId}-success-message`}
        >
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="gba:mb-4" data-testid={`${dataTestId}-error-message`}>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <AppActionProvider
        contextsArray={[FlowContextName.investmentNoteCreate]}
        externalContextData={{
          investmentId: '90e298a0-e19f-4244-84b6-3b8dfb83c746'
        }}
        prefixDataTestId="investment-note"
        accessToken={accessToken}
        onSuccess={handleSuccess}
        onError={handleError}
        transformData={transformData}
      >
        {({ executeAction, isLoading, isProcessing }) => {
          const handleSubmit = async (formData: NoteFormData) => {
            await executeAction(formData)
          }

          const isFormLoading = isLoading || isProcessing

          return (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="note" data-testid={`${dataTestId}-note-label`}>
                        Investment Note
                      </Label>
                      <FormControl>
                        <Textarea
                          {...field}
                          id="note"
                          placeholder="Enter your investment note here..."
                          className="gba:min-h-[120px]"
                          disabled={isFormLoading}
                          data-testid={`${dataTestId}-note-textarea`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="gba:flex gba:justify-end">
                  <Button type="submit" disabled={isFormLoading} data-testid={`${dataTestId}-submit-button`}>
                    {isFormLoading ? 'Creating...' : 'Create Note'}
                  </Button>
                </div>
              </form>
            </Form>
          )
        }}
      </AppActionProvider>
    </div>
  )
}

export default AppActionProviderExample
