export interface FeedbackFormValues {
  feedbackText: string;
  transformedText?: string;
  transformationType?: 'formalize' | 'translate' | 'shorten';
  targetLanguage?: string;
  employeeId?: string;
  employeeName?: string;
}

export interface TextTransformationRequest {
  text: string;
  transformationType: 'formalize' | 'translate' | 'shorten';
  targetLanguage?: string;
}

export interface TextTransformationResponse {
  transformedText: string;
  originalText: string;
  transformationType: string;
  targetLanguage?: string;
}

export interface EmployeeOption {
  id: string;
  name: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  pictureThumbnail?: string;
}

export interface FeedbackFormProps {
  initialValues?: Partial<FeedbackFormValues>;
  onSubmit?: (values: FeedbackFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
  preSelectedEmployeeId?: string;
}
