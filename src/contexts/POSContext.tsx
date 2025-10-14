import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { itemsAPI } from '../api/items';
import { invoicesAPI } from '../api/invoices';

export type Language = 'en' | 'hi' | 'ar' | 'mr';
export type Currency = 'INR' | 'AED' | 'USD' | 'EUR' | 'GBP';
export type Theme = 'light' | 'dark';
export type StoreType = 'restaurant' | 'cafe' | 'retail' | 'salon' | 'pharmacy' | 'other';
export type PaymentMethod = 'cash' | 'upi' | 'razorpay';
export type InvoiceStatus = 'paid' | 'pending' | 'cancelled';

export interface Store {
    name: string;
    type: StoreType;
    language: Language;
    currency: Currency;
    theme: Theme;
    logoURL?: string;
}

export interface Item {
    id: string;
    name: string;
    price: number;
    category: string;
    image?: string;
    stock?: number;
    sku?: string;
}

export interface CartItem extends Item {
    quantity: number;
}

export interface Invoice {
    id: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: PaymentMethod;
    date: Date;
    customer?: string;
    status: InvoiceStatus;
}

interface POSState {
    items: Item[];
    cart: CartItem[];
    invoices: Invoice[];
    loading: boolean;
}

type POSAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ITEMS'; payload: Item[] }
    | { type: 'ADD_ITEM'; payload: Item }
    | { type: 'UPDATE_ITEM'; payload: Item }
    | { type: 'DELETE_ITEM'; payload: string }
    | { type: 'ADD_TO_CART'; payload: Item }
    | { type: 'UPDATE_CART_QUANTITY'; payload: { id: string; quantity: number } }
    | { type: 'REMOVE_FROM_CART'; payload: string }
    | { type: 'CLEAR_CART' }
    | { type: 'SET_INVOICES'; payload: Invoice[] }
    | { type: 'ADD_INVOICE'; payload: Invoice }
    | { type: 'RESET_STATE' };

const initialState: POSState = {
    items: [],
    cart: [],
    invoices: [],
    loading: false,
};

function posReducer(state: POSState, action: POSAction): POSState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_ITEMS':
            return { ...state, items: action.payload, loading: false };
        case 'ADD_ITEM':
            return { ...state, items: [...state.items, action.payload] };
        case 'UPDATE_ITEM':
            return {
                ...state,
                items: state.items.map((item) => (item.id === action.payload.id ? action.payload : item)),
            };
        case 'DELETE_ITEM':
            return {
                ...state,
                items: state.items.filter((item) => item.id !== action.payload),
            };
        case 'ADD_TO_CART':
            const existingItem = state.cart.find((item) => item.id === action.payload.id);
            if (existingItem) {
                return {
                    ...state,
                    cart: state.cart.map((item) =>
                        item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item
                    ),
                };
            }
            return {
                ...state,
                cart: [...state.cart, { ...action.payload, quantity: 1 }],
            };
        case 'UPDATE_CART_QUANTITY':
            return {
                ...state,
                cart: state.cart.map((item) =>
                    item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item
                ),
            };
        case 'REMOVE_FROM_CART':
            return {
                ...state,
                cart: state.cart.filter((item) => item.id !== action.payload),
            };
        case 'CLEAR_CART':
            return { ...state, cart: [] };
        case 'SET_INVOICES':
            return { ...state, invoices: action.payload, loading: false };
        case 'ADD_INVOICE':
            return { ...state, invoices: [action.payload, ...state.invoices] };
        case 'RESET_STATE':
            return initialState;
        default:
            return state;
    }
}

const POSContext = createContext<{
    state: POSState;
    dispatch: React.Dispatch<POSAction>;
    loadItems: () => Promise<void>;
    loadInvoices: () => Promise<void>;
    handleDeleteItem: (itemId: string) => Promise<void>;
    handleAddItem: (item: Omit<Item, 'id'>) => Promise<void>;
    handleUpdateItem: (item: Item) => Promise<void>;
    handleAddToCart: (item: Item) => void;
    handleCreateInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<void>;
} | null>(null);

