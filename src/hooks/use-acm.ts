import { useContext } from 'react';
import { AcmContext, type StoreValue } from '@/context/acm-context';

export function useAcm(): StoreValue {
    const ctx = useContext(AcmContext);
    if (!ctx) throw new Error('useAcm deve ser usado dentro de <AcmStoreProvider>');
    return ctx;
}

export default useAcm;