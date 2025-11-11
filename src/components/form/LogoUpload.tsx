import React, { useState, useRef, useCallback } from 'react';
import { PhotoIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface LogoUploadProps {
  value?: string;
  onChange: (file: File | null, previewUrl: string | null) => void;
  error?: string;
  disabled?: boolean;
}

export function LogoUpload({ value, onChange, error, disabled }: LogoUploadProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t('onboarding.invalidFileType'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('onboarding.fileTooLarge'));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setPreview(previewUrl);
      onChange(file, previewUrl);
    };
    reader.readAsDataURL(file);
  }, [onChange, t]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    onChange(null, null);
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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
        <span>
          {t('onboarding.storeLogo')} <span className="text-gray-400 text-xs ml-1">({t('common.optional')})</span>
        </span>

        {/* Info icon with popover */}
        <div className="relative group inline-block">
          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />

          {/* Popover tooltip */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10 w-64">
            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
              <p>{t('onboarding.logoCanUpdateLater')}</p>
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      </label>

      {preview ? (
        /* Preview Mode */
        <div className="relative group">
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 transition-all hover:border-orange-400">
            <div className="flex items-center justify-center">
              <img
                src={preview}
                alt="Store logo preview"
                className="max-h-32 max-w-full object-contain rounded"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('common.remove')}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Upload Mode */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          className={`
            relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer
            ${isDragging
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-300 hover:border-orange-400 hover:bg-gray-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
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

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className={`
              rounded-full p-3 transition-colors
              ${isDragging ? 'bg-orange-100' : 'bg-gray-100'}
            `}>
              <PhotoIcon className={`
                h-8 w-8 transition-colors
                ${isDragging ? 'text-orange-600' : 'text-gray-400'}
              `} />
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {isDragging
                  ? t('onboarding.dropImageHere')
                  : t('onboarding.dragDropOrClick')
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('onboarding.logoRequirements')}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}

      {preview && (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('onboarding.changeImage')}
        </button>
      )}
    </div>
  );
}