export function POSProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(posReducer, initialState);
    const { state: authState } = useAuth();

    const storeId = authState.user?.store?.id;

    const loadItems = async () => {
        if (!storeId) return;

        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            const items = await itemsAPI.getItems(storeId);

            const formattedItems: Item[] = items.map((item: any) => ({
                id: item.id,
                name: item.name,
                price: parseFloat(item.price),
                category: item.category,
                stock: item.stock,
                sku: item.sku,
                image: item.image_url,
            }));

            dispatch({ type: 'SET_ITEMS', payload: formattedItems });
        } catch (error: any) {
            console.error('Load items error:', error);
            toast.error('Failed to load items');
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const loadInvoices = async () => {
        if (!storeId) return;

        try {
            dispatch({ type: 'SET_LOADING', payload: true });
            const invoices = await invoicesAPI.getTodayInvoices(storeId);

            const formattedInvoices: Invoice[] = invoices.map((inv: any) => ({
                id: inv.invoice_number,
                items: inv.invoice_items.map((item: any) => ({
                    id: item.item_id,
                    name: item.item_name,
                    price: parseFloat(item.price),
                    category: '',
                    quantity: item.quantity,
                })),
                subtotal: parseFloat(inv.subtotal),
                discount: parseFloat(inv.discount),
                tax: parseFloat(inv.tax),
                total: parseFloat(inv.total),
                paymentMethod: inv.payment_method,
                date: new Date(inv.created_at),
                customer: inv.customer_name,
                status: inv.status,
            }));

            dispatch({ type: 'SET_INVOICES', payload: formattedInvoices });
        } catch (error: any) {
            console.error('Load invoices error:', error);
            toast.error('Failed to load invoices');
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    useEffect(() => {
        if (storeId) {
            loadItems();
            loadInvoices();
        }
    }, [storeId]);

    const handleDeleteItem = async (itemId: string) => {
        try {
            await itemsAPI.deleteItem(itemId);
            dispatch({ type: 'DELETE_ITEM', payload: itemId });
            toast.success('Item deleted successfully');
        } catch (error: any) {
            console.error('Delete item error:', error);
            toast.error('Failed to delete item');
        }
    };

    const handleAddItem = async (item: Omit<Item, 'id'>) => {
        if (!storeId) {
            toast.error('No store selected');
            return;
        }

        try {
            const newItem = await itemsAPI.createItem(storeId, {
                name: item.name,
                category: item.category,
                price: item.price,
                sku: item.sku,
                stock: item.stock || 0,
                image_url: item.image,
            });

            const formattedItem: Item = {
                id: newItem.id,
                name: newItem.name,
                price: parseFloat(newItem.price),
                category: newItem.category,
                stock: newItem.stock,
                sku: newItem.sku,
                image: newItem.image_url,
            };

            dispatch({ type: 'ADD_ITEM', payload: formattedItem });
            toast.success('Item added to catalog');
        } catch (error: any) {
            console.error('Add item error:', error);
            toast.error('Failed to add item');
        }
    };

    const handleUpdateItem = async (item: Item) => {
        try {
            await itemsAPI.updateItem(item.id, {
                name: item.name,
                category: item.category,
                price: item.price,
                sku: item.sku,
                stock: item.stock,
                image_url: item.image,
            });

            dispatch({ type: 'UPDATE_ITEM', payload: item });
            toast.success('Item updated successfully');
        } catch (error: any) {
            console.error('Update item error:', error);
            toast.error('Failed to update item');
        }
    };

    const handleAddToCart = (item: Item) => {
        dispatch({ type: 'ADD_TO_CART', payload: item });
        toast.success(`${item.name} added to cart`);
    };

    const handleCreateInvoice = async (invoice: Omit<Invoice, 'id'>) => {
        if (!storeId) {
            toast.error('No store selected');
            return;
        }

        try {
            const createdInvoice = await invoicesAPI.createInvoice(storeId, {
                customer_name: invoice.customer,
                items: invoice.items.map((item) => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                })),
                subtotal: invoice.subtotal,
                discount: invoice.discount,
                discount_type: 'flat',
                tax: invoice.tax,
                tax_rate: authState.user?.store?.type === 'restaurant' ? 5 : 18,
                total: invoice.total,
                payment_method: invoice.paymentMethod,
                notes: '',
            });

            const formattedInvoice: Invoice = {
                id: createdInvoice.invoice_number,
                items: invoice.items,
                subtotal: invoice.subtotal,
                discount: invoice.discount,
                tax: invoice.tax,
                total: invoice.total,
                paymentMethod: invoice.paymentMethod,
                date: new Date(createdInvoice.created_at),
                customer: invoice.customer,
                status: 'paid',
            };

            dispatch({ type: 'ADD_INVOICE', payload: formattedInvoice });
            dispatch({ type: 'CLEAR_CART' });

            await loadItems();

            toast.success('Invoice created successfully');
        } catch (error: any) {
            console.error('Create invoice error:', error);
            toast.error('Failed to create invoice');
        }
    };

    useEffect(() => {
        const root = document.documentElement;
        const theme = authState.user?.store?.theme;

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [authState.user?.store?.theme]);

    useEffect(() => {
        const root = document.documentElement;
        const language = authState.user?.store?.language || 'en';

        import(`../locales/${language}.json`)
            .then((translations) => {
                const direction = translations.default?._meta?.direction || 'ltr';
                root.dir = direction;
            })
            .catch(() => {
                root.dir = language === 'ar' ? 'rtl' : 'ltr';
            });

        root.lang = language;
    }, [authState.user?.store?.language]);

    return (
        <POSContext.Provider
            value={{
                state,
                dispatch,
                loadItems,
                loadInvoices,
                handleDeleteItem,
                handleAddItem,
                handleUpdateItem,
                handleAddToCart,
                handleCreateInvoice,
            }}
        >
            {children}
        </POSContext.Provider>
    );
}

export function usePOS() {
    const context = useContext(POSContext);
    if (!context) {
        throw new Error('usePOS must be used within a POSProvider');
    }
    return context;
}
