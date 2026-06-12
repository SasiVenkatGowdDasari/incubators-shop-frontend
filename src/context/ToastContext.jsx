import { createContext, useState, useCallback } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prevToasts) => [...prevToasts, { id, message, type }]);

        // Auto-remove toast after 3 seconds
        setTimeout(() => {
            setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id) => {
        setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* TOAST CONTAINER */}
            <div className="fixed bottom-6 right-6 z-100 flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// --- Individual Toast Component ---
const ToastItem = ({ toast, onClose }) => {
    const isSuccess = toast.type === 'success';
    const isError = toast.type === 'error';

    // Tailwind styling based on type
    const baseStyle = "flex items-center gap-3 p-4 pr-6 rounded-2xl border backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transform transition-all duration-500 animate-in slide-in-from-right-8 fade-in pointer-events-auto min-w-[280px]";
    const typeStyle = isSuccess 
        ? "bg-green-900/20 border-green-500/30 text-green-400" 
        : isError 
            ? "bg-red-900/20 border-red-500/30 text-red-400" 
            : "bg-blue-900/20 border-blue-500/30 text-blue-400";

    const icon = isSuccess ? "✅" : isError ? "⚠️" : "ℹ️";

    return (
        <div className={`${baseStyle} ${typeStyle}`}>
            <span className="text-xl drop-shadow-md">{icon}</span>
            <p className="font-bold text-sm tracking-wide text-white">{toast.message}</p>
            <button 
                onClick={onClose} 
                className="ml-auto text-gray-500 hover:text-white transition-colors"
            >
                &times;
            </button>
        </div>
    );
};