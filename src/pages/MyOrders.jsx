import { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import ReviewModal from '../components/ReviewModal';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ========================================================
// ADVANCED SCROLL ANIMATION WRAPPER
// ========================================================
const FadeInScroll = ({ children, delay = 0, direction = 'up' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        if (domRef.current) observer.observe(domRef.current);
        return () => observer.disconnect();
    }, []);

    const directionClasses = {
        up: 'translate-y-12',
        left: '-translate-x-12',
        right: 'translate-x-12'
    };

    return (
        <div
            ref={domRef}
            className={`transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform ${
                isVisible ? 'opacity-100 translate-y-0 translate-x-0 scale-100' : `opacity-0 scale-95 ${directionClasses[direction]}`
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

export default function MyOrders() {
    const { user } = useContext(AuthContext);
    const [orders, setOrders] = useState([]);
    const [productsMap, setProductsMap] = useState({}); // To store product details
    const [loading, setLoading] = useState(true);
    const [reviewModal, setReviewModal] = useState(null); 
    const [reviewedIds, setReviewedIds] = useState([]);
    
    // OTP State
    const [deliveryOtps, setDeliveryOtps] = useState({});
    const [otpMessage, setOtpMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch orders and products simultaneously for better performance
                const [ordersResponse, productsResponse] = await Promise.all([
                    api.get(`/orders/user/${user.id}`),
                    api.get('/products')
                ]);

                // Map products by ID for quick lookup O(1)
                const pMap = {};
                productsResponse.data.forEach(p => {
                    pMap[p.id] = p;
                });
                setProductsMap(pMap);

                // Sort orders by most recent first
                const sortedOrders = ordersResponse.data.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
                setOrders(sortedOrders);
                
                setLoading(false);
            } catch (err) {
                setLoading(false);
                console.error(err);
            }
        };
        if (user) fetchData();
    }, [user]);

    const handleOtpChange = (orderId, value) => {
        setDeliveryOtps({ ...deliveryOtps, [orderId]: value });
    };

    const handleVerifyDelivery = async (orderId) => {
        setOtpMessage({ type: '', text: '' });
        const otpCode = deliveryOtps[orderId];

        if (!otpCode || otpCode.length !== 6) {
            setOtpMessage({ type: 'error', text: 'Please enter a valid 6-digit OTP.' });
            return;
        }

        try {
            await api.post(`/orders/${orderId}/verify-delivery`, { enteredOtp: otpCode });
            setOtpMessage({ type: 'success', text: 'Delivery Verified! Order Complete.' });
            
            // Refresh orders to fetch the new Delivered Date from the backend
            const response = await api.get(`/orders/user/${user.id}`);
            const sortedOrders = response.data.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
            setOrders(sortedOrders);
        } catch (err) {
            setOtpMessage({ type: 'error', text: err.response?.data || 'Invalid Delivery OTP.' });
        }
    };

    // Helper for Status Badge styling
    const getStatusStyle = (status) => {
        switch(status) {
            case 'DELIVERED': return 'bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]';
            case 'CANCELLED': return 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
            case 'IN_TRANSIT': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]';
            default: return 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
        }
    };

    // Helper to extract image URL correctly
    const getImageUrl = (urlStr) => {
        if (!urlStr) return null;
        const firstUrl = urlStr.split(',')[0].trim();
        if (firstUrl.startsWith('http')) return firstUrl;
        const cleanPath = firstUrl.startsWith('/') ? firstUrl : `/uploads/${firstUrl}`.replace('/uploads/uploads/', '/uploads/');
        return `${BACKEND_URL}${cleanPath}`;
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-bold tracking-widest text-sm sm:text-base animate-pulse">LOADING ORDERS...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0B1120] pt-4 sm:pt-6 pb-20 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-1/4 w-150 h-150 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="fixed bottom-0 left-1/4 w-150 h-150 bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                {/* --- BACK BUTTON --- */}
                <FadeInScroll delay={0} direction="right">
                    <div className="flex justify-start mb-6 sm:mb-8">
                        <Link 
                            to="/products" 
                            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#111827]/80 hover:bg-blue-600/20 text-gray-300 hover:text-blue-400 rounded-xl border border-gray-800 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-sm shadow-lg group w-fit"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            <span className="font-bold text-xs sm:text-sm tracking-wide">Back to Collection</span>
                        </Link>
                    </div>
                </FadeInScroll>

                {/* --- PAGE HEADER --- */}
                <FadeInScroll delay={100}>
                    <div className="mb-8 sm:mb-12 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400 tracking-tight mb-1 sm:mb-2 drop-shadow-lg">
                                Order History
                            </h1>
                            <p className="text-gray-400 font-medium text-xs sm:text-base">Track, manage, and review your purchases.</p>
                        </div>
                        <div className="hidden sm:flex items-center justify-center w-16 h-16 bg-[#111827] border border-gray-800 rounded-2xl shadow-inner">
                            <span className="text-3xl">📦</span>
                        </div>
                    </div>
                </FadeInScroll>
                
                {otpMessage.text && (
                    <FadeInScroll delay={0}>
                        <div className={`p-3 sm:p-4 rounded-xl mb-6 sm:mb-8 text-xs sm:text-base font-bold flex items-center gap-2 sm:gap-3 border backdrop-blur-sm ${otpMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            <span className="text-lg sm:text-xl">{otpMessage.type === 'success' ? '✅' : '⚠️'}</span> {otpMessage.text}
                        </div>
                    </FadeInScroll>
                )}

                <div className="space-y-6 sm:space-y-8">
                    {orders.length === 0 ? (
                        <FadeInScroll delay={200}>
                            <div className="bg-[#111827]/50 backdrop-blur-md p-8 sm:p-16 rounded-2xl sm:rounded-3xl border border-gray-800/80 shadow-2xl text-center">
                                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 ring-4 ring-gray-800">
                                    <span className="text-3xl sm:text-5xl">🛍️</span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">No Orders Found</h2>
                                <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-8 max-w-md mx-auto">You haven't placed any orders yet. Discover our premium incubators and upgrade your hatching setup today.</p>
                                <Link to="/products" className="inline-block w-full sm:w-auto bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:-translate-y-1">
                                    Start Shopping
                                </Link>
                            </div>
                        </FadeInScroll>
                    ) : (
                        orders.map((order, index) => {
                            const product = productsMap[order.productId]; // Get product info
                            
                            return (
                                <FadeInScroll key={order.id} delay={150 + (index * 50)}>
                                    <div className="bg-[#111827]/80 backdrop-blur-xl p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-gray-800 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] hover:border-blue-500/40 transition-all duration-500 group relative overflow-hidden">
                                        
                                        {/* Left Accent Bar */}
                                        <div className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 bg-linear-to-b from-blue-500 to-indigo-600 opacity-50 group-hover:opacity-100 transition-opacity"></div>

                                        {/* Top Row: Order ID & Status */}
                                        <div className="flex flex-row justify-between items-center gap-3 sm:gap-4 border-b border-gray-800/80 pb-4 sm:pb-5 mb-4">
                                            <div>
                                                <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-black tracking-widest mb-0.5 sm:mb-1">Order ID</p>
                                                <p className="font-extrabold text-white text-base sm:text-lg tracking-wide">#{order.id}</p>
                                            </div>
                                            <div className={`px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-xs font-black tracking-widest border uppercase text-center shrink-0 ${getStatusStyle(order.status)}`}>
                                                {order.status}
                                            </div>
                                        </div>

                                        {/* UPGRADED Product Information Box */}
                                        {product && (
                                            <div className="flex items-start gap-3 sm:gap-4 bg-[#0B1120]/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-800/50 mb-5 group-hover:border-gray-700/50 transition-colors">
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#111827] rounded-lg sm:rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-gray-800 shadow-inner">
                                                    {product.imageUrl ? (
                                                        <img src={getImageUrl(product.imageUrl)} alt={product.title} className="w-full h-full object-contain p-1.5 opacity-90 group-hover:scale-105 transition-transform duration-300" />
                                                    ) : (
                                                        <span className="text-2xl opacity-50">📦</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col justify-center flex-1 min-w-0">
                                                    <Link to={`/product/${product.id}`} className="text-white font-bold text-sm sm:text-base md:text-lg hover:text-blue-400 transition-colors truncate mb-1.5">
                                                        {product.title}
                                                    </Link>
                                                    
                                                    {/* SLEEK, RESPONSIVE BADGE SYSTEM */}
                                                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800/80 text-gray-300 border border-gray-700 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-inner">
                                                            <span className="text-gray-500">ID:</span> #{product.id}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-900/30 text-indigo-300 border border-indigo-500/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-inner">
                                                            <span className="text-indigo-500/80">CAP:</span> {product.capacity || 'N/A'}
                                                        </span>
                                                        {product.type && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-500/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-inner">
                                                                <span className="text-blue-500/80">TYPE:</span> {product.type}
                                                            </span>
                                                        )}
                                                        {product.material && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-500/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-inner">
                                                                <span className="text-emerald-500/80">MAT:</span> {product.material}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Middle Row: Date, Qty, Total (Single Row) + Actions */}
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
                                            
                                            {/* ONE ROW for Date, Quantity, Total */}
                                            <div className="flex flex-row justify-between items-start w-full md:w-3/4 pr-0 md:pr-6">
                                                <div className="flex-1">
                                                    <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Date</p>
                                                    <p className="text-xs sm:text-sm text-gray-300 font-medium">
                                                        {order.orderDate ? new Date(order.orderDate).toLocaleString('en-IN', {
                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                        }) : "N/A"}
                                                    </p>
                                                    {order.status === 'DELIVERED' && order.deliveredDate && (
                                                        <p className="text-[9px] sm:text-[10px] text-green-400 font-bold mt-1 sm:mt-1.5 flex items-center gap-1">
                                                            <span>✓</span> {new Date(order.deliveredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                        </p>
                                                    )}
                                                </div>
                                                
                                                <div className="flex-1 text-center sm:text-left">
                                                    <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Quantity</p>
                                                    <p className="font-bold text-white text-sm sm:text-lg">{order.quantity}<span className="text-gray-500 text-[9px] sm:text-sm ml-1 hidden sm:inline">Items</span></p>
                                                </div>
                                                
                                                <div className="flex-1 text-right sm:text-left">
                                                    <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Total</p>
                                                    <p className="font-black text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400 text-base sm:text-xl">₹{order.totalAmount}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Action Area (Review Indicator / Button) */}
                                            <div className="flex items-center justify-end w-full md:w-1/4 mt-2 md:mt-0">
                                                {order.adminReviewed ? (
                                                    <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-lg flex items-center justify-center w-full gap-2">
                                                        <span className="text-blue-400 text-xs sm:text-sm font-bold tracking-wide">Admin Reviewed</span>
                                                    </div>
                                                ) : reviewedIds.includes(order.id) || order.userReviewed ? (
                                                    <div className="bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg flex items-center justify-center w-full gap-2">
                                                        <span className="text-green-400 text-xs sm:text-sm font-bold tracking-wide">Reviewed</span>
                                                        <span>🌟</span>
                                                    </div>
                                                ) : order.status === 'DELIVERED' && (
                                                    <button
                                                        onClick={() => setReviewModal({ productId: order.productId, orderId: order.id })}
                                                        className="w-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 shadow-[0_0_15px_rgba(147,51,234,0.3)] active:scale-95 sm:hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] transform sm:hover:-translate-y-1 flex items-center justify-center gap-2"
                                                    >
                                                        <span>✍️</span> Rate Product
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* OTP Section (For In Transit) */}
                                        {order.status === 'IN_TRANSIT' && (
                                            <div className="mt-5 sm:mt-6 bg-yellow-500/5 border border-yellow-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
                                                {/* decorative background element */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>
                                                
                                                <div className="text-xs sm:text-sm text-yellow-500/80 relative z-10">
                                                    <p className="font-extrabold text-yellow-400 text-sm sm:text-base mb-1 flex items-center gap-2">
                                                        <span className="animate-pulse">🚚</span> Waiting for Delivery
                                                    </p>
                                                    <p className="leading-relaxed">Provide this 6-digit OTP to the delivery agent to receive your order.</p>
                                                </div>
                                                
                                                {/* Stacked Input + Button on Mobile, Horizontal on Desktop */}
                                                <div className="flex flex-col sm:flex-row w-full md:w-auto shadow-lg relative z-10 gap-0">
                                                    <input 
                                                        type="text" 
                                                        placeholder="OTP"
                                                        maxLength="6"
                                                        value={deliveryOtps[order.id] || ''}
                                                        onChange={(e) => handleOtpChange(order.id, e.target.value.replace(/\D/g, ''))}
                                                        className="w-full sm:w-36 px-4 py-2.5 sm:py-3 bg-[#0B1120] border border-gray-700 rounded-t-xl sm:rounded-t-none sm:rounded-l-xl focus:outline-none focus:border-yellow-500/50 text-white text-center tracking-[0.3em] font-bold text-sm sm:text-base"
                                                    />
                                                    <button 
                                                        onClick={() => handleVerifyDelivery(order.id)}
                                                        className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-yellow-950 px-6 py-2.5 sm:py-3 rounded-b-xl sm:rounded-b-none sm:rounded-r-xl font-black transition-colors text-sm sm:text-base active:bg-yellow-600"
                                                    >
                                                        VERIFY
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </FadeInScroll>
                            );
                        })
                    )}
                </div>

                {reviewModal && (
                    <ReviewModal
                        productId={reviewModal.productId}
                        orderId={reviewModal.orderId}
                        onSave={() => {
                            setReviewedIds([...reviewedIds, reviewModal.orderId]);
                            setReviewModal(null);
                        }}
                        onClose={() => setReviewModal(null)}
                    />
                )}
            </div>
        </div>
    );
}