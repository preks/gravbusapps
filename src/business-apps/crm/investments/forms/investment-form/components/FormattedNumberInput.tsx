import React, { forwardRef } from 'react';
import { Input } from '@newwork/nw-design-system';

interface FormattedNumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Just pass through all props to Input
}

const FormattedNumberInput = forwardRef<HTMLInputElement, FormattedNumberInputProps>((props, ref) => {
  return (
    <Input
      {...props}
      ref={ref}
      type="number"
      step="0.01"
      min="0"
    />
  );
});

FormattedNumberInput.displayName = 'FormattedNumberInput';

export default FormattedNumberInput; 