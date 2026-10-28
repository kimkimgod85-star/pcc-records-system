export const REQUEST_REJECT_REASONS = [
  'Incomplete or incorrect information in the request',
  'Student ID or name does not match our school records',
  'Unsettled school account or missing clearance',
  'Missing requirement (valid ID, authorization letter, or clearance)',
  'Duplicate request: you already have an active request for this document',
  'This document cannot be released yet for your record',
];

export const PAYMENT_REJECT_REASONS = [
  'Proof of payment is blurry or unreadable',
  'Amount paid does not match the fee',
  'Reference / OR number not found or does not match',
  'This payment was already used for another request',
  'Wrong recipient or wrong GCash account',
];

export const CASHIER_PAYMENT_REJECT_REASONS = [
  'Student did not present Official Receipt and REQ ID',
  'Amount on the Official Receipt does not match the fee',
  'REQ ID does not match this request',
  'Official Receipt looks invalid or incomplete',
  'This payment was already used for another request',
];

/** Older wording still saved on past requests. */
const LEGACY_REASONS = [
  'Duplicate request — you already have an active request for this document',
];

export const ALL_REJECT_REASONS = [
  ...REQUEST_REJECT_REASONS,
  ...PAYMENT_REJECT_REASONS,
  ...CASHIER_PAYMENT_REJECT_REASONS,
  ...LEGACY_REASONS,
];
