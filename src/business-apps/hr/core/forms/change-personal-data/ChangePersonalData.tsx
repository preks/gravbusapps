import React, { useMemo, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import FormHeader from '../components/FormHeader';
import UploadComponent from '../components/UploadComponent';
import flowIconUrl from '@/assets/icons/flowSmall.svg';
import { ChangePersonalDataProvider, useChangePersonalData } from './ChangePersonalDataContext';

export interface ChangePersonalDataFormProps extends BusinessAppContextProps {}

const ChangePersonalDataContent: React.FC<ChangePersonalDataFormProps> = () => {
  const [fileList, setFileList] = useState<any[]>([]);

  const title = useMemo(() =>
    getTranslationFromI18nKeyAndLabel(
      'lowcoder:employee_profile.employee_tabs.flows_button.change_personal_data',
      'Change Personal Data'
    ),
    []
  );


  return (
    <div className="gba:mx-auto gba:font-primary gba:flex gba:flex-col" style={{ width: '100%', maxWidth: '800px' }} data-testid="change-personal-data-form-container">
      <FormHeader title={title} flowIconUrl={flowIconUrl} />

      <div className="gba:flex gba:flex-col gba:gap-4" data-testid="change-personal-data-form-content">
        <UploadComponent
          dataTestIdPrefix="change-personal-data"
          multiple={false}
          fileList={fileList}
          setFileList={setFileList}
        />
      </div>
    </div>
  );
};

export const ChangePersonalData: React.FC<ChangePersonalDataFormProps> = (context) => {
  return (
    <ChangePersonalDataProvider {...context}>
      <ChangePersonalDataContent {...context} />
    </ChangePersonalDataProvider>
  );
};

export default ChangePersonalData;


