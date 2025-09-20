import React from 'react';
import { Toast, ToastClose, ToastDescription, ToastTitle } from './toast';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const ToastContainer = ({ toasts, removeToast }) => {
  const getIcon = (variant) => {
    switch (variant) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'destructive':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          className="min-w-[300px] shadow-lg"
        >
          <div className="flex items-start space-x-3">
            {getIcon(toast.variant)}
            <div className="flex-1">
              {toast.title && (
                <ToastTitle>{toast.title}</ToastTitle>
              )}
              <ToastDescription className="mt-1">
                {toast.message}
              </ToastDescription>
            </div>
          </div>
          <ToastClose onClick={() => removeToast(toast.id)} />
        </Toast>
      ))}
    </div>
  );
};

export default ToastContainer;
