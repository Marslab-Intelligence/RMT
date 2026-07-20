import React from 'react';
import { formatDate } from '../utils/formatters';
import { Calendar } from 'lucide-react';

export default function IndianDateInput({ value, onChange, className = '', placeholder = 'dd/mm/yyyy', ...props }) {
  const displayValue = value ? formatDate(value) : '';
  
  // If className has custom border/padding/background, we use it directly; otherwise we default to input-field styling
  const isCustom = className.includes('border') || className.includes('bg-') || className.includes('px-');
  const containerClasses = isCustom
    ? `relative flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 ${className}`
    : `input-field relative flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500/60 w-full ${className}`;

  return (
    <div className={containerClasses}>
      {/* Native Date Input on Top - 100% transparent via inline styles */}
      <input
        type="date"
        value={value || ''}
        onChange={onChange}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 10,
          border: 'none',
          outline: 'none',
          background: 'none'
        }}
        {...props}
      />
      
      {/* Styled Display Field Underneath */}
      <span className={`pointer-events-none select-none ${displayValue ? '' : 'text-surface-400 dark:text-surface-500'}`}>
        {displayValue || placeholder}
      </span>
      <Calendar className="w-3.5 h-3.5 text-surface-400 dark:text-surface-500 pointer-events-none select-none ml-2 flex-shrink-0" />
    </div>
  );
}
