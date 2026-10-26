import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const snapshot = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
const subscribe = (notify) => {
  const media = window.matchMedia?.(query);
  media?.addEventListener('change', notify);
  return () => media?.removeEventListener('change', notify);
};
export default function useMotionPreference() {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}
