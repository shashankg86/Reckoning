import React, { useState, useRef, useCallback } from 'react';
import { ArrowUpTrayIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface ImageUploadProps {
  value?: string | File;
  onChange: (file: File | null) => void;
  onBlur?: () => void;
  maxSizeMB?: number;
  disabled?: boolean;
  error?: string;
  label?: string;
  hint?: string;
  placeholder?: string;
}

export default function ImageUpload({
  value,
  onChange,
  onBlur,
  maxSizeMB = 5,
  disabled = false,
  error,
  label,
  hint,
  placeholder = 'Click to upload or drag and drop'
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate preview URL from File or string URL
  React.useEffect(() => {
    if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof value === 'string' && value) {
      setPreview(value);
    } else {
      setPreview(null);
    }
  }, [value]);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please upload an image file (JPG, PNG, GIF, SVG, etc.)';
    }

    // Check file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    return null;
  }, [maxSizeMB]);

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    onChange(file);
  }, [onChange, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onBlur={onBlur}
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-orange-500 bg-orange-50'
            : preview
            ? 'border-gray-300 bg-white'
            : 'border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-300' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        {preview ? (
          <div className="relative p-4">
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 mx-auto rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove image"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="flex justify-center mb-3">
              {isDragging ? (
                <ArrowUpTrayIcon className="w-12 h-12 text-orange-500 animate-bounce" />
              ) : (
                <PhotoIcon className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {isDragging ? 'Drop image here' : placeholder}
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF, SVG up to {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {hint && !error && (
        <p className="mt-2 text-xs text-gray-500">{hint}</p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
