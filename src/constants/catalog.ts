/**
 * Catalog system constants
 */

export const CATALOG_LIMITS = {
    MAX_BULK_ITEMS: 10,
    MAX_BULK_CATEGORIES: 10,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    DESCRIPTION_MAX_LENGTH: 200,
    ITEM_DESCRIPTION_MAX_LENGTH: 500,
    IMAGE_MAX_SIZE_MB: 5,
};

export const DEFAULT_CATEGORY = {
    name: '',
    description: '',
    color: '#FF6B35',
    imageFile: null,
};

export const DEFAULT_ITEM = {
    name: '',
    category_id: '',
    sku: '',
    price: '',
    stock: '0',
    description: '',
    imageFile: null,
};
