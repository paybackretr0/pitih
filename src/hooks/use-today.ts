import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayISO } from '@/lib/format';

export function useToday(): string {
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setToday(todayISO());
    });
    return () => subscription.remove();
  }, []);

  return today;
}
