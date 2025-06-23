export const formatDataTestId = (prefix: string, suffix?: string) => {
  return `data-testid=${prefix}${suffix ? `-${suffix}` : ''}`;
};