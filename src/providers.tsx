import type { ReactNode } from 'react';
import { AcmStoreProvider } from '@/context/acm-store';

/**
 * ⚠️ App-wide providers. Add new providers here — they'll be available in all routes.
 */
export function Providers({ children }: { children: ReactNode }) {
	return <AcmStoreProvider>{children}</AcmStoreProvider>;
}
