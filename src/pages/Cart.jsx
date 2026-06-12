import { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { ToastContext } from '../context/ToastContext';

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

export default function Cart() {
    const { cart, updateQuantity, removeFromCart, clearCart } = useContext(CartContext);
    const { user } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);
    const navigate = useNavigate();
    
    // CheckOut UI States
    const [checkoutState, setCheckoutState] = useState('idle');
    const [removingId, setRemovingId] = useState(null);
    
    // Real-time validation states
    const [activeProductIds, setActiveProductIds] = useState([]);
    const [isValidating, setIsValidating] = useState(true);

    // Dynamic Admin Contact State (with fallbacks)
    const [adminContact, setAdminContact] = useState({ name: 'Venkat', phone: '95022 55923' });

    useEffect(() => {
        const validateCartItems = async () => {
            try {
                const res = await api.get('/products');
                const visibleIds = res.data
                    .filter(p => p.active !== false) 
                    .map(p => p.id);
                
                setActiveProductIds(visibleIds);
            } catch (err) {
                console.error("Failed to validate cart items", err);
            } finally {
                setIsValidating(false);
            }
        };

        const fetchAdminInfo = async () => {
            try {
                const res = await api.get('/profile/admin-contact');
                if (res.data) {
                    setAdminContact({
                        name: res.data.fullName.split(' ')[0], 
                        phone: res.data.mobileNumber
                    });
                }
            } catch (err) {
                console.warn("Could not fetch admin info, using default.");
                console.log(err)
            }
        };

        validateCartItems();
        fetchAdminInfo();
    }, []);

    const isItemAvailable = (item) => {
        if (isValidating) return true; 
        return activeProductIds.includes(item.id);
    };

    const hasUnavailableItems = cart.some(item => !isItemAvailable(item));
    const activeCartItems = cart.filter(item => isItemAvailable(item));

    const calculateTotal = () => {
        return cart.reduce((total, item) => {
            if (!isItemAvailable(item)) return total; 
            return total + ((item.currentPrice || item.actualPrice) * item.cartQuantity);
        }, 0);
    };

    const handleRemoveItem = async (itemId) => {
        setRemovingId(itemId);
        setTimeout(() => {
            removeFromCart(itemId);
            setRemovingId(null);
        }, 400); 
    };

    const handleCheckout = async () => {
        if (hasUnavailableItems) {
            showToast("Please remove unavailable items from your cart to proceed.", "error");
            return;
        }

        if (activeCartItems.length === 0) {
            showToast("Your cart is empty.", "error");
            return;
        }

        setCheckoutState('processing');

        try {
            const orderPayload = {
                userId: user.id,
                totalAmount: calculateTotal(),
                items: activeCartItems.map(item => ({
                    productId: item.id,
                    quantity: item.cartQuantity,
                    price: item.currentPrice || item.actualPrice
                }))
            };

            await api.post('/orders', orderPayload);

            clearCart();
            setCheckoutState('success');

        } catch (err) {
            showToast('Checkout failed. Please ensure the backend is running and stock is available.', 'error');
            console.error(err);
            setCheckoutState('idle'); 
        }
    };

    // Improved Helper to fix Double URL bugs
    const getImageUrl = (urlStr) => {
        if (!urlStr) return null;
        const firstUrl = urlStr.split(',')[0].trim();
        if (firstUrl.startsWith('http')) return firstUrl;
        const cleanPath = firstUrl.startsWith('/') ? firstUrl : `/uploads/${firstUrl}`.replace('/uploads/uploads/', '/uploads/');
        return `${BACKEND_URL}${cleanPath}`;
    };

    if (cart.length === 0 && checkoutState === 'idle') {
        return (
            <div className="min-h-screen bg-[#0B1120] pt-4 sm:pt-6 pb-20 relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 right-1/4 w-150 h-150 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
                
                <FadeInScroll delay={0}>
                    <div className="max-w-xl mx-auto px-4 text-center mt-10">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#111827] rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-gray-800 shadow-[0_0_30px_rgba(59,130,246,0.15)] relative">
                            <span className="text-5xl sm:text-6xl absolute -ml-1 sm:-ml-2">🛒</span>
                            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-sm sm:text-base font-bold border-4 border-[#0B1120] shadow-lg">0</div>
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-linear-to-r from-white to-gray-400 mb-4 sm:mb-6 drop-shadow-lg">Your Cart is Empty</h2>
                        <p className="text-gray-400 text-sm sm:text-lg mb-8 sm:mb-10 font-medium">Looks like you haven't added any premium incubators to your cart yet.</p>
                        <Link 
                            to="/products" 
                            className="inline-flex items-center gap-2 sm:gap-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:-translate-y-1 transition-all duration-300 transform"
                        >
                            <span>🛍️</span> Browse Collection
                        </Link>
                    </div>
                </FadeInScroll>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B1120] pt-4 sm:pt-6 pb-20 relative overflow-hidden">
            <div className="absolute top-0 right-1/4 w-150 h-150 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="fixed bottom-0 left-1/4 w-150 h-150 bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                <FadeInScroll delay={0} direction="right">
                    <div className="flex justify-start mb-6 sm:mb-8 relative z-20">
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

                <FadeInScroll delay={100}>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6 sm:mb-10 tracking-tight flex items-center gap-3 sm:gap-4">
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400">Shopping Cart</span>
                        <span className="bg-gray-800 border border-gray-700 text-gray-300 text-sm sm:text-lg px-3 sm:px-4 py-1 rounded-full shadow-inner">{cart.length} Item{cart.length > 1 ? 's' : ''}</span>
                    </h1>
                </FadeInScroll>

                <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 xl:gap-12">
                    <div className="w-full lg:w-2/3 space-y-4 sm:space-y-6">
                        {cart.map((item, index) => {
                            const available = isItemAvailable(item); 
                            
                            return (
                                <FadeInScroll key={item.id} delay={150 + (index * 50)}>
                                    <div className={`bg-[#111827]/60 backdrop-blur-md border rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] flex flex-col md:flex-row gap-4 sm:gap-6 group transition-all duration-300 ${!available ? 'border-red-900/50 opacity-70 grayscale-50' : 'border-gray-800 hover:border-gray-700'}`}>
                                        
                                        {/* HORIZONTAL MOBILE LAYOUT: Top section holding image and details */}
                                        <div className="flex flex-row gap-3 sm:gap-6 w-full">
                                            {/* Image Box */}
                                            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#0B1120] rounded-xl sm:rounded-2xl shrink-0 flex items-center justify-center overflow-hidden border border-gray-800 shadow-inner sm:group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-shadow relative">
                                                {item.imageUrl ? (
                                                    <img src={getImageUrl(item.imageUrl)} alt="Product" className={`w-full h-full object-contain transition-all duration-500 ${available ? 'opacity-80 sm:group-hover:opacity-100 sm:group-hover:scale-110' : 'opacity-40'}`} />
                                                ) : (
                                                    <span className="text-2xl sm:text-4xl opacity-50">📦</span>
                                                )}
                                            </div>
                                            
                                            {/* Title & Price */}
                                            <div className="flex flex-col grow justify-center">
                                                <div className="flex justify-start gap-2 mb-1 sm:mb-2">
                                                    <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold bg-blue-900/30 text-blue-400 border border-blue-500/30 rounded uppercase tracking-widest">{item.material || "Category"}</span>
                                                    
                                                    {!available && !isValidating && (
                                                        <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold bg-red-900/40 text-red-400 border border-red-500/50 rounded uppercase tracking-widest animate-pulse">Unavailable</span>
                                                    )}
                                                </div>
                                                
                                                <Link to={available ? `/product/${item.id}` : '#'} className={`font-extrabold text-sm sm:text-xl line-clamp-2 mb-1.5 sm:mb-2 ${!available ? 'text-gray-500 cursor-not-allowed pointer-events-none' : 'text-white hover:text-blue-400 transition-colors'}`}>
                                                    {item.title}
                                                </Link>
                                                
                                                {available ? (
                                                    <p className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400 drop-shadow-md">
                                                        ₹{item.currentPrice || item.actualPrice}
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] sm:text-sm font-bold text-red-400 mt-1">Discontinued. Please remove.</p>
                                                )}
                                            </div>

                                            {/* DESKTOP ONLY: Side Controls */}
                                            <div className="hidden md:flex flex-col items-center justify-center w-auto gap-4 border-l border-gray-800 pl-6 shrink-0">
                                                {available && (
                                                    <div className="flex items-center bg-[#0B1120] rounded-full border border-gray-700 shadow-inner p-1">
                                                        <button 
                                                            onClick={() => updateQuantity(item.id, -1)}
                                                            disabled={checkoutState !== 'idle' || removingId === item.id}
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                                                        </button>
                                                        <span className="w-10 text-center font-bold text-white text-lg">{item.cartQuantity}</span>
                                                        <button 
                                                            onClick={() => updateQuantity(item.id, 1)}
                                                            disabled={checkoutState !== 'idle' || removingId === item.id}
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                <button 
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    disabled={checkoutState !== 'idle' || removingId === item.id}
                                                    className={`flex items-center justify-center gap-2 font-bold text-sm px-4 py-2 rounded-xl transition-colors min-w-25 disabled:opacity-50 disabled:cursor-not-allowed ${!available ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'text-red-500/80 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20'}`}
                                                >
                                                    {removingId === item.id ? (
                                                        <>
                                                            <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                            Removing
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                            Remove
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* MOBILE ONLY: Bottom Controls Row */}
                                        <div className="flex md:hidden items-center justify-between w-full border-t border-gray-800 pt-3">
                                            {available && (
                                                <div className="flex items-center bg-[#0B1120] rounded-full border border-gray-700 shadow-inner p-0.5">
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                        disabled={checkoutState !== 'idle' || removingId === item.id}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 transition-colors disabled:opacity-50"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path></svg>
                                                    </button>
                                                    <span className="w-8 text-center font-bold text-white text-sm">{item.cartQuantity}</span>
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        disabled={checkoutState !== 'idle' || removingId === item.id}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 transition-colors disabled:opacity-50"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <button 
                                                onClick={() => handleRemoveItem(item.id)}
                                                disabled={checkoutState !== 'idle' || removingId === item.id}
                                                className={`flex items-center justify-center gap-1.5 font-bold text-[10px] px-3 py-2 rounded-lg transition-colors min-w-20 disabled:opacity-50 disabled:cursor-not-allowed ${!available ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)] w-full' : 'text-red-400 bg-red-500/10 active:bg-red-500/20'}`}
                                            >
                                                {removingId === item.id ? (
                                                    <svg className="animate-spin h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                ) : (
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                )}
                                                {removingId === item.id ? 'Removing' : 'Remove'}
                                            </button>
                                        </div>

                                    </div>
                                </FadeInScroll>
                            );
                        })}
                    </div>

                    <div className="w-full lg:w-1/3">
                        <FadeInScroll delay={200} direction="up">
                            <div className="top-28 bg-[#111827]/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] border border-gray-800 p-5 sm:p-8 overflow-hidden relative">
                                <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none"></div>

                                <h2 className="text-xl sm:text-2xl font-black text-white mb-5 sm:mb-6 flex items-center gap-2 sm:gap-3">
                                    <span>🧾</span> Order Summary
                                </h2>
                                
                                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 text-gray-400 text-sm sm:text-base font-medium">
                                    <div className="flex justify-between items-center">
                                        <span>Subtotal ({activeCartItems.length} items)</span>
                                        <span className="text-white">₹{calculateTotal()}</span>
                                    </div>
                                    
                                    {hasUnavailableItems && !isValidating && (
                                        <div className="text-[10px] sm:text-xs text-red-400 italic bg-red-900/20 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-red-900/50 mt-2">
                                            * Unavailable items have been automatically removed from your total calculation.
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center">
                                        <span>Shipping & Handling</span>
                                        <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold border border-green-500/20 uppercase tracking-wider">Free</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Taxes</span>
                                        <span className="text-white text-xs sm:text-base">Calculated at checkout</span>
                                    </div>
                                    
                                    <div className="h-px bg-gray-800 my-4 sm:my-6"></div>

                                    <div className="flex justify-between items-end">
                                        <span className="text-base sm:text-lg">Total Amount</span>
                                        <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">₹{calculateTotal()}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleCheckout}
                                    disabled={checkoutState !== 'idle' || hasUnavailableItems || isValidating || removingId !== null}
                                    className={`w-full py-3.5 sm:py-4 rounded-xl font-black text-white text-base sm:text-lg tracking-wide transition-all duration-300 transform flex justify-center items-center gap-2 sm:gap-3 ${
                                        checkoutState === 'processing' || isValidating
                                            ? 'bg-gray-700 cursor-not-allowed opacity-70' 
                                            : hasUnavailableItems || removingId !== null
                                                ? 'bg-red-900/50 border border-red-500/50 text-red-400 cursor-not-allowed'
                                                : 'bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-[0_0_20px_rgba(22,163,74,0.4)] sm:hover:shadow-[0_0_30px_rgba(22,163,74,0.6)] active:scale-95 sm:hover:-translate-y-1'
                                    }`}
                                >
                                    {checkoutState === 'processing' ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </>
                                    ) : hasUnavailableItems ? (
                                        <><span>⚠️</span> Remove Unavailable</>
                                    ) : (
                                        <><span>💳</span> Proceed to Checkout</>
                                    )}
                                </button>
                                
                                <p className="text-center text-gray-500 text-[10px] sm:text-xs mt-4 sm:mt-6 flex items-center justify-center gap-1.5 sm:gap-2">
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    Secure & Encrypted Checkout
                                </p>
                            </div>
                        </FadeInScroll>
                    </div>

                </div>
            </div>

            {/* ========================================================
                SUCCESS POPUP OVERLAY
            ======================================================== */}
            {checkoutState === 'success' && (
                <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#111827] border border-gray-800 p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] max-w-sm w-full text-center transform transition-all flex flex-col items-center relative overflow-hidden">
                        
                        <div className="absolute top-0 w-full h-32 bg-green-500/10 blur-[50px] pointer-events-none"></div>

                        <div className="h-20 w-20 sm:h-24 sm:w-24 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-5 sm:mb-6 shadow-[0_0_30px_rgba(34,197,94,0.6)] animate-[bounce_1s_ease-in-out] relative z-10">
                            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        
                        <h3 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-3 relative z-10 leading-tight">Order Placed!</h3>
                        <p className="text-gray-300 text-sm sm:text-base font-medium mb-5 sm:mb-6 relative z-10 leading-relaxed">
                            Our admin, <strong className="text-white">{adminContact.name}</strong>, will contact you shortly to confirm delivery.
                        </p>
                        
                        {/* ADMIN CONTACT BOX */}
                        <div className="bg-[#0B1120] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-800 w-full mb-6 sm:mb-8 relative z-10 shadow-inner">
                            <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5 sm:mb-2">Need help immediately?</p>
                            <div className="flex items-center justify-center gap-2 sm:gap-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm sm:text-lg shadow-[0_0_10px_rgba(59,130,246,0.3)]">📞</div>
                                <p className="text-white font-extrabold tracking-wide text-base sm:text-lg">+91 {adminContact.phone}</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => { 
                                setCheckoutState('idle'); 
                                navigate('/my-orders'); 
                            }} 
                            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3.5 sm:py-4 rounded-xl text-sm sm:text-base transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 sm:hover:-translate-y-0.5 relative z-10"
                        >
                            View My Orders
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}