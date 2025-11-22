import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { itemsAPI, ItemData, ItemFilter } from '../api/items';
import { categoriesAPI } from '../api/categories';
import { toast } from 'react-hot-toast';

// Keys for React Query cache
export const catalogKeys = {
    all: ['catalog'] as const,
    items: (storeId: string, filter?: ItemFilter) => [...catalogKeys.all, 'items', storeId, filter] as const,
    categories: (storeId: string) => [...catalogKeys.all, 'categories', storeId] as const,
};

export function useCatalogQueries(storeId: string) {
    const queryClient = useQueryClient();

    // Fetch Categories
    const categoriesQuery = useQuery({
        queryKey: catalogKeys.categories(storeId),
        queryFn: () => categoriesAPI.getCategories(storeId, { is_active: true }),
        enabled: !!storeId,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    // Fetch Items (with optional filter)
    const useItems = (
        filter?: ItemFilter,
        page: number = 1,
        limit: number = 20,
        sortBy?: 'name' | 'price' | 'stock' | 'created_at',
        sortOrder?: 'asc' | 'desc'
    ) => useQuery({
        queryKey: [...catalogKeys.items(storeId, filter), page, limit, sortBy, sortOrder],
        queryFn: () => itemsAPI.getItems(storeId, filter, page, limit, sortBy, sortOrder),
        enabled: !!storeId,
        placeholderData: keepPreviousData, // Keep showing old data while fetching new data
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Optimistic Update for Item Creation
    const createItemMutation = useMutation({
        mutationFn: (newItem: ItemData) => itemsAPI.createItem(storeId, newItem),
        onMutate: async (newItem) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: catalogKeys.items(storeId) });

            // Snapshot previous value
            const previousItems = queryClient.getQueryData(catalogKeys.items(storeId));

            // Optimistically update to new value
            queryClient.setQueryData(catalogKeys.items(storeId), (old: any[] | undefined) => {
                return old ? [newItem, ...old] : [newItem];
            });

            return { previousItems };
        },
        onError: (_err, _newItem, context) => {
            // Rollback on error
            queryClient.setQueryData(catalogKeys.items(storeId), context?.previousItems);
            toast.error('Failed to create item');
        },
        onSettled: () => {
            // Refetch to ensure sync
            queryClient.invalidateQueries({ queryKey: catalogKeys.items(storeId) });
        },
    });

    // Optimistic Update for Item Update
    const updateItemMutation = useMutation({
        mutationFn: ({ id, ...updates }: { id: string } & Partial<ItemData>) =>
            itemsAPI.updateItem(id, updates),
        onMutate: async ({ id, ...updates }) => {
            await queryClient.cancelQueries({ queryKey: catalogKeys.items(storeId) });
            const previousItems = queryClient.getQueryData(catalogKeys.items(storeId));

            queryClient.setQueryData(catalogKeys.items(storeId), (old: any[] | undefined) => {
                return old?.map(item => item.id === id ? { ...item, ...updates } : item);
            });

            return { previousItems };
        },
        onError: (_err, _variables, context) => {
            queryClient.setQueryData(catalogKeys.items(storeId), context?.previousItems);
            toast.error('Failed to update item');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: catalogKeys.items(storeId) });
        },
    });

    return {
        categoriesQuery,
        useItems,
        createItemMutation,
        updateItemMutation,
    };
}
