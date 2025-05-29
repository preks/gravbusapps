import { useState, useEffect } from 'react';

export const useUserLocale = () => {
  const [locale, setLocale] = useState('en-US');

  useEffect(() => {
    const userLocale = window.localStorage.getItem('userLocale') || 'en-US';
    setLocale(userLocale);
  }, []);

  return locale;
};
