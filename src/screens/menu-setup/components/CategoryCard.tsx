/**
 * CategoryCard Component
 *
 * Displays a category with edit/delete actions
 */

import React from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '../../../components/ui/Button';
import type { Category } from '../../../types/menu';

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  isDragging?: boolean;
  isSubcategory?: boolean;
  parentName?: string;
}

export function CategoryCard({
  category,
  onEdit,
  onDelete,
  isDragging,
  isSubcategory = false,
  parentName,
}: CategoryCardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border-2 ${
        isDragging
          ? 'border-orange-500 shadow-lg'
          : 'border-gray-200 dark:border-gray-700'
      } p-4 cursor-move transition-all hover:shadow-md ${
        isSubcategory ? 'ml-8' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1">
          {/* Category image or color indicator */}
          {category.image_url ? (
            <img
              src={category.image_url}
              alt={category.name}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: category.color }}
            >
              {category.name.charAt(0)}
            </div>
          )}

          {/* Category info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {category.name}
              </h3>
              {isSubcategory && parentName && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  Subcategory of {parentName}
                </span>
              )}
            </div>
            {category.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {category.description}
              </p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Order: {category.sort_order}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            className="p-2"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category);
            }}
            className="p-2 text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
