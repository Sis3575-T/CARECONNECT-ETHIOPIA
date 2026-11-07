/**
 * CareConnect Ethiopia - Data Formatting Utilities
 * Standardizes clinical dates, phone numbers, and patient IDs with Ethiopian locale support.
 */

/**
 * Format ISO date string into readable clinical date (East Africa Time UTC+3)
 */
export function formatClinicalDate(isoString, includeTime = false) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';

    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit', hour12: true })
    };

    return new Intl.DateTimeFormat('en-GB', options).format(date);
  } catch {
    return '—';
  }
}

/**
 * Format time relative to now (e.g. "5m ago", "2h ago", "Yesterday")
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return formatClinicalDate(isoString);
  } catch {
    return '—';
  }
}

/**
 * Format Ethiopian phone number to national standard (+251 9XX XXX XXX)
 */
export function formatEthiopianPhone(phone) {
  if (!phone) return '—';
  const digits = String(phone).replace(/\D/g, '');

  if (digits.startsWith('251') && digits.length === 12) {
    return `+251 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `+251 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `+251 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

/**
 * Format patient Fayda ID or MRN
 */
export function formatPatientId(id) {
  if (!id) return '—';
  const str = String(id).trim();
  return str.toUpperCase();
}

/**
 * Truncate long strings safely with ellipsis
 */
export function truncateText(text, maxLength = 40) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
