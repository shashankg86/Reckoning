import { useMemo } from 'react';
import type { StoreTaxConfig, InvoiceTaxOverride } from '../api/taxConfig';

interface UseTaxCalculationProps {
    subtotal: number;
    storeCountry?: string;
    taxConfig: StoreTaxConfig | null;
    discount?: number;
    discountType?: 'flat' | 'percentage';
    invoiceTaxOverride?: InvoiceTaxOverride | null;
}

export interface TaxCalculationResult {
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;

    // Service Charge
    serviceCharge: number;
    serviceChargeRate: number;

    // Tax
    tax: number;
    taxRate: number;
    taxComponents: { name: string; amount: number; rate: number }[];

    // Municipality Fee (Dubai)
    municipalityFee: number;
    municipalityFeeRate: number;

    // Custom Components
    customComponents: { name: string; rate: number; amount: number }[];

    total: number;
}

export function useTaxCalculation({
    subtotal,
    storeCountry = 'IN',
    taxConfig,
    discount = 0,
    discountType = 'flat',
    invoiceTaxOverride
}: UseTaxCalculationProps): TaxCalculationResult {

    return useMemo(() => {
        // 1. Apply Discount
        let discountAmount = 0;
        if (discount > 0) {
            if (discountType === 'percentage') {
                discountAmount = (subtotal * Math.min(discount, 100)) / 100;
            } else {
                discountAmount = Math.min(discount, subtotal);
            }
        }

        // Base amount after discount
        const baseAmount = Math.max(0, subtotal - discountAmount);

        // Determine Tax Configuration (Override > Config > Default)
        const isTaxEnabled = invoiceTaxOverride ? invoiceTaxOverride.enabled : (taxConfig?.tax_enabled ?? true);

        // Service Charge
        let serviceChargeRate = 0;
        let isServiceChargeEnabled = false;
        let applyVatOnServiceCharge = false;

        if (invoiceTaxOverride?.serviceCharge) {
            isServiceChargeEnabled = invoiceTaxOverride.serviceCharge.enabled;
            serviceChargeRate = invoiceTaxOverride.serviceCharge.rate;
            applyVatOnServiceCharge = invoiceTaxOverride.serviceCharge.applyVatOnServiceCharge ?? false;
        } else if (taxConfig) {
            isServiceChargeEnabled = taxConfig.service_charge_enabled;
            serviceChargeRate = taxConfig.service_charge_rate;
            applyVatOnServiceCharge = taxConfig.apply_vat_on_service_charge;
        }

        const serviceCharge = isServiceChargeEnabled ? (baseAmount * serviceChargeRate) / 100 : 0;

        // Municipality Fee (Dubai Only)
        let municipalityFeeRate = 0;
        let isMunicipalityFeeEnabled = false;

        if (storeCountry === 'AE') {
            if (invoiceTaxOverride?.municipalityFee) {
                isMunicipalityFeeEnabled = invoiceTaxOverride.municipalityFee.enabled;
                municipalityFeeRate = invoiceTaxOverride.municipalityFee.rate;
            } else if (taxConfig) {
                isMunicipalityFeeEnabled = taxConfig.municipality_fee_enabled;
                municipalityFeeRate = taxConfig.municipality_fee_rate;
            }
        }

        const municipalityFee = isMunicipalityFeeEnabled ? (baseAmount * municipalityFeeRate) / 100 : 0;

        // Custom Components (from Override)
        const customComponents: { name: string; rate: number; amount: number }[] = [];
        if (invoiceTaxOverride?.customComponents) {
            invoiceTaxOverride.customComponents.forEach(comp => {
                customComponents.push({
                    name: comp.name,
                    rate: comp.rate,
                    amount: (baseAmount * comp.rate) / 100
                });
            });
        }

        // Tax Calculation
        let tax = 0;
        let taxRate = 0;
        let taxComponents: { name: string; amount: number; rate: number }[] = [];
        let taxableAmount = baseAmount;

        if (isTaxEnabled) {
            // Dubai VAT on Service Charge logic
            if (storeCountry === 'AE' && applyVatOnServiceCharge) {
                taxableAmount += serviceCharge;
            }

            if (invoiceTaxOverride?.customRate !== undefined) {
                // Manual Tax Rate Override
                taxRate = invoiceTaxOverride.customRate;
                tax = (taxableAmount * taxRate) / 100;
                taxComponents.push({
                    name: storeCountry === 'AE' ? 'VAT' : 'Tax',
                    rate: taxRate,
                    amount: tax
                });
            } else if (taxConfig?.tax_enabled) {
                // Use Store Config
                // If custom components defined in config (not implemented fully in this hook yet, assuming simplified logic or presets)
                // For now, falling back to simple rate or preset logic if available, or just using a default if nothing else

                // TODO: Integrate full preset logic from taxConfigAPI if needed, 
                // but for now let's assume we use a standard rate if no specific components

                // If we have tax_preset_id or custom_tax_components in taxConfig, we should use them.
                // For simplicity in this hook, we'll implement basic country defaults if config is missing components

                if (storeCountry === 'IN') {
                    // Default GST 5% if not specified
                    taxRate = 5;
                    tax = (taxableAmount * taxRate) / 100;
                    taxComponents = [
                        { name: 'CGST', rate: 2.5, amount: tax / 2 },
                        { name: 'SGST', rate: 2.5, amount: tax / 2 }
                    ];
                } else if (storeCountry === 'AE') {
                    // Default VAT 5%
                    taxRate = 5;
                    tax = (taxableAmount * taxRate) / 100;
                    taxComponents = [
                        { name: 'VAT', rate: 5, amount: tax }
                    ];
                }
            }
        }

        const totalCustomComponents = customComponents.reduce((sum, c) => sum + c.amount, 0);

        const total = baseAmount + serviceCharge + tax + municipalityFee + totalCustomComponents;

        return {
            subtotal,
            discountAmount,
            taxableAmount,
            serviceCharge,
            serviceChargeRate,
            tax,
            taxRate,
            taxComponents,
            municipalityFee,
            municipalityFeeRate,
            customComponents,
            total: Math.max(0, total)
        };
    }, [subtotal, storeCountry, taxConfig, discount, discountType, invoiceTaxOverride]);
}
