import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useCurrency() {
    const { state } = useAuth();
    const currency = state.user?.store?.currency || 'INR';

    const formatCurrency = useCallback((amount: number) => {
        let locale = 'en-US';

        switch (currency) {
            case 'INR':
                locale = 'en-IN';
                break;
            case 'AED':
                locale = 'en-AE';
                break;
            case 'EUR':
                locale = 'en-IE';
                break;
            case 'GBP':
                locale = 'en-GB';
                break;
            case 'USD':
            default:
                locale = 'en-US';
                break;
        }

        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(amount);
        } catch (error) {
            console.warn(`Failed to format currency ${currency} with locale ${locale}`, error);
            // Fallback
            return `${currency} ${amount.toFixed(2)}`;
        }
    }, [currency]);

    return {
        currency,
        formatCurrency
    };
}
