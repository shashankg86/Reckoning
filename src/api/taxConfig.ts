import { supabase } from '../lib/supabaseClient';

export interface TaxPreset {
  id: string;
  country: string;
  name: string;
  description: string;
  taxComponents: TaxComponent[];
}

export interface TaxComponent {
  name: string; // e.g., "CGST", "SGST", "IGST", "VAT"
  rate: number;
  applicableOn: 'subtotal' | 'total';
}

export interface StoreTaxConfig {
  id?: string;
  store_id: string;
  country: string;
  tax_enabled: boolean;
  tax_preset_id?: string;
  custom_tax_components?: TaxComponent[];
  tax_number?: string; // GST number, VAT number, etc.
  tax_inclusive?: boolean; // Prices include tax or not
  created_at?: string;
  updated_at?: string;
}

// Predefined tax presets for different countries
export const TAX_PRESETS: Record<string, TaxPreset[]> = {
  IN: [
    {
      id: 'in_gst_5',
      country: 'IN',
      name: 'GST 5% (Restaurants)',
      description: 'For restaurants with turnover under ₹20L (No ITC)',
      taxComponents: [
        { name: 'CGST', rate: 2.5, applicableOn: 'subtotal' },
        { name: 'SGST', rate: 2.5, applicableOn: 'subtotal' }
      ]
    },
    {
      id: 'in_gst_12',
      country: 'IN',
      name: 'GST 12%',
      description: 'For food items like frozen products, packaged foods',
      taxComponents: [
        { name: 'CGST', rate: 6, applicableOn: 'subtotal' },
        { name: 'SGST', rate: 6, applicableOn: 'subtotal' }
      ]
    },
    {
      id: 'in_gst_18',
      country: 'IN',
      name: 'GST 18% (Standard)',
      description: 'Standard rate for most goods and services',
      taxComponents: [
        { name: 'CGST', rate: 9, applicableOn: 'subtotal' },
        { name: 'SGST', rate: 9, applicableOn: 'subtotal' }
      ]
    },
    {
      id: 'in_igst_18',
      country: 'IN',
      name: 'IGST 18% (Interstate)',
      description: 'For interstate transactions',
      taxComponents: [
        { name: 'IGST', rate: 18, applicableOn: 'subtotal' }
      ]
    },
    {
      id: 'in_gst_28',
      country: 'IN',
      name: 'GST 28% (Luxury)',
      description: 'For luxury items, aerated drinks',
      taxComponents: [
        { name: 'CGST', rate: 14, applicableOn: 'subtotal' },
        { name: 'SGST', rate: 14, applicableOn: 'subtotal' }
      ]
    }
  ],
  AE: [
    {
      id: 'ae_vat_5',
      country: 'AE',
      name: 'VAT 5%',
      description: 'Standard VAT rate for UAE',
      taxComponents: [
        { name: 'VAT', rate: 5, applicableOn: 'subtotal' }
      ]
    },
    {
      id: 'ae_vat_0',
      country: 'AE',
      name: 'Zero-rated VAT',
      description: 'For exports, healthcare, education',
      taxComponents: [
        { name: 'VAT', rate: 0, applicableOn: 'subtotal' }
      ]
    }
  ],
  US: [
    {
      id: 'us_sales_tax',
      country: 'US',
      name: 'Sales Tax (Variable)',
      description: 'Configure based on your state/city',
      taxComponents: [
        { name: 'Sales Tax', rate: 8.5, applicableOn: 'subtotal' }
      ]
    }
  ],
  GB: [
    {
      id: 'gb_vat_20',
      country: 'GB',
      name: 'VAT 20%',
      description: 'Standard VAT rate for UK',
      taxComponents: [
        { name: 'VAT', rate: 20, applicableOn: 'subtotal' }
      ]
    },
    {
      id: 'gb_vat_5',
      country: 'GB',
      name: 'VAT 5% (Reduced)',
      description: 'For fuel, electricity for domestic use',
      taxComponents: [
        { name: 'VAT', rate: 5, applicableOn: 'subtotal' }
      ]
    }
  ]
};

export const taxConfigAPI = {
  /**
   * Get tax configuration for a store
   */
  async getTaxConfig(storeId: string): Promise<StoreTaxConfig | null> {
    try {
      const { data, error } = await supabase
        .from('store_tax_config')
        .select('*')
        .eq('store_id', storeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Get tax config error:', error);
      return null;
    }
  },

  /**
   * Create or update tax configuration
   */
  async upsertTaxConfig(config: StoreTaxConfig): Promise<StoreTaxConfig> {
    try {
      const { data, error } = await supabase
        .from('store_tax_config')
        .upsert({
          store_id: config.store_id,
          country: config.country,
          tax_enabled: config.tax_enabled,
          tax_preset_id: config.tax_preset_id,
          custom_tax_components: config.custom_tax_components,
          tax_number: config.tax_number,
          tax_inclusive: config.tax_inclusive,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'store_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Upsert tax config error:', error);
      throw new Error(error.message || 'Failed to save tax configuration');
    }
  },

  /**
   * Get tax presets for a country
   */
  getTaxPresets(countryCode: string): TaxPreset[] {
    return TAX_PRESETS[countryCode] || [];
  },

  /**
   * Calculate tax based on configuration
   */
  calculateTax(
    subtotal: number,
    taxConfig: StoreTaxConfig,
    presetId?: string
  ): { components: { name: string; amount: number; rate: number }[]; total: number } {
    if (!taxConfig.tax_enabled) {
      return { components: [], total: 0 };
    }

    // Get tax components from preset or custom config
    let taxComponents: TaxComponent[] = [];

    if (presetId) {
      const preset = Object.values(TAX_PRESETS)
        .flat()
        .find(p => p.id === presetId);
      taxComponents = preset?.taxComponents || [];
    } else if (taxConfig.custom_tax_components) {
      taxComponents = taxConfig.custom_tax_components;
    } else if (taxConfig.tax_preset_id) {
      const preset = Object.values(TAX_PRESETS)
        .flat()
        .find(p => p.id === taxConfig.tax_preset_id);
      taxComponents = preset?.taxComponents || [];
    }

    // Calculate each component
    const components = taxComponents.map(component => ({
      name: component.name,
      rate: component.rate,
      amount: (subtotal * component.rate) / 100
    }));

    const total = components.reduce((sum, c) => sum + c.amount, 0);

    return { components, total };
  }
};
