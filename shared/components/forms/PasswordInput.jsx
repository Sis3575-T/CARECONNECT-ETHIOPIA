import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import TextInput from './TextInput.jsx';

/**
 * CareConnect Ethiopia - Reusable Accessible Password Input
 * Includes toggle visibility button with accessible aria-label and keyboard access.
 */
export const PasswordInput = forwardRef(function PasswordInput(
  {
    name = 'password',
    label = 'Password',
    autoComplete = 'current-password',
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <TextInput
      ref={ref}
      name={name}
      label={label}
      type={showPassword ? 'text' : 'password'}
      autoComplete={autoComplete}
      rightIcon={
        <button
          type="button"
          tabIndex={0}
          onClick={() => setShowPassword(prev => !prev)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
      {...props}
    />
  );
});

export default PasswordInput;
