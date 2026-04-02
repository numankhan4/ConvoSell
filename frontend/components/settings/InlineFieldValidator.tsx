'use client';

import { ReactNode, useState, useEffect } from 'react';

interface InlineFieldValidatorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'tel';
  required?: boolean;
  validator?: (value: string) => { valid: boolean; message?: string };
  helpText?: string;
  exampleText?: string;
  className?: string;
}

export default function InlineFieldValidator({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  validator,
  helpText,
  exampleText,
  className = '',
}: InlineFieldValidatorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; message?: string } | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Run validation when value changes (but only show after user has typed)
  useEffect(() => {
    if (value && validator) {
      const result = validator(value);
      setValidation(result);
      setShowValidation(true);
    } else {
      setValidation(null);
      setShowValidation(false);
    }
  }, [value, validator]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (value) {
      setShowValidation(true);
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
            showValidation && validation
              ? validation.valid
                ? 'border-green-500 focus:ring-green-500 pr-10'
                : 'border-red-500 focus:ring-red-500 pr-10'
              : 'border-gray-300 focus:ring-primary-500'
          }`}
        />

        {/* Validation Icon */}
        {showValidation && validation && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validation.valid ? (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Help Text / Example Text (shown on focus) */}
      {isFocused && exampleText && (
        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {exampleText}
        </p>
      )}

      {/* Validation Message */}
      {showValidation && validation && !validation.valid && validation.message && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {validation.message}
        </p>
      )}

      {/* Success Message */}
      {showValidation && validation && validation.valid && validation.message && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {validation.message}
        </p>
      )}

      {/* Static Help Text (shown when not focused) */}
      {!isFocused && !showValidation && helpText && (
        <p className="text-xs text-gray-500 mt-1">{helpText}</p>
      )}
    </div>
  );
}

// Common validators
export const validators = {
  e164Phone: (value: string) => {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    const valid = e164Regex.test(value);
    return {
      valid,
      message: valid 
        ? '✓ Valid E.164 format' 
        : 'Must start with + followed by country code (e.g., +923001234567)',
    };
  },

  shopifyDomain: (value: string) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    const valid = domainRegex.test(value);
    return {
      valid,
      message: valid
        ? '✓ Valid Shopify domain'
        : 'Must be a valid Shopify domain (e.g., yourstore.myshopify.com)',
    };
  },

  notEmpty: (value: string) => {
    const valid = value.trim().length > 0;
    return {
      valid,
      message: valid ? '✓ Field filled' : 'This field is required',
    };
  },

  minLength: (min: number) => (value: string) => {
    const valid = value.length >= min;
    return {
      valid,
      message: valid ? `✓ Valid length` : `Must be at least ${min} characters`,
    };
  },

  isNumeric: (value: string) => {
    const valid = /^\d+$/.test(value);
    return {
      valid,
      message: valid ? '✓ Valid numeric value' : 'Must contain only numbers',
    };
  },
};
