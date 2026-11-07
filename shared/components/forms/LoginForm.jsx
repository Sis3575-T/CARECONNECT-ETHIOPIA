import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, Info } from 'lucide-react';
import { TextInput } from './TextInput.jsx';
import { PasswordInput } from './PasswordInput.jsx';
import { Checkbox } from './Checkbox.jsx';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../feedback/Alert.jsx';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Accessible Portal Login Form
 *
 * Implements WCAG 2.1 AA accessible credentials authentication form with:
 * - Real-time client-side validation (email format, required fields)
 * - Server error alert display
 * - Password visibility toggle
 * - Remember device checkbox
 * - Loading state with keyboard submit (Enter key)
 * - Portal accent button customization
 * - Quick-fill demo account selector for testing & evaluation
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({
  portalId = 'health-centre',
  portalTitle = 'Healthcare Portal',
  initialEmail = '',
  onSubmit,
  loading: externalLoading = false,
  serverError = null,
  onClearServerError,
  accent = 'emerald', // 'sky' | 'emerald' | 'purple' | 'navy'
  demoAccounts = [],
  forgotPasswordHref = '#',
  className
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [internalLoading, setInternalLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isLoading = externalLoading || internalLoading;

  // Clear specific field error on change
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (serverError && onClearServerError) {
      onClearServerError();
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (serverError && onClearServerError) {
      onClearServerError();
    }
  };

  const validate = () => {
    const nextErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Official healthcare email is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = 'Please provide a valid official email address format.';
    }

    if (!password) {
      nextErrors.password = 'Password is required to authenticate.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isLoading) {
      return;
    }

    if (onSubmit) {
      setInternalLoading(true);
      try {
        await onSubmit({
          email: email.trim(),
          password,
          rememberMe
        });
      } finally {
        setInternalLoading(false);
      }
    }
  };

  const handleSelectDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password || 'CareConnect@2026!');
    setErrors({});
    if (serverError && onClearServerError) {
      onClearServerError();
    }
  };

  // Button background styling based on portal accent
  const buttonAccentClasses = {
    sky: 'bg-sky-600 hover:bg-sky-700 text-white focus-visible:ring-sky-500 active:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500 active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500',
    purple: 'bg-purple-600 hover:bg-purple-700 text-white focus-visible:ring-purple-500 active:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500',
    navy: 'bg-slate-900 hover:bg-slate-800 text-white focus-visible:ring-slate-700 active:bg-black dark:bg-blue-900 dark:hover:bg-blue-800'
  }[accent] || 'bg-emerald-600 hover:bg-emerald-700 text-white';

  return (
    <div className={cn('w-full flex flex-col gap-4', className)}>
      {/* Accessible Live Error Alert */}
      <div aria-live="polite" aria-atomic="true">
        {serverError && (
          <Alert
            variant="error"
            title="Authentication Failed"
            description={serverError}
            className="mb-2"
          />
        )}
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
        {/* Email Field */}
        <TextInput
          id={`${portalId}-login-email`}
          name="email"
          label="Official Email Address"
          type="email"
          autoComplete="username"
          autoFocus={!initialEmail}
          required
          value={email}
          onChange={handleEmailChange}
          placeholder="clinician.name@careconnect.gov.et"
          error={errors.email}
          disabled={isLoading}
          leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
        />

        {/* Password Field */}
        <PasswordInput
          id={`${portalId}-login-password`}
          name="password"
          label="Secure Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={handlePasswordChange}
          placeholder="••••••••••••"
          error={errors.password}
          disabled={isLoading}
        />

        {/* Form Options: Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <Checkbox
            id={`${portalId}-remember-me`}
            name="rememberMe"
            label="Remember this workstation"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <a
            href={forgotPasswordHref}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors underline-offset-4 hover:underline"
          >
            Forgot password?
          </a>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          loading={isLoading}
          loadingText="Authenticating..."
          className={cn('w-full justify-center shadow-md', buttonAccentClasses)}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Sign In to {portalTitle}
        </Button>
      </form>

      {/* Quick-fill Demo Accounts Helper */}
      {demoAccounts && demoAccounts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 mb-2.5 text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Quick Fill Demo Accounts
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {demoAccounts.map((account, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectDemo(account)}
                disabled={isLoading}
                className="text-left px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all text-xs group"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                  {account.label}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {account.email}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginForm;
