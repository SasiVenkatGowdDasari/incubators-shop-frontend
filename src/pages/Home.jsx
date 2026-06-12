import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

// ========================================================
// ADVANCED SCROLL ANIMATION WRAPPER
// ========================================================
const FadeInScroll = ({ children, delay = 0, direction = 'up', className = '' }) => {
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
            } ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

export default function Home() {
    const [products, setProducts] = useState([]);
    const [reviews, setReviews] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHomeData = async () => {
            setLoading(true);
            
            try {
                // 1. Fetch Products
                const productsRes = await api.get('/products');
                const allProducts = productsRes.data || [];
                const activeProducts = allProducts.filter(p => p.active !== false);
                
                // Fetch up to 8 recent products to display
                const recentProducts = [...activeProducts].reverse().slice(0, 8);
                setProducts(recentProducts);

                // 2. Fetch Reviews dynamically for products
                const productsToFetchReviewsFor = [...allProducts].reverse().slice(0, 20);
                
                const reviewsPromises = productsToFetchReviewsFor.map(p => 
                    api.get(`/reviews/product/${p.id}`).catch(() => ({ data: [] }))
                );

                const reviewsResponses = await Promise.all(reviewsPromises);
                
                let allFetchedReviews = [];

                // 3. Extract ALL reviews from the responses
                reviewsResponses.forEach((res) => {
                    const productReviews = res.data;
                    
                    if (productReviews && productReviews.length > 0) {
                        productReviews.forEach(review => {
                            allFetchedReviews.push({
                                id: review.id,
                                name: review.user?.fullName || "Anonymous",
                                stars: review.rating || 5,
                                text: review.comment || "No comment provided."
                            });
                        });
                    }
                });

                // 4. Shuffle ALL reviews randomly
                const shuffledReviews = allFetchedReviews.sort(() => 0.5 - Math.random());
                setReviews(shuffledReviews);

            } catch (err) {
                console.error("Home Data Fetch Error:", err);
                setError('Failed to load products. Is the server running?');
            }

            setLoading(false);
        };

        fetchHomeData();
    }, []);

    // --- MARQUEE LOGIC ---
    const minItemsNeeded = 12;
    const multiplier = reviews.length > 0 ? Math.ceil(minItemsNeeded / reviews.length) : 0;
    const baseRepeatedReviews = Array(multiplier).fill(reviews).flat();
    const marqueeReviews = [...baseRepeatedReviews, ...baseRepeatedReviews];

    return (
        <div className="bg-[#0B1120] pt-4 sm:pt-6 pb-12 sm:pb-20 overflow-hidden relative">
            
            {/* Custom CSS for Marquee Animation */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(calc(-50% - 0.625rem)); }
                }
                .animate-scroll {
                    animation: scroll 35s linear infinite;
                }
            `}} />

            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-125 h-125 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-125 h-125 bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                {/* ================= HERO SECTION ================= */}
                <FadeInScroll delay={0}>
                    <div className="relative overflow-hidden mb-12 sm:mb-20 rounded-3xl sm:rounded-4xl bg-[#111827] border border-gray-800 shadow-2xl group cursor-default">
                        <div className="absolute inset-0 bg-linear-to-r from-blue-900/30 via-indigo-900/30 to-blue-900/30 opacity-50 group-hover:opacity-80 transition-opacity duration-1000"></div>
                        <div className="absolute -inset-full bg-linear-to-r from-transparent via-white/5 to-transparent rotate-45 translate-x-full group-hover:translate-x-full transition-transform duration-1500 ease-in-out pointer-events-none"></div>
                        
                        <div className="relative p-8 py-16 sm:p-12 md:p-24 text-center flex flex-col items-center justify-center">
                            <span className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-4 sm:mb-6 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse">
                                🌟 Next-Gen Hatching Technology
                            </span>
                            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-linear-to-br from-white via-blue-200 to-indigo-400 tracking-tight mb-4 sm:mb-6 drop-shadow-2xl">
                                Venkat Incubators
                            </h1>
                            <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-lg md:text-xl leading-relaxed font-medium px-2 sm:px-0">
                                Discover our premium catalog designed for maximum efficiency, pinpoint precision, and unmatched durability.
                            </p>
                        </div>
                    </div>
                </FadeInScroll>

                {/* ================= RECENT PRODUCTS SECTION ================= */}
                <FadeInScroll delay={100}>
                    <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2 sm:gap-3">
                            <span className="w-1.5 sm:w-2 h-6 sm:h-8 bg-blue-500 rounded-full inline-block shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                            New Incubators
                        </h2>
                        <div className="h-px bg-linear-to-r from-gray-800 to-transparent grow"></div>
                    </div>
                </FadeInScroll>

                {loading ? (
                    // Horizontal skeleton on mobile, vertical on SM+
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 xl:gap-8 mb-16 sm:mb-24">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className={`animate-pulse bg-[#111827] rounded-2xl h-35 sm:h-95 border border-gray-800 ${i > 4 ? 'hidden sm:block' : ''}`}></div>
                        ))}
                    </div>
                ) : error ? (
                    <FadeInScroll delay={100}>
                        <div className="p-8 sm:p-12 text-center bg-red-500/10 border border-red-500/20 rounded-2xl sm:rounded-3xl shadow-[0_0_30px_rgba(239,68,68,0.1)] mb-16 sm:mb-24">
                            <span className="text-4xl sm:text-5xl mb-3 sm:mb-4 block">⚠️</span>
                            <h3 className="text-xl sm:text-2xl font-bold text-red-400 mb-2">Connection Error</h3>
                            <p className="text-xs sm:text-base text-gray-400">{error}</p>
                        </div>
                    </FadeInScroll>
                ) : products.length === 0 ? (
                    <FadeInScroll delay={100}>
                        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 bg-[#111827] rounded-2xl sm:rounded-3xl border border-gray-800 shadow-inner text-center mb-16 sm:mb-24">
                            <span className="text-5xl sm:text-6xl mb-4">🪹</span>
                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Inventory Restocking</h3>
                            <p className="text-xs sm:text-base text-gray-400 max-w-md">Our premium catalog is currently being updated.</p>
                        </div>
                    </FadeInScroll>
                ) : (
                    // Grid-cols-1 forces the horizontal card layout on mobile
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 xl:gap-8 mb-20 sm:mb-32">
                        {products.map((product, index) => (
                            <FadeInScroll 
                                key={product.id} 
                                delay={index * 100} 
                                // Hides items 5-8 strictly on mobile views, shows them on tablets and up!
                                className={index >= 4 ? 'hidden sm:block' : 'block'}
                            >
                                <div className="h-full transform transition-all duration-500 sm:hover:-translate-y-3 sm:hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.35)] active:scale-95 group">
                                    <div className="absolute -inset-0.5 bg-linear-to-b from-blue-500 to-indigo-600 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500 z-0 hidden sm:block"></div>
                                    <div className="relative z-10 h-full">
                                        <ProductCard product={product} />
                                    </div>
                                </div>
                            </FadeInScroll>
                        ))}
                    </div>
                )}

                {/* ================= CUSTOMER REVIEWS SECTION ================= */}
                {!loading && reviews.length > 0 && (
                    <FadeInScroll delay={200}>
                        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2 sm:gap-3">
                                <span className="w-1.5 sm:w-2 h-6 sm:h-8 bg-indigo-500 rounded-full inline-block shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
                                Our Customer Reviews
                            </h2>
                            <div className="h-px bg-linear-to-r from-gray-800 to-transparent grow"></div>
                        </div>

                        <div className="relative w-full overflow-hidden rounded-2xl bg-linear-to-r from-[#0B1120] via-transparent to-[#0B1120] before:absolute before:left-0 before:w-8 sm:before:w-16 before:h-full before:bg-linear-to-r before:from-[#0B1120] before:to-transparent before:z-10 after:absolute after:right-0 after:w-8 sm:after:w-16 after:h-full after:bg-linear-to-l after:from-[#0B1120] after:to-transparent after:z-10 py-2 sm:py-4 cursor-default select-none">
                            
                            <div className="flex w-max animate-scroll hover:[animation-play-state:paused] gap-4 sm:gap-5">
                                {marqueeReviews.map((review, idx) => (
                                    <div 
                                        key={`${review.id}-${idx}`} 
                                        className="w-56 sm:w-72 shrink-0 bg-[#111827] border border-gray-800 p-4 sm:p-5 rounded-2xl shadow-xl transition-all duration-300 hover:border-blue-500/50 hover:bg-gray-800/50 group"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden pr-2">
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-linear-to-br from-indigo-600 to-blue-800 flex shrink-0 items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg ring-2 ring-indigo-500/20 group-hover:ring-blue-500/50 transition duration-300">
                                                    {review.name.charAt(0).toUpperCase()}
                                                </div>
                                                <h3 className="text-white font-bold tracking-wide text-xs sm:text-sm truncate">{review.name}</h3>
                                            </div>
                                            <div className="flex gap-0.5 text-[10px] sm:text-xs tracking-widest drop-shadow-md shrink-0">
                                                <span className="text-yellow-400">{'★'.repeat(review.stars)}</span>
                                                <span className="text-gray-700">{'☆'.repeat(5 - review.stars)}</span>
                                            </div>
                                        </div>
                                        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed italic line-clamp-3">
                                            "{review.text}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FadeInScroll>
                )}

            </div>
        </div>
    );
}