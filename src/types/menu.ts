/**
 * Menu System Type Definitions
 *
 * Enterprise-level type definitions for the menu and category management system.
 */

/**
 * Category represents a menu category for organizing items
 */
export interface Category {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  sort_order: number;
  parent_id: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

/**
 * CategoryWithItems includes category with its associated items
 */
export interface CategoryWithItems extends Category {
  items: CategoryItem[];
  item_count: number;
}

/**
 * CategoryHierarchy represents a category with nested children
 */
export interface CategoryHierarchy extends Category {
  children: CategoryHierarchy[];
  depth: number;
}

/**
 * CategoryItem represents a simplified item view within a category
 */
export interface CategoryItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  stock: number;
  is_active: boolean;
}

/**
 * CreateCategoryData for creating new categories
 */
export interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
  parent_id?: string | null;
  metadata?: Record<string, any>;
}

/**
 * UpdateCategoryData for updating existing categories
 */
export interface UpdateCategoryData {
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string;
  sort_order?: number;
  parent_id?: string | null;
  metadata?: Record<string, any>;
  is_active?: boolean;
}

/**
 * CategoryStats for analytics
 */
export interface CategoryStats {
  category_id: string;
  category_name: string;
  total_items: number;
  active_items: number;
  total_sales: number;
  total_revenue: number;
}

/**
 * MenuSetupStep tracks which step of menu setup wizard user is on
 */
export type MenuSetupStep = 'categories' | 'items' | 'review';

/**
 * MenuSetupProgress tracks overall menu setup progress
 */
export interface MenuSetupProgress {
  current_step: MenuSetupStep;
  categories_created: number;
  items_created: number;
  is_complete: boolean;
  completed_at: string | null;
}

/**
 * ReorderCategoryPayload for drag-and-drop reordering
 */
export interface ReorderCategoryPayload {
  category_id: string;
  new_order: number;
}

/**
 * BulkCategoryOperation for batch operations
 */
export interface BulkCategoryOperation {
  action: 'activate' | 'deactivate' | 'delete' | 'reorder';
  category_ids: string[];
  data?: any;
}

/**
 * CategoryFilter for filtering categories
 */
export interface CategoryFilter {
  search?: string;
  is_active?: boolean;
  parent_id?: string | null;
  store_id?: string;
}

/**
 * ItemTag for item classification (vegan, gluten-free, etc.)
 */
export type ItemTag =
  | 'vegan'
  | 'vegetarian'
  | 'gluten-free'
  | 'dairy-free'
  | 'spicy'
  | 'popular'
  | 'new'
  | 'seasonal'
  | 'best-seller';

/**
 * MenuSetupWizardData collects data during wizard flow
 */
export interface MenuSetupWizardData {
  categories: CreateCategoryData[];
  skip_items: boolean;
}
