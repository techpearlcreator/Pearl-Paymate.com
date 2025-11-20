import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline', isLoading?: boolean }> = ({ 
  className = '', 
  variant = 'primary', 
  isLoading, 
  children, 
  ...props 
}) => {
  // Increased padding and font size for desktop
  const base = "inline-flex items-center justify-center px-5 py-3 md:px-6 md:py-4 rounded-xl font-medium text-sm md:text-base transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary text-white hover:bg-slate-800 focus:ring-slate-500 shadow-lg shadow-slate-200",
    secondary: "bg-white text-slate-700 border border-gray-200 hover:bg-gray-50 focus:ring-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    outline: "border-2 border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-500"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm md:text-base font-medium text-slate-700 mb-2">{label}</label>}
    <input 
      // Increased padding and font size
      className={`w-full px-4 py-3 md:py-4 rounded-xl border border-gray-300 bg-white text-gray-900 text-base placeholder:text-gray-400 focus:border-ocean focus:ring-2 focus:ring-cyan-100 outline-none transition-all ${className}`}
      {...props} 
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, className = '', children, ...props }) => (
    <div className="w-full">
      {label && <label className="block text-sm md:text-base font-medium text-slate-700 mb-2">{label}</label>}
      <select 
        // Increased padding and font size
        className={`w-full px-4 py-3 md:py-4 rounded-xl border border-gray-300 focus:border-ocean focus:ring-2 focus:ring-cyan-100 outline-none transition-all bg-white text-gray-900 text-base ${className}`}
        {...props} 
      >
        {children}
      </select>
    </div>
  );

export const Card: React.FC<{ children: React.ReactNode; className?: string, title?: string, action?: React.ReactNode }> = ({ children, className = '', title, action }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
    {(title || action) && (
        <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
            {title && <h3 className="font-bold text-lg md:text-xl text-slate-800">{title}</h3>}
            {action && <div>{action}</div>}
        </div>
    )}
    <div className="p-5 md:p-8">{children}</div>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string; className?: string }> = ({ children, color = 'blue', className = '' }) => {
    const colors: any = {
        pink: 'bg-pink-100 text-pink-800',
        blue: 'bg-sky-100 text-sky-800',
        ocean: 'bg-cyan-100 text-cyan-800',
        violet: 'bg-indigo-100 text-indigo-800',
        green: 'bg-emerald-100 text-emerald-800',
        red: 'bg-rose-100 text-rose-800',
        yellow: 'bg-amber-100 text-amber-800',
        gray: 'bg-slate-100 text-slate-800',
        dark: 'bg-slate-800 text-white'
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider ${colors[color] || colors.gray} ${className}`}>
            {children}
        </span>
    );
}

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md md:max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-slate-600 text-3xl">&times;</button>
        </div>
        <div className="p-6 space-y-6">
            {children}
        </div>
      </div>
    </div>
  );
};