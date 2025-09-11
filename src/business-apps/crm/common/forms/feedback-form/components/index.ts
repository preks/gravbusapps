export { default as FeedbackFormComponent } from './FeedbackFormComponent';
export { default as RequestFeedbackModal } from './RequestFeedbackModal';

// Default export for wrapper compatibility
const components = {
  FeedbackFormComponent,
  RequestFeedbackModal,
};

export default components as unknown as any;