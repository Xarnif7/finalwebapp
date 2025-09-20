import { useState, useCallback } from 'react';

let toastCount = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = ++toastCount;
    const newToast = {
      id,
      ...toast,
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback((message, options = {}) => {
    return addToast({
      message,
      variant: 'default',
      ...options,
    });
  }, [addToast]);

  const toastSuccess = useCallback((message, options = {}) => {
    return addToast({
      message,
      variant: 'success',
      ...options,
    });
  }, [addToast]);

  const toastError = useCallback((message, options = {}) => {
    return addToast({
      message,
      variant: 'destructive',
      ...options,
    });
  }, [addToast]);

  const toastWarning = useCallback((message, options = {}) => {
    return addToast({
      message,
      variant: 'warning',
      ...options,
    });
  }, [addToast]);

  return {
    toasts,
    toast,
    toastSuccess,
    toastError,
    toastWarning,
    removeToast,
  };
};
