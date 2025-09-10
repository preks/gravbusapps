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
} from '../types/flowTemplate';
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
  showSubmitButton?: boolean;
  showCard?: boolean;
}

interface FieldError {
  field: string;
  message: string;
}

/**
 * Shared Dynamic Form Generator Component
 * Used by both Service Portal and Service Desk for rendering dynamic forms
 * based on workflow template field definitions
 */
export const DynamicFormGenerator: React.FC<DynamicFormGeneratorProps> = ({
  schema,
  initialValues = {},
  onValuesChange,
  onSubmit,
  isSubmitting = false,
  submitButtonText = 'Submit',
  title = 'Form Details',
  description,
  showSubmitButton = true,
  showCard = true
}) => {
  const [values, setValues] = useState<DynamicFormValues>(initialValues);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Validation functions
  const validateField = useCallback((field: DynamicFormField, value: any): string | null => {
    // Basic required validation
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label} is required`;
    }

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
      className: hasError ? 'gba:border-red-500' : '',
      'data-testid': `form-field-${field.name}`
    };

    switch (field.type) {
      case 'TEXT':
        return (
          <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
              {field.label}
              {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>
            )}
            <Input
              {...commonProps}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'EMAIL':
        return (
          <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
              <Envelope className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
              {field.label}
              {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>
            )}
            <Input
              {...commonProps}
              type="email"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'URL':
        return (
          <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
              <LinkIcon className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
              {field.label}
              {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>
            )}
            <Input
              {...commonProps}
              type="url"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'NUMBER':
        return (
          <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
              <Hash className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
              {field.label}
              {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>
            )}
            <Input
              {...commonProps}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value) || '')}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'TEXTAREA':
        return (
          <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
              {field.label}
              {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>
            )}
            <Textarea
              {...commonProps}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
              rows={4}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'SELECT':
        return (
          <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
              {field.label}
              {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>
            )}
            <Select
              value={value}
              onValueChange={(newValue) => handleFieldChange(field.name, newValue)}
            >
              <SelectTrigger className={hasError ? 'gba:border-destructive' : ''} data-testid={`select-${field.name}`}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value} data-testid={`option-${field.name}-${option.value}`}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'DATE':
        return (
          <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
            <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
              <Calendar className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
              {field.label}
              {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>
            )}
            <Input
              {...commonProps}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
            />
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'CHECKBOX':
        return (
          <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
              {field.label}
              {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>
            )}
            <div className="gba:space-y-2">
              {field.options?.map(option => (
                <label key={option.value} className="gba:flex gba:items-center gba:space-x-2">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={Array.isArray(value) ? value.includes(option.value) : false}
                    onChange={(e) => {
                      const currentValue = Array.isArray(value) ? value : [];
                      let newValue;
                      if (e.target.checked) {
                        newValue = [...currentValue, option.value];
                      } else {
                        newValue = currentValue.filter(v => v !== option.value);
                      }
                      handleFieldChange(field.name, newValue);
                    }}
                    className="gba:rounded gba:border-input"
                    data-testid={`checkbox-${field.name}-${option.value}`}
                  />
                  <span className="gba:text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      case 'MULTISELECT':
        return (
          <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
              {field.label}
              {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
            </label>
            {field.description && (
              <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>
            )}
            <div className="gba:space-y-2 gba:border gba:rounded-md gba:p-3">
              {field.options?.map(option => (
                <label key={option.value} className="gba:flex gba:items-center gba:space-x-2">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={Array.isArray(value) ? value.includes(option.value) : false}
                    onChange={(e) => {
                      const currentValue = Array.isArray(value) ? value : [];
                      let newValue;
                      if (e.target.checked) {
                        newValue = [...currentValue, option.value];
                      } else {
                        newValue = currentValue.filter(v => v !== option.value);
                      }
                      handleFieldChange(field.name, newValue);
                    }}
                    className="gba:rounded gba:border-input"
                    data-testid={`multiselect-${field.name}-${option.value}`}
                  />
                  <span className="gba:text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            {hasError && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                <Warning size={12} />
                {error}
              </div>
            )}
          </div>
        );

      default:
        return (
          <Alert key={field.name} variant="destructive" data-testid={`unsupported-field-${field.name}`}>
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
    const emptyContent = (
      <div className="gba:text-center gba:text-muted-foreground gba:py-8" data-testid="no-fields-message">
        <p>No form fields defined</p>
      </div>
    );

    return showCard ? (
      <Card className="gba:p-6" data-testid="dynamic-form-generator">
        {emptyContent}
      </Card>
    ) : emptyContent;
  }

  const formContent = (
    <div className="gba:space-y-6" data-testid="dynamic-form-generator">
      {/* Header */}
      {title && (
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{title}</h3>
            <Badge variant="outline" className="gba:text-xs">
              Dynamic Form
            </Badge>
          </div>
          {description && (
            <p className="gba:text-sm gba:text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="gba:space-y-4" data-testid="dynamic-form">
        {sortedFields.map(renderField)}
        
        {/* Submit Button */}
        {showSubmitButton && (
          <div className="gba:pt-4 gba:border-t gba:flex gba:justify-end gba:gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || errors.length > 0}
              className="gba:min-w-[140px]"
              data-testid="form-submit-button"
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
        )}
      </form>

      {/* Form Stats */}
      {schema.length > 0 && (
        <div className="gba:pt-4 gba:border-t gba:text-xs gba:text-muted-foreground gba:flex gba:justify-between">
          <span>Fields: {schema.length}</span>
          <span>Required: {schema.filter(f => f.required).length}</span>
        </div>
      )}
    </div>
  );

  return showCard ? (
    <Card className="gba:p-6">
      {formContent}
    </Card>
  ) : formContent;
};
