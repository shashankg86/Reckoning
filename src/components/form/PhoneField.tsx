import React from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

type Props = {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  defaultCountry?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  onBlur?: () => void;
};

export function PhoneField({ label, value, onChange, defaultCountry = 'IN', placeholder, error, disabled, id, onBlur }: Props) {
  const inputId = id ?? 'phone-input';
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative rpni">
        <PhoneInput
          id={inputId}
          value={value}
          onChange={(v) => onChange(v || '')}
          onBlur={onBlur}
          defaultCountry={defaultCountry as any}
          international
          countryCallingCodeEditable={false}
          className="w-full"
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <style>{`
        .rpni .PhoneInputInput {
          width: 100%;
          height: 42px;
          border: 1px solid rgb(209 213 219);
          background: white;
          color: rgb(17 24 39);
          border-radius: 0.375rem;
          padding: 0.625rem 0.75rem 0.625rem 3.5rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
          outline: none;
          transition: all 0.15s ease-in-out;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .rpni .PhoneInputInput:hover {
          border-color: rgb(156 163 175);
        }
        .rpni .PhoneInputInput:disabled {
          background: rgb(243 244 246);
          color: rgb(107 114 128);
          cursor: not-allowed;
        }
        .dark .rpni .PhoneInputInput {
          background: rgb(55 65 81);
          border-color: rgb(75 85 99);
          color: white;
        }
        .rpni:focus-within .PhoneInputInput {
          border-color: rgb(249 115 22);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
        }
        .rpni .PhoneInputCountryIcon {
          width: 1.5rem;
          height: 1.125rem;
          border-radius: 0.125rem;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
        }
        .rpni .PhoneInputCountry {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1;
        }
        .rpni .PhoneInputCountrySelect {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          width: 2.5rem;
          height: 100%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
