import React, { useState, useRef, useEffect } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

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
  accept = 'image/jpeg,image/jpg,image/png,image/webp,image/gif',
  maxSizeMB = 5,
}: ImageUploadProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const validateFile = (file: File): boolean => {
    setError(null);

    // Check file type
    const allowedTypes = accept.split(',').map((t) => t.trim());
    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return false;
    }

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File too large. Maximum size: ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
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

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      onChange(file);
    }
  };

  const handleClick = () => {
    if (!disabled) {
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
          transition-all cursor-pointer overflow-hidden
          ${
            isDragging
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${preview ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />

        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {!disabled && (
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
              {isDragging ? 'Drop image here' : placeholder}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              {t('common.or')} drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
              Max {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
