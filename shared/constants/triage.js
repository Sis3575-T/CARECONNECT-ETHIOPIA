/**
 * CareConnect Ethiopia - Clinical Triage & Referral Status Constants
 * Matches Ethiopian National Referral Guidelines and Part 08/09 backend state machine.
 */

export const TRIAGE_PRIORITIES = {
  EMERGENCY: {
    key: 'EMERGENCY',
    label: 'Emergency (Red)',
    amharicLabel: 'አስቸኳይ (ቀይ)',
    slaMinutes: 15,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    dotColor: 'bg-rose-500',
    textColor: 'text-rose-600 dark:text-rose-400'
  },
  URGENT: {
    key: 'URGENT',
    label: 'Urgent (Yellow)',
    amharicLabel: 'አስፈላጊ (ቢጫ)',
    slaMinutes: 120, // 2 hours
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400'
  },
  PRIORITY: {
    key: 'PRIORITY',
    label: 'Priority (Blue)',
    amharicLabel: 'ቅድሚያ (ሰማያዊ)',
    slaMinutes: 360, // 6 hours
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    dotColor: 'bg-sky-500',
    textColor: 'text-sky-600 dark:text-sky-400'
  },
  ROUTINE: {
    key: 'ROUTINE',
    label: 'Routine (Green)',
    amharicLabel: 'መደበኛ (አረንጓዴ)',
    slaMinutes: 1440, // 24 hours
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  }
};

export const REFERRAL_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  INFO_REQUESTED: 'INFO_REQUESTED',
  REASSIGNED: 'REASSIGNED',
  IN_TRANSIT: 'IN_TRANSIT',
  ARRIVED: 'ARRIVED',
  ADMITTED: 'ADMITTED',
  DISCHARGED: 'DISCHARGED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

export function getTriageMeta(priorityKey) {
  const normalized = (priorityKey || 'ROUTINE').toUpperCase();
  return TRIAGE_PRIORITIES[normalized] || TRIAGE_PRIORITIES.ROUTINE;
}
