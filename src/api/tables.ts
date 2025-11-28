import { supabase } from '../lib/supabaseClient';
import { Zone, Table } from '../types/tables';

export const tablesAPI = {
    // Zones
    getZones: async (storeId: string) => {
        const { data, error } = await supabase
            .from('zones')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as Zone[];
    },

    createZone: async (storeId: string, name: string) => {
        const { data, error } = await supabase
            .from('zones')
            .insert([{ store_id: storeId, name }])
            .select()
            .single();

        if (error) throw error;
        return data as Zone;
    },

    deleteZone: async (zoneId: string) => {
        const { error } = await supabase
            .from('zones')
            .delete()
            .eq('id', zoneId);

        if (error) throw error;
    },

    // Tables
    getTables: async (storeId: string) => {
        const { data, error } = await supabase
            .from('tables')
            .select('*')
            .eq('store_id', storeId);

        if (error) throw error;
        return data as Table[];
    },

    createTable: async (table: Omit<Table, 'id' | 'created_at'>) => {
        const { data, error } = await supabase
            .from('tables')
            .insert([table])
            .select()
            .single();

        if (error) throw error;
        return data as Table;
    },

    updateTable: async (id: string, updates: Partial<Table>) => {
        const { data, error } = await supabase
            .from('tables')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Table;
    },

    deleteTable: async (id: string) => {
        const { error } = await supabase
            .from('tables')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },
};
