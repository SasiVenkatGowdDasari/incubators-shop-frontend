import { createContext, useState, useContext} from 'react';

const ConfirmContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: null,
        onCancel: null,
    });
    const [isMounted, setIsMounted] = useState(false);

    // Function to trigger the confirm dialog. Returns a Promise!
    const confirm = (title, message, confirmText = 'Yes, Continue', cancelText = 'Cancel') => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                confirmText,
                cancelText,
                onConfirm: () => {
                    closeModal();
                    resolve(true); // User clicked Yes
                },
                onCancel: () => {
                    closeModal();
                    resolve(false); // User clicked No
                }
            });
            setTimeout(() => setIsMounted(true), 10);
        });
    };

    const closeModal = () => {
        setIsMounted(false);
        setTimeout(() => setConfirmState(prev => ({ ...prev, isOpen: false })), 300);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            
            {/* THE BEAUTIFUL CONFIRMATION MODAL UI */}
            {confirmState.isOpen && (
                <div className={`fixed inset-0 z-200 flex items-center justify-center p-4 transition-all duration-300 ${isMounted ? 'bg-black/80 backdrop-blur-md opacity-100' : 'bg-transparent opacity-0'}`}>
                    <div className={`bg-[#111827] border border-gray-700 rounded-3xl p-8 max-w-sm w-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col items-center text-center transition-all duration-300 transform ${isMounted ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
                        
                        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-3xl mb-5 shadow-inner">
                            ⚠️
                        </div>
                        
                        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">{confirmState.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed mb-8">{confirmState.message}</p>
                        
                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={confirmState.onCancel} 
                                className="flex-1 py-3.5 rounded-xl font-bold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all duration-300"
                            >
                                {confirmState.cancelText}
                            </button>
                            <button 
                                onClick={confirmState.onConfirm} 
                                className="flex-1 py-3.5 rounded-xl font-bold text-white bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all duration-300 transform hover:-translate-y-0.5"
                            >
                                {confirmState.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};