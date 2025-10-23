import React from 'react'
import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext'

interface EditLeadProps extends BusinessAppContextProps {
  leadData: any
  onCancel: () => void
  onSave: (data: any) => void
}

const EditLead: React.FC<EditLeadProps> = ({ onCancel }) => {
  return (
    <div className="gba:edit-lead-container" data-testid="edit-lead-container">
      <h2>Edit Lead</h2>
      <p>Edit functionality will be implemented in future steps</p>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}

export default EditLead
