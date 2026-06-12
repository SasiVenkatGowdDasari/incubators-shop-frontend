import { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import ReviewModal from '../components/ReviewModal';
import { ToastContext } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export default function ManageOrders() {
    const { showToast } = useContext(ToastContext);
    const confirm = useConfirm(); // Hooking into your beautiful UI Confirm Context

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [reviewModal, setReviewModal] = useState(null); 
    const [reviewedIds, setReviewedIds] = useState([]);
    
    // Action Loading State to disable buttons & show localized spinners
    const [loadingAction, setLoadingAction] = useState({ orderId: null, action: null });

    const [selectedMobileOrder, setSelectedMobileOrder] = useState(null);

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const response = await api.get('/orders');
                const sortedOrders = response.data.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
                setOrders(sortedOrders);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        loadOrders();
        const intervalId = setInterval(loadOrders, 10000);
        return () => clearInterval(intervalId);
    }, [refreshKey]);

    const handleDispatch = async (orderId) => {
        setLoadingAction({ orderId, action: 'DISPATCH' }); 
        const dispatchOtp = generateOTP();
        try {
            await api.put(`/orders/${orderId}/dispatch`, { dispatchOtp });
            showToast(`Order #${orderId} Dispatched! Driver OTP: ${dispatchOtp}`, 'success');
            setRefreshKey(p => p + 1);
            if (selectedMobileOrder?.id === orderId) setSelectedMobileOrder(null); 
        } catch (err) {
            console.error(err);
            showToast('Failed to dispatch order.', 'error'); 
        } finally {
            setLoadingAction({ orderId: null, action: null }); 
        }
    };

    const handleOrderStatus = async (orderId, newStatus) => {
        // RESTORED: Using your custom UI Confirm Context!
        if (newStatus === 'CANCELLED') {
            const isConfirmed = await confirm(
                "Cancel Order", 
                `Are you sure you want to cancel Order #${orderId}? This cannot be undone.`,
                "Yes, Cancel Order",
                "Keep Order"
            );
            
            // If the user clicks "Keep Order" (cancel), we stop the function here.
            if (!isConfirmed) return; 
        }

        setLoadingAction({ orderId, action: newStatus }); 

        try {
            await api.put(`/orders/${orderId}/status`, { status: newStatus });
            setRefreshKey(p => p + 1);
            showToast(`Order marked as ${newStatus}`, 'success'); 
            if (selectedMobileOrder?.id === orderId) setSelectedMobileOrder(null);
        } catch (err) {
            console.error(err);
            showToast(`Failed to mark order as ${newStatus}.`, 'error'); 
        } finally {
            setLoadingAction({ orderId: null, action: null }); 
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            'DELIVERED': 'bg-green-500/20 text-green-400',
            'IN_TRANSIT': 'bg-blue-500/20 text-blue-400',
            'ACCEPTED': 'bg-indigo-500/20 text-indigo-400',
            'CANCELLED': 'bg-red-500/20 text-red-400',
            'PLACED': 'bg-yellow-500/20 text-yellow-400'
        };
        return <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${styles[status] || styles['PLACED']}`}>{status}</span>;
    };

    // Shared UI Renderer with Loaders built in
    const renderActions = (order) => {
        const isAnyActionLoading = loadingAction.orderId === order.id;

        if (order.status === 'PLACED') {
            return (
                <div className="flex justify-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleOrderStatus(order.id, 'ACCEPTED'); }} 
                        disabled={isAnyActionLoading}
                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded font-bold transition text-xs shadow-lg w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center min-w-20"
                    >
                        {loadingAction.orderId === order.id && loadingAction.action === 'ACCEPTED' ? (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Accept'}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleOrderStatus(order.id, 'CANCELLED'); }} 
                        disabled={isAnyActionLoading}
                        className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded font-bold transition text-xs shadow-lg w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center min-w-20"
                    >
                        {loadingAction.orderId === order.id && loadingAction.action === 'CANCELLED' ? (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Cancel'}
                    </button>
                </div>
            );
        } else if (order.status === 'ACCEPTED') {
            return (
                <div className="flex flex-col items-center gap-2">
                    <span className="text-green-400 font-bold text-xs italic">Accepted ✓</span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDispatch(order.id); }} 
                        disabled={isAnyActionLoading}
                        className="w-full flex items-center justify-center gap-2 text-sm bg-blue-600 text-white py-2 rounded hover:bg-blue-500 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-9"
                    >
                        {loadingAction.orderId === order.id && loadingAction.action === 'DISPATCH' ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Dispatching...
                            </>
                        ) : 'Dispatch to Transit'}
                    </button>
                </div>
            );
        } else if (order.status === 'CANCELLED') {
            return <div className="text-center w-full"><span className="text-red-400 font-bold text-xs italic">CANCELLED ✕</span></div>;
        } else if (order.status === 'DELIVERED') {
            if (order.userReviewed) return <div className="text-center w-full"><span className="text-blue-400 font-bold text-xs">User Reviewed ✅</span></div>;
            if (reviewedIds.includes(order.id) || order.adminReviewed) return <div className="text-center w-full"><span className="text-green-400 font-bold text-xs italic">Admin Reviewed ✅</span></div>;
            
            return (
                <button 
                    onClick={(e) => { e.stopPropagation(); setReviewModal({ productId: order.product?.id, orderId: order.id }); setSelectedMobileOrder(null); }} 
                    disabled={isAnyActionLoading}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-2 rounded font-bold transition text-xs shadow-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Add Admin Review
                </button>
            );
        }
        return <div className="text-center w-full"><span className="text-gray-500 italic text-xs">No action</span></div>;
    };

    if (loading) return <div className="text-center text-gray-400 py-8">Loading Orders...</div>;

    return (
        <div className="bg-transparent md:bg-[#111827] border-0 md:border border-gray-800 rounded-xl overflow-hidden md:shadow-2xl">
            
            <div className="md:hidden flex flex-col gap-4">
                {orders.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 bg-[#111827] rounded-xl border border-gray-800">No orders in the system.</div>
                ) : (
                    orders.map((order) => (
                        <div 
                            key={order.id} 
                            onClick={() => setSelectedMobileOrder(order)} 
                            className="bg-[#111827] p-5 rounded-xl border border-gray-800 shadow-lg cursor-pointer active:scale-[0.98] transition transform"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="text-white font-extrabold text-xl">#{order.id}</span>
                                    <p className="text-gray-300 font-semibold mt-0.5">{order.user?.fullName || 'Guest'}</p>
                                </div>
                                {getStatusBadge(order.status)}
                            </div>
                            <div className="flex justify-between items-end mt-4">
                                <span className="text-gray-500 text-xs font-medium">
                                    {order.orderDate ? new Date(order.orderDate).toLocaleString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', hour12: true
                                    }) : "N/A"}
                                </span>
                                <span className="text-blue-500 text-xs font-bold tracking-wide flex items-center gap-1">
                                    Details 
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-800/50 text-gray-400">
                        <tr>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Customer Name</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Date & Time</th>
                            <th className="px-4 py-4 font-semibold uppercase tracking-wider text-center">Qty</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {orders.length === 0 ? (
                            <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No orders in the system.</td></tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-800/30 transition">
                                    <td className="px-6 py-4 font-bold text-white">#{order.id}</td>
                                    <td className="px-6 py-4 text-gray-300 font-medium">
                                        {order.user?.fullName || 'Guest'} <span className="text-gray-500 text-xs">(#{order.user?.id || 'N/A'})</span>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-gray-400">
                                        <div className="flex flex-col gap-1">
                                            <span>
                                                {order.orderDate ? new Date(order.orderDate).toLocaleString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                }) : "N/A"}
                                            </span>
                                            {order.status === 'DELIVERED' && order.deliveredDate && (
                                                <span className="text-[10px] text-green-400 font-bold uppercase tracking-wide">
                                                    Delivered: {new Date(order.deliveredDate).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    
                                    <td className="px-4 py-4 text-white font-bold text-center text-lg">{order.quantity}</td>
                                    <td className="px-6 py-4 text-blue-400 font-bold">₹{order.totalPrice}</td>
                                    
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(order.status)}
                                            {order.status === 'IN_TRANSIT' && order.deliveryOtp && (
                                                <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-[10px] font-mono border border-gray-700">
                                                    OTP: {order.deliveryOtp}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 flex items-center justify-center h-full">
                                        {renderActions(order)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedMobileOrder && (
                <div 
                    className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-end md:hidden p-0"
                    onClick={() => setSelectedMobileOrder(null)}
                >
                    <div 
                        className="bg-[#111827] w-full rounded-t-3xl border-t border-gray-700 p-6 flex flex-col max-h-[90vh] overflow-y-auto animate-fade-in-up shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6"></div>

                        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                            <h3 className="text-2xl font-extrabold text-white">Order <span className="text-blue-500">#{selectedMobileOrder.id}</span></h3>
                            {getStatusBadge(selectedMobileOrder.status)}
                        </div>
                        
                        <div className="space-y-5 mb-8">
                            <div className="flex justify-between items-center border-b border-gray-800/50 pb-3">
                                <span className="text-gray-400 font-medium">Customer</span>
                                <span className="text-white font-bold text-right">{selectedMobileOrder.user?.fullName} <br/><span className="text-gray-500 text-xs font-normal">(ID: #{selectedMobileOrder.user?.id})</span></span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-800/50 pb-3">
                                <span className="text-gray-400 font-medium">Date & Time</span>
                                <span className="text-white font-bold text-right text-sm">
                                    {selectedMobileOrder.orderDate ? new Date(selectedMobileOrder.orderDate).toLocaleString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', hour12: true
                                    }) : "N/A"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-800/50 pb-3">
                                <span className="text-gray-400 font-medium">Quantity</span>
                                <span className="text-white font-extrabold text-lg bg-gray-800 px-3 rounded">{selectedMobileOrder.quantity}x</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-800/50 pb-3">
                                <span className="text-gray-400 font-medium">Total Amount</span>
                                <span className="text-blue-400 font-extrabold text-2xl">₹{selectedMobileOrder.totalPrice}</span>
                            </div>
                            
                            {selectedMobileOrder.status === 'IN_TRANSIT' && selectedMobileOrder.deliveryOtp && (
                                <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-xl text-center">
                                    <span className="text-blue-400 text-xs font-bold uppercase tracking-wider block mb-1">Delivery OTP</span>
                                    <span className="text-white font-mono text-2xl tracking-widest">{selectedMobileOrder.deliveryOtp}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto">
                            <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Order Actions</h4>
                            {renderActions(selectedMobileOrder)}
                        </div>
                    </div>
                </div>
            )}

            {reviewModal && (
                <ReviewModal
                    productId={reviewModal.productId}
                    orderId={reviewModal.orderId}
                    onSave={() => {
                        setReviewedIds([...reviewedIds, reviewModal.orderId]);
                        setReviewModal(null);
                        setRefreshKey(p => p + 1);
                    }}
                    onClose={() => setReviewModal(null)}
                />
            )}
        </div>
    );
}