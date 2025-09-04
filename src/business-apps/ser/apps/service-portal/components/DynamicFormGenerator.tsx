import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  Badge,
  Spinner
} from '@newwork/nw-design-system';
import { 
  DynamicFormField, 
  DynamicFormValues, 
  ValidationRule 
} from '../../../types/flowTemplate';
import { 
  CheckCircle, 
  Warning, 
  Calendar,
  Hash,
  Envelope,
  Link as LinkIcon
} from '@phosphor-icons/react';

export interface DynamicFormGeneratorProps {
  schema: DynamicFormField[];
  initialValues?: DynamicFormValues;
  onValuesChange?: (values: DynamicFormValues) => void;
  onSubmit: (values: DynamicFormValues) => Promise<void>;
  isSubmitting?: boolean;
  submitButtonText?: string;
  title?: string;
  description?: string;
}

interface FieldError {
  field: string;
  message: string;
}

export const DynamicFormGenerator: React.FC<DynamicFormGeneratorProps> = ({
  schema,
  initialValues = {},
  onValuesChange,
  onSubmit,
  isSubmitting = false,
  submitButtonText = 'Submit Request',
  title = 'Request Details',
  description
}) => {
  const [values, setValues] = useState<DynamicFormValues>(initialValues);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Validation functions
  const validateField = useCallback((field: DynamicFormField, value: any): string | null => {
    if (!field.validation) return null;

    for (const rule of field.validation) {
      switch (rule.type) {
        case 'required':
          if (!value || (typeof value === 'string' && !value.trim())) {
            return rule.message || `${field.label} is required`;
          }
          break;
        
        case 'minLength':
          if (typeof value === 'string' && value.length < (rule.value as number)) {
            return rule.message || `${field.label} must be at least ${rule.value} characters`;
          }
          break;
          
        case 'maxLength':
          if (typeof value === 'string' && value.length > (rule.value as number)) {
            return rule.message || `${field.label} must not exceed ${rule.value} characters`;
          }
          break;
          
        case 'email':
          if (value && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return rule.message || `${field.label} must be a valid email address`;
          }
          break;
          
        case 'url':
          if (value && typeof value === 'string' && !/^https?:\/\/.+/.test(value)) {
            return rule.message || `${field.label} must be a valid URL`;
          }
          break;
          
        case 'pattern':
          if (value && typeof value === 'string' && rule.value) {
            const regex = new RegExp(rule.value as string);
            if (!regex.test(value)) {
              return rule.message || `${field.label} format is invalid`;
            }
          }
          break;
          
        case 'min':
          if (typeof value === 'number' && value < (rule.value as number)) {
            return rule.message || `${field.label} must be at least ${rule.value}`;
          }
          break;
          
        case 'max':
          if (typeof value === 'number' && value > (rule.value as number)) {
            return rule.message || `${field.label} must not exceed ${rule.value}`;
          }
          break;
      }
    }
    
    return null;
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FieldError[] = [];
    
    schema.forEach(field => {
      const value = values[field.name];
      const error = validateField(field, value);
      if (error) {
        newErrors.push({ field: field.name, message: error });
      }
    });
    
    setErrors(newErrors);
    return newErrors.length === 0;
  }, [schema, values, validateField]);

  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    const newValues = { ...values, [fieldName]: value };
    setValues(newValues);
    onValuesChange?.(newValues);
    
    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(fieldName));
    
    // Clear field error if it exists
    setErrors(prev => prev.filter(error => error.field !== fieldName));
  }, [values, onValuesChange]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouchedFields(new Set(schema.map(field => field.name)));
    
    if (validateForm()) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
  }, [schema, validateForm, onSubmit, values]);

  // Get field error
  const getFieldError = useCallback((fieldName: string): string | null => {
    const error = errors.find(err => err.field === fieldName);
    return error ? error.message : null;
  }, [errors]);

  // Check if field should show validation
  const shouldShowValidation = useCallback((fieldName: string): boolean => {
    return touchedFields.has(fieldName);
  }, [touchedFields]);

  // Render different field types
  const renderField = useCallback((field: DynamicFormField) => {
    const value = values[field.name] ?? '';
    const error = getFieldError(field.name);
    const showValidation = shouldShowValidation(field.name);
    const hasError = showValidation && error;

    const commonProps = {
      id: field.name,
      required: field.required,
      placeholder: field.placeholder,
      className: hasError ? 'gba:border-red-500' : ''
    };

    switch (field.type) {
      case 'TEXT':
        return (
          <div className="gba:space-y-2" key={field.name}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
              {field.label}
              {field.required && <span className="gba:text-red-500 gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-gray-500">{field.description}</p>
            )}
            <Input
              {...commonProps}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-red-600 gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'EMAIL':
        return (
          <div className="gba:space-y-2" key={field.name}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
              <Envelope className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
              {field.label}
              {field.required && <span className="gba:text-red-500 gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-gray-500">{field.description}</p>
            )}
            <Input
              {...commonProps}
              type="email"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-red-600 gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'URL':
        return (
          <div className="gba:space-y-2" key={field.name}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
              <LinkIcon className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
              {field.label}
              {field.required && <span className="gba:text-red-500 gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-gray-500">{field.description}</p>
            )}
            <Input
              {...commonProps}
              type="url"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-red-600 gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'NUMBER':
        return (
          <div className="gba:space-y-2" key={field.name}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
              <Hash className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
              {field.label}
              {field.required && <span className="gba:text-red-500 gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-gray-500">{field.description}</p>
            )}
            <Input
              {...commonProps}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || '')}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-red-600 gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'TEXTAREA':
        return (
          <div className="gba:space-y-2" key={field.name}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
              {field.label}
              {field.required && <span className="gba:text-red-500 gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-gray-500">{field.description}</p>
            )}
            <Textarea
              {...commonProps}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
              rows={4}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-red-600 gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'SELECT':
        return (
          <div className="gba:space-y-2" key={field.name}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
              {field.label}
              {field.required && <span className="gba:text-red-500 gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-gray-500">{field.description}</p>
            )}
            <Select
              value={value}
              onValueChange={(newValue) => handleFieldChange(field.name, newValue)}
            >
              <SelectTrigger className={hasError ? 'gba:border-red-500' : ''}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-red-600 gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'DATE':
        return (
          <div className="gba:space-y-2" key={field.name}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
              <Calendar className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
              {field.label}
              {field.required && <span className="gba:text-red-500 gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-gray-500">{field.description}</p>
            )}
            <Input
              {...commonProps}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-red-600 gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      default:
        return (
          <Alert key={field.name} variant="destructive">
            <Warning className="gba:h-4 gba:w-4" />
            <div>
              <p className="gba:font-semibold">Unsupported Field Type</p>
              <p className="gba:text-sm">Field "{field.name}" has unsupported type "{field.type}"</p>
            </div>
          </Alert>
        );
    }
  }, [values, errors, touchedFields, handleFieldChange, getFieldError, shouldShowValidation]);

  // Sort fields by order if specified
  const sortedFields = useMemo(() => {
    return [...schema].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [schema]);

  if (!schema || schema.length === 0) {
    return (
      <Card className="gba:p-6">
        <div className="gba:text-center gba:text-gray-500">
          <p>No form fields defined for this template</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="gba:p-6">
      <div className="gba:space-y-6">
        {/* Header */}
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">{title}</h3>
            <Badge variant="outline" className="gba:text-xs">
              Dynamic Form
            </Badge>
          </div>
          {description && (
            <p className="gba:text-sm gba:text-gray-600">{description}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="gba:space-y-4">
          {sortedFields.map(renderField)}
          
          {/* Submit Button */}
          <div className="gba:pt-4 gba:border-t gba:flex gba:justify-end gba:gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || errors.length > 0}
              className="gba:min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="gba:w-4 gba:h-4 gba:mr-2" />
                  {submitButtonText}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Form Stats */}
        {schema.length > 0 && (
          <div className="gba:pt-4 gba:border-t gba:text-xs gba:text-gray-500 gba:flex gba:justify-between">
            <span>Fields: {schema.length}</span>
            <span>Required: {schema.filter(f => f.required).length}</span>
          </div>
        )}
      </div>
    </Card>
  );
};
