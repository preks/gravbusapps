import React from 'react';
import { Input } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useContactFormContext } from '../context/ContactFormContext';
import OwnerSelector from './OwnerSelector';

const prefixDataTestId = 'ContactForm';

const OwnerInformationSection: React.FC = () => {
  const {
    formValues,
    setFormValues,
    error,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions,
  } = useContactFormContext();

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <div className="gba:p-6 gba:space-y-6">
        {error && (
          <div className="gba:text-red-700 gba:text-sm gba:p-3 gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-lg">
            {error}
          </div>
        )}

        {/* Owner */}
        <div>
          <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Owner <span className="gba:text-red-500">*</span>
          </label>
          <OwnerSelector
            value={formValues.ownerEmployeeId}
            onChange={(value: string) => setFormValues({ ownerEmployeeId: value })}
            employees={employeePositions}
            loading={employeePositionsLoading}
            hasMore={employeePositionsHasMore}
            onLoadMore={loadMoreEmployeePositions}
            onSearch={(searchTerm: string) => {
              searchEmployeePositions(searchTerm);
            }}
            error={employeePositionsError}
            dataTestId={formatDataTestId(prefixDataTestId, 'OwnerSelect')}
          />
        </div>

        {/* First and Last Name - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              First Name <span className="gba:text-red-500">*</span>
            </label>
            <Input
              id="firstName"
              name="firstName"
              value={formValues.firstName}
              onChange={(e) => setFormValues({ firstName: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'FirstNameInput')}
            />
          </div>

          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Last Name <span className="gba:text-red-500">*</span>
            </label>
            <Input
              id="lastName"
              name="lastName"
              value={formValues.lastName}
              onChange={(e) => setFormValues({ lastName: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'LastNameInput')}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Email <span className="gba:text-red-500">*</span>
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formValues.email}
            onChange={(e) => setFormValues({ email: e.target.value })}
            placeholder="Please Enter..."
            data-testid={formatDataTestId(prefixDataTestId, 'EmailInput')}
          />
        </div>

        {/* Phone and Fax - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Phone
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formValues.phone}
              onChange={(e) => setFormValues({ phone: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'PhoneInput')}
            />
          </div>

          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Fax
            </label>
            <Input
              id="fax"
              name="fax"
              type="tel"
              value={formValues.fax}
              onChange={(e) => setFormValues({ fax: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'FaxInput')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerInformationSection; 