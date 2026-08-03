export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatCompactCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '₹0';
  const val = Number(value);
  if (val === 0) return '₹0';
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (absVal >= 10000000) {
    return `${sign}₹${(absVal / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  }
  if (absVal >= 100000) {
    return `${sign}₹${(absVal / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  }
  if (absVal >= 1000) {
    return `${sign}₹${(absVal / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return `${sign}₹${absVal}`;
};

export const formatINR = formatCurrency;

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'Active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'Pending Renewal': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    case 'Renewed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    case 'Expired': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  }
};

export const getDaysLeftColor = (days) => {
  if (days < 0) return 'text-red-600 dark:text-red-400 font-bold';
  if (days <= 15) return 'text-orange-600 dark:text-orange-400 font-bold';
  if (days <= 30) return 'text-yellow-600 dark:text-yellow-400 font-medium';
  return 'text-green-600 dark:text-green-400';
};

export const formatDateTime = (dateString, options = {}) => {
  if (!dateString) return '';
  let parsedString = dateString;
  if (typeof dateString === 'string') {
    // If it doesn't have a timezone specifier, default it to UTC/Z
    if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('-GMT')) {
      parsedString = dateString.includes('T') ? dateString + 'Z' : dateString.replace(' ', 'T') + 'Z';
    }
  }
  const date = new Date(parsedString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  };
  
  return date.toLocaleString('en-IN', defaultOptions);
};
