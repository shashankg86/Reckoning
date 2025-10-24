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
};

export function PhoneField({ label, value, onChange, defaultCountry = 'IN', placeholder, error, disabled, id }: Props) {
  const inputId = id ?? 'phone-input';
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative rpni">
        <PhoneInput
          id={inputId}
          value={value}
          onChange={(v) => onChange(v || '')}
          defaultCountry={defaultCountry as any}
          international
          countryCallingCodeEditable={false}
          className="w-full"
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <style>{`
        .rpni .PhoneInputInput { 
          width: 100%;
          border: 1px solid rgb(209 213 219);
          background: white;
          color: rgb(17 24 39);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem 0.5rem 2.75rem; /* space for flag */
          outline: none;
        }
        .dark .rpni .PhoneInputInput {
          background: rgb(55 65 81);
          border-color: rgb(75 85 99);
          color: white;
        }
        .rpni:focus-within .PhoneInputInput { 
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 1px rgb(59 130 246 / 0.5);
        }
        .rpni .PhoneInputCountryIcon { width: 1.25rem; height: 1rem; }
        .rpni .PhoneInputCountry { position: absolute; left: 0.5rem; top: 0.5rem; }
      `}</style>
    </div>
  );
}
