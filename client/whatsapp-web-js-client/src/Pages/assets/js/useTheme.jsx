import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const cookies = document.cookie.split('; ');
    let currentTheme = 'light';

    cookies.forEach(cookie => {
      const [name, value] = cookie.split('=');
      if (name === 'theme') currentTheme = value;
    });

    document.body.classList.remove('light', 'dark');
    document.body.classList.add(currentTheme);
    setTheme(currentTheme);
  }, []);

  return [theme, setTheme];
}