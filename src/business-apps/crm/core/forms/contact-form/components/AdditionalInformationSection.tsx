import React, { useState } from 'react'
import { useContactFormContext } from '../context/ContactFormContext'
import { Input, Label, Textarea, Card, CardContent, Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { PiCaretDown, PiCaretUp } from 'react-icons/pi'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const prefixDataTestId = 'ContactForm'

const AdditionalInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed

  const { formValues, setFormValues, error } = useContactFormContext()

  return (
    <Card
      className="gba:border-0 gba:shadow-none gba:bg-transparent gba:p-0"
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
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-4 gba:py-2 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-lg gba:text-sm gba:bg-gradient-to-r gba:from-info-secondary gba:to-info"
        style={{
          transition: 'all 0.3s ease',
          border: '0',
          borderWidth: '0',
          borderStyle: 'none',
          borderColor: 'transparent',
          outline: 'none',
          outlineWidth: '0',
          outlineStyle: 'none',
          boxShadow: 'none',
          borderRadius: '12px'
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'AdditionalInfoToggle')}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">Additional Information</span>
        </div>
        <div className="gba:flex gba:items-center">
          {isExpanded ? (
            <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-700" />
          ) : (
            <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-700" />
          )}
        </div>
      </Button>

      {isExpanded && (
        <CardContent
          className="gba:space-y-6 gba:bg-hsl(var(--background)) gba:border-0 gba:p-4 gba:mt-0"
          style={{
            border: '0',
            borderWidth: '0',
            borderStyle: 'none',
            borderColor: 'transparent',
            padding: '16px',
            marginTop: '0'
          }}
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Notes Summary */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Notes Summary</Label>
            <Textarea
              name="notesSummary"
              value={formValues.notesSummary}
              onChange={e => setFormValues({ notesSummary: e.target.value })}
              placeholder="Please Enter..."
              rows={4}
              className="gba:border-gray-300 gba:bg-hsl(var(--background))"
              data-testid={formatDataTestId(prefixDataTestId, 'NotesSummaryTextarea')}
            />
          </div>

          {/* Record State */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Record State</Label>
            <Input
              name="recordState"
              value={formValues.recordState}
              onChange={e => setFormValues({ recordState: e.target.value })}
              placeholder="Please Enter..."
              className="gba:border-gray-300 gba:bg-hsl(var(--background))"
              data-testid={formatDataTestId(prefixDataTestId, 'RecordStateInput')}
            />
          </div>

          {/* Version (for updates) */}
          {formValues.version !== undefined && (
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Version</Label>
              <Input
                name="version"
                type="number"
                value={formValues.version || ''}
                onChange={e => setFormValues({ version: parseInt(e.target.value) || 0 })}
                placeholder="Please Enter..."
                disabled
                className="gba:border-gray-300 gba:bg-hsl(var(--background))"
                data-testid={formatDataTestId(prefixDataTestId, 'VersionInput')}
              />
            </div>
          )}

          {/* ID (for updates) */}
          {formValues.id && (
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Contact ID</Label>
              <Input
                name="contactId"
                value={formValues.id}
                placeholder="System generated"
                disabled
                className="gba:border-gray-300 gba:bg-hsl(var(--background))"
                data-testid={formatDataTestId(prefixDataTestId, 'ContactIdInput')}
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default AdditionalInformationSection
