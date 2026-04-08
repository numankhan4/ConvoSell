export type PasswordRuleResult = {
  label: string;
  passed: boolean;
};

export type PasswordValidationResult = {
  isValid: boolean;
  rules: PasswordRuleResult[];
};

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

export function validateStrongPassword(password: string): PasswordValidationResult {
  const value = password || '';

  const rules: PasswordRuleResult[] = [
    {
      label: 'At least 12 characters',
      passed: value.length >= 12,
    },
    {
      label: 'At least one uppercase letter',
      passed: /[A-Z]/.test(value),
    },
    {
      label: 'At least one lowercase letter',
      passed: /[a-z]/.test(value),
    },
    {
      label: 'At least one number',
      passed: /\d/.test(value),
    },
    {
      label: 'At least one special character',
      passed: /[^A-Za-z\d]/.test(value),
    },
  ];

  const isValid = value.length >= 12 && strongPasswordRegex.test(value);

  return {
    isValid,
    rules,
  };
}
