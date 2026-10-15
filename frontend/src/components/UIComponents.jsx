import React from 'react';
import { X, Check, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';

// 1. Button
export const Button = ({ children, variant = 'primary', size = 'md', className = '', loading = false, disabled = false, ...props }) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg portal-btn focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  
  const variants = {
    primary: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] focus:ring-[var(--primary)] shadow-xs hover:shadow-md',
    secondary: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700',
    outline: 'border border-[var(--border-color)] bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-primary)] hover:border-[var(--primary)]',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-primary)]',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-xs'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5'
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
};

// 2. Input
export const Input = ({ label, error, className = '', ...props }) => (
  <div className="w-full flex flex-col gap-1.5">
    {label && <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</label>}
    <input
      className={`w-full px-3.5 py-2 text-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-ring)] transition-all ${error ? 'border-red-500' : ''} ${className}`}
      {...props}
    />
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

// 3. Select
export const Select = ({ label, options = [], error, className = '', ...props }) => (
  <div className="w-full flex flex-col gap-1.5">
    {label && <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</label>}
    <select
      className={`w-full px-3.5 py-2 text-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-ring)] transition-all ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

// 4. Badge
export const Badge = ({ children, variant = 'info', className = '' }) => {
  const styles = {
    info: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    success: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    warning: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    danger: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900',
    purple: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900',
    primary: 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/30'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

// 5. Card
export const Card = ({ children, className = '', hover = true, ...props }) => (
  <div
    className={`p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-2xs ${hover ? 'portal-card' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// 6. Modal
export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full ${maxWidth} bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

// 7. StatCard
export const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary', className = '' }) => (
  <Card hover className={`relative overflow-hidden portal-card ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{title}</p>
        <h2 className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{value}</h2>
        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
      </div>
      {Icon && (
        <div className="p-3 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] transition-transform duration-200 group-hover:scale-110">
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  </Card>
);

// 8. EmptyState
export const EmptyState = ({ title, description, icon: Icon, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)]/50">
    {Icon && <Icon className="w-12 h-12 text-[var(--text-muted)] mb-4 stroke-1" />}
    <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
    <p className="text-sm text-[var(--text-muted)] max-w-sm mt-1 mb-6">{description}</p>
    {actionLabel && onAction && (
      <Button onClick={onAction} variant="primary">
        {actionLabel}
      </Button>
    )}
  </div>
);

// 9. Skeleton Loader
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`} />
);

// 10. Toast Container Component
export const ToastContainer = ({ toasts, onRemove }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center justify-between p-4 rounded-xl shadow-xl border text-sm font-medium transition-all transform translate-y-0 ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-700'
              : toast.type === 'error'
              ? 'bg-red-900/90 text-red-100 border-red-700'
              : 'bg-slate-900/90 text-slate-100 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'success' && <Check className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => onRemove(toast.id)} className="ml-4 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
