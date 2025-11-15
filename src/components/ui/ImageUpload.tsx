import React, { useState, useRef, useEffect } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { ImageProcessor } from '../../lib/storage';

interface ImageUploadProps {
  value?: string | File | null;
  onChange: (file: File | null) => void;
  onRemove?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  accept?: string;
  maxSizeMB?: number;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  placeholder = 'Click to upload image',
  className = '',
  disabled = false,
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  maxSizeMB = 1, // Changed to 1MB default
}: ImageUploadProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when value changes
  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }

    if (typeof value === 'string') {
      // URL string
      setPreview(value);
    } else if (value instanceof File) {
      // File object - create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(value);
    }
  }, [value]);

  /**
   * Process file: validate + compress silently
   * User doesn't see compression - it happens in background
   */
  const processFile = async (file: File): Promise<void> => {
    setError(null);
    setIsProcessing(true);

    try {
      // Process image (validate + compress automatically)
      const processedFile = await ImageProcessor.processForUpload(file);

      // Pass compressed file to parent
      onChange(processedFile);
    } catch (err) {
      // Show user-friendly error message
      const errorMessage = err instanceof Error ? err.message : 'Invalid image file';
      setError(errorMessage);
      onChange(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isProcessing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isProcessing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClick = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg
          transition-all overflow-hidden
          ${
            isDragging
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${preview ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled || isProcessing}
          className="hidden"
        />

        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {!disabled && !isProcessing && (
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                title="Remove image"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <div className="text-center p-4">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isProcessing
                ? 'Processing...'
                : isDragging
                ? 'Drop image here'
                : placeholder}
            </p>
            {!isProcessing && (
              <>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  {t('common.or')} drag and drop
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
                  Max {maxSizeMB}MB
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
