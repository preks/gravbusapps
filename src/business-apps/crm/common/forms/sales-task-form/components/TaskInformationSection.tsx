import React from 'react'
import { Input, Avatar } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useSalesTaskFormContext } from '../context/SalesTaskFormContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const prefixDataTestId = 'SalesTaskForm-TaskInfo'

const TaskInformationSection: React.FC = () => {
  const { formValues, setFormValues, isUpdateMode, businessAppContext } = useSalesTaskFormContext()

  const { userInfo } = businessAppContext

  return (
    <div className="gba:space-y-6">
      {/* Owner Section */}
      <div>
        <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-3">
          Owner <span className="gba:text-red-500">*</span>
        </label>
        <div className="gba:flex gba:items-center gba:gap-4 gba:p-4 gba:bg-gray-50 gba:rounded-lg gba:border">
          <Avatar size={48} icon={<UserOutlined />} />
          <div className="gba:flex-1">
            <div className="gba:font-medium gba:text-gray-900">
              {userInfo?.employeeDetails?.firstName && userInfo?.employeeDetails?.lastName
                ? `${userInfo.employeeDetails.firstName} ${userInfo.employeeDetails.lastName}`
                : userInfo?.givenName && userInfo?.familyName
                  ? `${userInfo.givenName} ${userInfo.familyName}`
                  : userInfo?.userName || 'Current User'}
            </div>
            <div className="gba:text-sm gba:text-gray-500">Task Owner</div>
            <div className="gba:text-sm gba:text-gray-500">
              {userInfo?.employeeDetails?.organizationalUnit?.name || 'Default Team'}
            </div>
          </div>
          <button
            type="button"
            className="gba:text-blue-600 gba:hover:text-blue-800 gba:font-medium gba:text-sm"
            data-testid={formatDataTestId(prefixDataTestId, 'ChangeOwnerButton')}
          >
            Change
          </button>
        </div>
      </div>

      {/* Task Name */}
      <div>
        <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
          Task Name <span className="gba:text-red-500">*</span>
        </label>
        <Input
          data-testid={formatDataTestId(prefixDataTestId, 'TaskNameInput')}
          value={formValues.title}
          onChange={e => setFormValues({ title: e.target.value })}
          placeholder="Please Enter..."
          className="gba:w-full"
          maxLength={100}
        />
        {!formValues.title && (
          <div className="gba:text-red-500 gba:text-sm gba:mt-1">
            {getTranslationFromI18nKeyAndLabel('crm:salesTask.titleRequired', 'Name is required')}
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskInformationSection
