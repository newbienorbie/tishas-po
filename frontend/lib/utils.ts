import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function for consistent number formatting across the app
// Format: comma for thousands separator, dot for decimal (e.g., 3,100.56)
export const formatNumber = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format quantity without unnecessary decimal places
export const formatQuantity = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
  if (isNaN(num)) return '-';
  if (Number.isInteger(num)) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};
