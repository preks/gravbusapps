import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input, Button } from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

const MAX_NAME_LENGTH = 64

interface CreateJobPositionModalProps {
  visible: boolean
  organizationalUnitId: string
  organizationalUnitName: string
  accessToken: string
  structureId: string
  onCancel: () => void
  onSuccess: (newJobPositionId?: string) => void
}

const CreateJobPositionModal: React.FC<CreateJobPositionModalProps> = ({
  visible,
  organizationalUnitId,
  organizationalUnitName,
  accessToken,
  structureId,
  onCancel,
  onSuccess
}) => {
  const [name, setName] = useState('')
  const [count, setCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const restClient = useRestClient(env('NEXT_PUBLIC_BASE_URL'))
  const orgchartRestClient = useRestClient(`${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`)

  const isFormValid = name.trim().length > 0 && name.length <= MAX_NAME_LENGTH && count >= 1

  const handleSubmit = async () => {
    if (!isFormValid) return

    setLoading(true)
    setError(null)
    try {
      const createPayload = {
        basicJobPosition: {
          name: name.trim()
        },
        count
      }

      const response = await restClient.post('/processes/employee/createBulkJobPosition', createPayload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      const jobPositions = response?.jobPositions || []

      if (jobPositions.length === 0) {
        throw new Error('Failed to get job positions from response')
      }

      const assignmentPayload = jobPositions.map((jp: { id: string; name?: string }) => ({
        structureId,
        jobPositionId: jp.id,
        organizationalUnitId,
        employeeId: null,
        jobPositionName: jp.name || name.trim()
      }))

      await orgchartRestClient.post('/employee-assignments/organizational-unit', assignmentPayload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      onSuccess(jobPositions[0]?.id)
      handleClose()
    } catch (err) {
      console.error('Error creating job position:', err)
      setError('Failed to create job position. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setCount(1)
    setError(null)
    onCancel()
  }

  return (
    <Dialog open={visible} onOpenChange={open => !open && handleClose()}>
      <DialogContent data-testid="create-job-position-modal" className="gba:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Job Position</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
              Name<span className="gba:text-destructive"> *</span>
            </label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Please Enter..."
              maxLength={MAX_NAME_LENGTH}
              data-testid="job-position-name-input"
            />
          </div>

          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
              Total open<span className="gba:text-destructive"> *</span>
            </label>
            <Input
              type="number"
              min={1}
              value={count}
              onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              data-testid="job-position-count-input"
            />
          </div>

          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
              Organizational Unit
            </label>
            <Input value={organizationalUnitName} disabled className="gba:bg-muted" />
          </div>

          {error && <div className="gba:text-destructive gba:text-sm">{error}</div>}

          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4">
            <Button variant="outline" onClick={handleClose} data-testid="create-job-position-cancel">
              Cancel
            </Button>
            <Button
              variant="default"
              disabled={!isFormValid || loading}
              onClick={handleSubmit}
              data-testid="create-job-position-submit"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateJobPositionModal
