import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Helper to fix the Double URL bug and dynamically route Cloudinary vs Local images
const getMediaUrl = (urlStr) => {
    if (!urlStr) return '';
    const firstUrl = urlStr.split(',')[0].trim();
    if (firstUrl.startsWith('http')) return firstUrl;
    
    // Ensure no double slashes if it's a local file path
    const cleanPath = firstUrl.startsWith('/') ? firstUrl : `/uploads/${firstUrl}`.replace('/uploads/uploads/', '/uploads/');
    return `${BACKEND_URL}${cleanPath}`;
};

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
            className={`transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform ${isVisible ? 'opacity-100 translate-y-0 translate-x-0 scale-100' : `opacity-0 scale-95 ${directionClasses[direction]}`
                }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

// ========================================================
// INDIVIDUAL REVIEW CARD COMPONENT
// ========================================================
const ReviewCard = ({ review, onOpenModal }) => {
    return (
        <div
            onClick={() => onOpenModal(review, 0)}
            className="bg-[#111827]/80 backdrop-blur-md border border-gray-800 rounded-2xl p-5 sm:p-6 hover:border-blue-500/50 transition-all duration-500 group flex flex-col h-full cursor-pointer shadow-xl hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.3)] hover:-translate-y-2"
        >
            <div className="flex justify-between items-start mb-4 sm:mb-5">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-linear-to-br from-blue-600 to-indigo-900 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg ring-2 ring-blue-500/30 group-hover:ring-blue-400 transition-all">
                        {review.user.charAt(0)}
                    </div>
                    <div>
                        <p className="text-white font-bold tracking-wide text-sm sm:text-base">{review.user}</p>
                        {review.date && (
                            <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold mt-0.5 tracking-wider">
                                {new Date(review.date).toLocaleDateString('en-IN', {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                })}
                            </p>
                        )}
                    </div>
                </div>
                <span className="text-yellow-400 text-xs sm:text-sm tracking-widest drop-shadow-md">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </span>
            </div>

            <p className="text-gray-300 text-xs sm:text-sm line-clamp-3 mb-5 grow italic leading-relaxed">"{review.text}"</p>

            {review.media && review.media.length > 0 && (
                <div className="relative h-40 sm:h-48 w-full mt-auto rounded-xl overflow-hidden bg-[#0B1120] flex items-center justify-center border border-gray-700/50 group-hover:border-blue-500/30 transition-all duration-500">
                    {review.media[0].type === 'image' ? (
                        <img src={review.media[0].url} className="h-full w-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110" alt="Review media" />
                    ) : (
                        <video src={review.media[0].url} className="h-full w-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110" />
                    )}

                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all duration-500">
                        <span className="opacity-0 group-hover:opacity-100 bg-blue-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-500 transform translate-y-4 group-hover:translate-y-0 border border-blue-400/30">
                            View Gallery ({review.media.length})
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart, cart } = useContext(CartContext);
    const { user } = useContext(AuthContext);

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mediaList, setMediaList] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // 🚨 NEW: Loading state for Add to Cart
    const [isAdding, setIsAdding] = useState(false);

    // Review Modal States
    const [selectedReview, setSelectedReview] = useState(null);
    const [modalMediaIndex, setModalMediaIndex] = useState(0);
    const [reviews, setReviews] = useState([]);

    useEffect(() => {
        const fetchProductAndReviews = async () => {
            try {
                const response = await api.get(`/products/${id}`);
                setProduct(response.data);

                const mList = [];
                if (response.data.imageUrl) {
                    response.data.imageUrl.split(',').forEach(url => mList.push({ type: 'image', url: getMediaUrl(url) }));
                }
                if (response.data.videoUrl) {
                    response.data.videoUrl.split(',').forEach(url => mList.push({ type: 'video', url: getMediaUrl(url) }));
                }
                setMediaList(mList);

                // Fetch Real Reviews
                const revRes = await api.get(`/reviews/product/${id}`);

                const formattedReviews = revRes.data.map(r => {
                    let parsedDate = r.createdAt || r.created_at || r.date || null;
                    if (Array.isArray(parsedDate)) {
                        parsedDate = new Date(parsedDate[0], parsedDate[1] - 1, parsedDate[2], parsedDate[3] || 0, parsedDate[4] || 0, parsedDate[5] || 0).toISOString();
                    }

                    return {
                        id: r.id,
                        user: r.user?.fullName || "Anonymous",
                        rating: r.rating,
                        text: r.comment,
                        date: parsedDate,
                        media: (r.reviewMedia || r.media || []).map(m => ({
                            type: m.fileType?.toLowerCase() || 'image',
                            url: getMediaUrl(m.filePath)
                        })),
                        audio: null
                    };
                });

                setReviews(formattedReviews);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchProductAndReviews();
    }, [id]);

    const nextMedia = () => setCurrentIndex((prev) => (prev + 1) % mediaList.length);
    const prevMedia = () => setCurrentIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);

    const nextModalMedia = (e) => { e.stopPropagation(); setModalMediaIndex((prev) => (prev + 1) % selectedReview.media.length); };
    const prevModalMedia = (e) => { e.stopPropagation(); setModalMediaIndex((prev) => (prev - 1 + selectedReview.media.length) % selectedReview.media.length); };

    if (loading) return (
        <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );

    if (!product) return (
        <div className="min-h-screen bg-[#0B1120] flex items-center justify-center flex-col gap-4">
            <span className="text-6xl">🔍</span>
            <div className="text-xl font-bold text-white">Product not found.</div>
            <Link to="/products" className="text-blue-400 hover:text-blue-300 transition">Return to Catalog</Link>
        </div>
    );

    // Strictly check if 'user' exists before evaluating cart status
    const isInCart = user ? cart.some(item => item.id === product.id) : false;
    const isOutOfStock = product.stockQuantity <= 0;
    const stockStatus = isOutOfStock ? 'OUT OF STOCK' : product.stockQuantity < 5 ? 'LIMITED STOCK' : 'IN STOCK';
    const badgeColor = isOutOfStock ? 'bg-red-500/10 text-red-400 border-red-500/20' : product.stockQuantity < 5 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20';

    const averageRating = reviews.length > 0
        ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
        : product.rating || "0.0";

    // 🚨 NEW: The async Add To Cart handler for the loading spinner
    const handleActionClick = async () => {
        if (!user) {
            sessionStorage.setItem('pendingCartItem', JSON.stringify(product));
            navigate('/login');
            return;
        }

        if (isInCart) {
            navigate('/cart');
        } else {
            setIsAdding(true);
            await addToCart(product);
            setIsAdding(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1120] pt-4 sm:pt-6 pb-16 sm:pb-20 relative overflow-hidden">

            <div className="absolute top-0 right-1/4 w-150 h-150 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="fixed bottom-0 left-1/4 w-150 h-150 bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                <FadeInScroll delay={0} direction="right">
                    <div className="flex justify-start mb-6 sm:mb-8">
                        <Link to="/products" className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#111827]/80 hover:bg-blue-600/20 text-gray-300 hover:text-blue-400 rounded-xl border border-gray-800 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-sm shadow-lg group w-fit">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            <span className="font-bold text-xs sm:text-sm tracking-wide">Back to Collection</span>
                        </Link>
                    </div>
                </FadeInScroll>

                {/* =========================================
                    MOBILE ONLY TITLE (Appears Above Media)
                ========================================= */}
                <div className="block lg:hidden w-full mb-4 pl-1">
                    <FadeInScroll delay={50} direction="right">
                        <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-white via-gray-200 to-gray-400 leading-snug drop-shadow-lg">
                            {product.title}
                        </h1>
                    </FadeInScroll>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 xl:gap-16 mb-12 sm:mb-16">

                    {/* MEDIA COLUMN */}
                    <div className="lg:w-1/2">
                        <FadeInScroll delay={100} direction="left">
                            <div className="bg-[#111827]/60 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-8 relative flex items-center justify-center h-60 sm:h-auto sm:aspect-4/3 border border-gray-800 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] overflow-hidden group">
                                <div className="absolute inset-0 bg-linear-to-tr from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                {mediaList.length > 0 ? (
                                    <>
                                        {mediaList[currentIndex].type === 'image' ? (
                                            <img 
                                                src={mediaList[currentIndex].url} 
                                                className="max-h-full max-w-full object-contain relative z-10 drop-shadow-2xl transition-transform duration-700 group-hover:scale-105" 
                                                onError={(e) => { 
                                                    e.target.style.display = 'none'; 
                                                    e.target.parentElement.innerHTML = '<div class="flex flex-col items-center z-10"><span class="text-5xl sm:text-6xl mb-4 opacity-50">📦</span><span class="text-gray-500 text-sm sm:text-base font-medium">Image Not Available</span></div>'; 
                                                }}
                                            />
                                        ) : (
                                            <video src={mediaList[currentIndex].url} controls className="max-h-full max-w-full relative z-10 rounded-lg shadow-2xl" />
                                        )}
                                        {mediaList.length > 1 && (
                                            <>
                                                <button onClick={prevMedia} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-blue-600 hover:border-blue-500 text-white rounded-full flex items-center justify-center transition-all duration-300 z-20 sm:opacity-0 group-hover:opacity-100 transform sm:-translate-x-4 group-hover:translate-x-0 shadow-xl">&#10094;</button>
                                                <button onClick={nextMedia} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-blue-600 hover:border-blue-500 text-white rounded-full flex items-center justify-center transition-all duration-300 z-20 sm:opacity-0 group-hover:opacity-100 transform sm:translate-x-4 group-hover:translate-x-0 shadow-xl">&#10095;</button>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center z-10">
                                        <span className="text-5xl sm:text-6xl mb-4 opacity-50">📦</span>
                                        <span className="text-gray-500 text-sm sm:text-base font-medium">No media available</span>
                                    </div>
                                )}
                            </div>

                            {mediaList.length > 1 && (
                                <div className="flex justify-center sm:justify-start gap-2 sm:gap-4 mt-4 sm:mt-6 overflow-x-auto pb-2 sm:pb-4 custom-scrollbar">
                                    {mediaList.map((media, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 shrink-0 rounded-xl sm:rounded-2xl cursor-pointer border-2 overflow-hidden bg-[#111827] flex items-center justify-center transition-all duration-300 ${currentIndex === idx ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-105' : 'border-gray-800 hover:border-gray-600 hover:scale-105'}`}
                                        >
                                            {media.type === 'image'
                                                ? <img src={media.url} className={`w-full h-full object-cover transition-opacity duration-300 ${currentIndex === idx ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`} onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-xl sm:text-2xl opacity-50">📦</span>'; }} />
                                                : <div className="flex flex-col items-center justify-center text-gray-500"><span className="text-lg sm:text-xl">▶</span><span className="text-[8px] sm:text-[10px] font-bold mt-1">VIDEO</span></div>
                                            }
                                        </div>
                                    ))}
                                </div>
                            )}
                        </FadeInScroll>
                    </div>

                    {/* DETAILS COLUMN */}
                    <div className="lg:w-1/2 flex flex-col">
                        <FadeInScroll delay={200} direction="right">
                            
                            {/* =========================================
                                DESKTOP ONLY: Badges, Title, Ratings
                            ========================================= */}
                            <div className="hidden lg:flex gap-3 mb-6">
                                <span className="px-4 py-1.5 text-[11px] font-extrabold bg-blue-900/30 text-blue-400 border border-blue-500/30 rounded-full uppercase tracking-widest shadow-inner">{product.material || "Category"}</span>
                                <span className={`px-4 py-1.5 text-[11px] font-extrabold border rounded-full uppercase tracking-widest shadow-inner ${badgeColor}`}>{stockStatus}</span>
                            </div>

                            <h1 className="hidden lg:block text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-linear-to-r from-white via-gray-200 to-gray-400 mb-4 leading-tight drop-shadow-lg">
                                {product.title}
                            </h1>

                            <div className="hidden lg:flex items-center gap-3 mb-8">
                                <div className="flex text-yellow-400 text-lg drop-shadow-md">
                                    {'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}
                                </div>
                                <span className="text-sm font-medium text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700/50">
                                    {averageRating}/5 <span className="text-gray-600 mx-1">•</span> {reviews.length || product.totalPurchases || 0} Reviews
                                </span>
                            </div>

                            <div className="hidden lg:flex flex-col items-start gap-2 p-6 bg-linear-to-r from-[#111827] to-transparent rounded-2xl border-l-4 border-blue-500 mb-10">
                                <div className="flex items-end gap-4">
                                    <span className="text-5xl font-black text-white drop-shadow-lg">₹{product.currentPrice}</span>
                                    {product.actualPrice > product.currentPrice && (
                                        <div className="flex flex-col mb-1">
                                            <span className="text-sm text-green-400 font-bold mb-0.5 tracking-wide">SAVE ₹{product.actualPrice - product.currentPrice}</span>
                                            <span className="text-xl text-gray-500 line-through decoration-red-500/50 decoration-2">₹{product.actualPrice}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-sm font-bold text-green-400 mt-2 flex items-center gap-2">
                                    <span>🚚</span> {product.shippingOptions || "FREE Delivery Available"}
                                </div>
                                <div className="text-sm font-bold text-blue-400 mt-1 flex items-center gap-2">
                                    <span>🛡️</span> {product.warranty || "1 Year Manufacturer Warranty"}
                                </div>
                            </div>

                            {/* =========================================
                                MOBILE ONLY: Badges, Ratings, Price Box
                            ========================================= */}
                            <div className="flex lg:hidden items-center flex-wrap gap-2 mb-4 w-full mt-2">
                                <span className="px-2.5 sm:px-3 py-1 text-[9px] sm:text-[10px] font-extrabold bg-blue-900/30 text-blue-400 border border-blue-500/30 rounded-full uppercase tracking-widest shadow-inner shrink-0">
                                    {product.material || "Category"}
                                </span>
                                <span className={`px-2.5 sm:px-3 py-1 text-[9px] sm:text-[10px] font-extrabold border rounded-full uppercase tracking-widest shadow-inner shrink-0 ${badgeColor}`}>
                                    {stockStatus}
                                </span>
                                <div className="flex items-center gap-1 ml-auto bg-gray-800/50 px-2.5 py-1 rounded-full border border-gray-700/50 shrink-0">
                                    <span className="text-yellow-400 text-[10px] sm:text-[11px] font-bold">{averageRating}</span>
                                    <span className="text-yellow-400 text-[9px] sm:text-[10px]">★</span>
                                    <span className="text-gray-400 text-[9px] sm:text-[10px] ml-0.5">({reviews.length || product.totalPurchases || 0})</span>
                                </div>
                            </div>

                            <div className="lg:hidden flex flex-row items-center justify-between p-4 sm:p-5 bg-linear-to-r from-[#111827] to-transparent rounded-xl sm:rounded-2xl border-l-4 border-blue-500 mb-6 gap-2">
                                <div className="flex flex-col items-start justify-center">
                                    <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg leading-none mb-1">₹{product.currentPrice}</span>
                                    {product.actualPrice > product.currentPrice && (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] sm:text-xs text-green-400 font-bold tracking-wide">SAVE ₹{product.actualPrice - product.currentPrice}</span>
                                            <span className="text-xs sm:text-sm text-gray-500 line-through decoration-red-500/50 decoration-2">₹{product.actualPrice}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="w-px h-10 bg-gray-700/50 mx-1"></div>

                                <div className="flex flex-col gap-2 items-start justify-center shrink-0">
                                    <div className="text-[9px] sm:text-[10px] font-bold text-green-400 flex items-center gap-1.5">
                                        <span className="text-sm">🚚</span> 
                                        <span className="leading-tight max-w-22.5 sm:max-w-none">{product.shippingOptions || "FREE Delivery"}</span>
                                    </div>
                                    <div className="text-[9px] sm:text-[10px] font-bold text-blue-400 flex items-center gap-1.5">
                                        <span className="text-sm">🛡️</span> 
                                        <span className="leading-tight max-w-22.5 sm:max-w-none">{product.warranty || "1 Year Warranty"}</span>
                                    </div>
                                </div>
                            </div>
                        </FadeInScroll>

                        <FadeInScroll delay={300} direction="up">
                            {/* =========================================
                                SHARED: Specs Grid & Buttons
                            ========================================= */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
                                <div className="border border-gray-800/80 bg-linear-to-br from-[#111827] to-[#0B1120] rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center shadow-lg hover:shadow-blue-500/10 hover:border-gray-700 transition-all duration-300">
                                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold mb-1 sm:mb-2 tracking-widest">Capacity</p>
                                    <p className="text-white font-extrabold text-sm sm:text-base">{product.capacity || "N/A"}</p>
                                </div>
                                <div className="border border-gray-800/80 bg-linear-to-br from-[#111827] to-[#0B1120] rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center shadow-lg hover:shadow-blue-500/10 hover:border-gray-700 transition-all duration-300">
                                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold mb-1 sm:mb-2 tracking-widest">Type</p>
                                    <p className="text-white font-extrabold text-sm sm:text-base">{product.type || "N/A"}</p>
                                </div>
                                <div className="border border-gray-800/80 bg-linear-to-br from-[#111827] to-[#0B1120] rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center shadow-lg hover:shadow-blue-500/10 hover:border-gray-700 transition-all duration-300 col-span-2 md:col-span-1">
                                    <p className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold mb-1 sm:mb-2 tracking-widest">Material</p>
                                    <p className="text-white font-extrabold text-sm sm:text-base">{product.material || "N/A"}</p>
                                </div>
                            </div>

                            <div className="mb-4 sm:mb-6">
                                {user && user.role === 'ADMIN' ? (
                                    <button
                                        onClick={() => navigate(`/admin?tab=inventory&edit=${product.id}`)}
                                        className="w-full py-4 sm:py-5 rounded-xl font-bold text-white text-base sm:text-lg bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] transform hover:-translate-y-1 flex items-center justify-center gap-2 sm:gap-3"
                                    >
                                        <span>✏️</span> Edit Product Specifications
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleActionClick}
                                        disabled={isAdding || (isOutOfStock && !isInCart)}
                                        className={`w-full py-4 sm:py-5 rounded-xl font-black text-white text-base sm:text-lg tracking-wide transition-all duration-300 transform flex items-center justify-center gap-2 sm:gap-3 ${
                                            isAdding || (isOutOfStock && !isInCart)
                                                ? 'bg-gray-800 cursor-not-allowed text-gray-500 border border-gray-700'
                                                : (isInCart
                                                    ? 'bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-[0_0_20px_rgba(22,163,74,0.4)] hover:shadow-[0_0_30px_rgba(22,163,74,0.6)] sm:hover:-translate-y-1 active:scale-95'
                                                    : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] sm:hover:-translate-y-1 active:scale-95')
                                        }`}
                                    >
                                        {isOutOfStock && !isInCart ? (
                                            'Currently Out of Stock'
                                        ) : isAdding ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Adding...
                                            </>
                                        ) : isInCart ? (
                                            <><span>✓</span> Proceed To Cart</>
                                        ) : (
                                            <><span>➕</span> Add To Cart</>
                                        )}
                                    </button>
                                )}
                            </div>
                        </FadeInScroll>
                    </div>
                </div>

                <FadeInScroll delay={400} direction="up">
                    <div className="w-full bg-[#111827]/60 backdrop-blur-xl p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl border border-gray-800/80 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] mt-6 sm:mt-8">
                        <div className="max-w-4xl mx-auto">
                            <h3 className="text-white font-extrabold mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4 tracking-wide text-xl sm:text-2xl md:text-3xl">
                                <span className="flex h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500/20 text-blue-400 items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.4)] text-sm sm:text-base">★</span>
                                Product Overview
                            </h3>
                            <div className="h-px w-full bg-linear-to-r from-gray-800 to-transparent mb-6 sm:mb-8"></div>
                            <p className="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed sm:leading-loose whitespace-pre-wrap font-medium">
                                {product.description || "Experience unmatched hatching performance with our premium build quality and advanced temperature controls. Designed to provide optimal conditions for the highest hatching success rates, this incubator ensures durability, reliability, and precision."}
                            </p>
                        </div>
                    </div>
                </FadeInScroll>

                <FadeInScroll delay={500}>
                    <div className="mt-20 sm:mt-32 pt-12 sm:pt-16 border-t border-gray-800/80 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 sm:w-1/3 h-px bg-linear-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

                        <div className="text-center mb-10 sm:mb-16">
                            <span className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase mb-3 sm:mb-4 inline-block">Real Feedback</span>
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">Customer <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400">Reviews</span></h2>
                        </div>

                        {reviews.length === 0 ? (
                            <div className="max-w-2xl mx-auto text-center p-8 sm:p-12 border border-gray-800 border-dashed rounded-2xl sm:rounded-3xl bg-[#111827]/30 backdrop-blur-sm">
                                <span className="text-4xl sm:text-5xl block mb-3 sm:mb-4">💬</span>
                                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No reviews yet</h3>
                                <p className="text-xs sm:text-sm text-gray-500">Be the first to share your experience with this incubator!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 items-stretch">
                                {reviews.map((review, idx) => (
                                    <FadeInScroll key={review.id} delay={idx * 100}>
                                        <ReviewCard
                                            review={review}
                                            onOpenModal={(rev, startingIdx) => {
                                                setSelectedReview(rev);
                                                setModalMediaIndex(startingIdx);
                                            }}
                                        />
                                    </FadeInScroll>
                                ))}
                            </div>
                        )}
                    </div>
                </FadeInScroll>
            </div>

            {/* REVIEW MODAL */}
            {selectedReview && (
                <div
                    className="fixed inset-0 z-100 bg-black/90 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4 md:p-8 transition-opacity duration-300"
                    onClick={() => setSelectedReview(null)}
                >
                    <div
                        className="bg-[#0B1120] sm:border sm:border-gray-700/50 sm:rounded-3xl w-full h-full sm:h-[85vh] max-w-6xl sm:max-h-225 flex flex-col md:flex-row overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.8)] transform transition-transform duration-500"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedReview(null)}
                            className="absolute top-4 right-4 w-10 h-10 sm:w-12 sm:h-12 bg-black/60 hover:bg-red-500 text-white rounded-full z-50 flex items-center justify-center text-xl sm:text-2xl transition-all duration-300 backdrop-blur-md border border-white/10 shadow-2xl"
                        >
                            &times;
                        </button>

                        <div className="w-full md:w-3/5 h-[45vh] md:h-full bg-black relative flex items-center justify-center group overflow-hidden shrink-0">
                            {selectedReview.media.length > 0 ? (
                                <>
                                    {selectedReview.media[modalMediaIndex].type === 'image' && (
                                        <div
                                            className="absolute inset-0 opacity-20 blur-2xl scale-110 bg-cover bg-center"
                                            style={{ backgroundImage: `url(${selectedReview.media[modalMediaIndex].url})` }}
                                        ></div>
                                    )}

                                    {selectedReview.media[modalMediaIndex].type === 'image' ? (
                                        <img src={selectedReview.media[modalMediaIndex].url} className="max-h-full max-w-full object-contain p-2 relative z-10 drop-shadow-2xl transition-opacity duration-500" alt="User review upload" onError={(e) => { e.target.style.display = 'none'; }} />
                                    ) : (
                                        <video src={selectedReview.media[modalMediaIndex].url} controls autoPlay className="max-h-full max-w-full p-2 relative z-10" />
                                    )}

                                    {selectedReview.media.length > 1 && (
                                        <>
                                            <button onClick={prevModalMedia} className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 bg-black/50 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-blue-600 hover:border-blue-400 transition-all duration-300 text-lg sm:text-xl z-20 shadow-2xl">&#10094;</button>
                                            <button onClick={nextModalMedia} className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-14 sm:h-14 bg-black/50 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-blue-600 hover:border-blue-400 transition-all duration-300 text-lg sm:text-xl z-20 shadow-2xl">&#10095;</button>

                                            <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-white text-[10px] sm:text-xs font-extrabold tracking-widest uppercase z-20 border border-white/20 shadow-xl">
                                                {modalMediaIndex + 1} / {selectedReview.media.length}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="text-gray-600 text-lg sm:text-xl font-medium flex flex-col items-center gap-3 sm:gap-4 relative z-10">
                                    <span className="text-5xl sm:text-6xl drop-shadow-lg">📷</span>
                                    No media attached
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-2/5 p-6 sm:p-8 md:p-12 flex flex-col bg-[#111827] border-t md:border-t-0 md:border-l border-gray-800 flex-1 overflow-y-auto custom-scrollbar relative">
                            <div className="sticky top-0 left-0 right-0 h-4 bg-linear-to-b from-[#111827] to-transparent z-10 pointer-events-none -mt-6 sm:-mt-8 md:-mt-12 mb-4 sm:mb-8"></div>

                            <div className="flex items-center gap-4 sm:gap-5 mb-6 sm:mb-10 pb-6 sm:pb-8 border-b border-gray-800/80">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-[0_0_20px_rgba(59,130,246,0.3)] shrink-0 transform -rotate-3">
                                    <div className="transform rotate-3">{selectedReview.user.charAt(0)}</div>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-white font-extrabold text-xl sm:text-2xl tracking-tight mb-1">{selectedReview.user}</p>
                                    <div className="flex items-center flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-2">
                                        <span className="text-yellow-400 text-xs sm:text-sm tracking-widest drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                                            {'★'.repeat(selectedReview.rating)}{'☆'.repeat(5 - selectedReview.rating)}
                                        </span>

                                        {selectedReview.date && (
                                            <span className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-gray-800/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded border border-gray-700">
                                                {new Date(selectedReview.date).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none pb-8">
                                <p className="text-gray-300 leading-relaxed sm:leading-loose text-sm sm:text-lg whitespace-pre-wrap font-medium relative z-0">
                                    <span className="text-4xl sm:text-5xl text-blue-500/20 absolute -top-3 sm:-top-4 -left-3 sm:-left-4 font-serif z-[-1]">"</span>
                                    {selectedReview.text}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}