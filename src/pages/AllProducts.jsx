import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

// ========================================================
// REUSABLE ADVANCED SCROLL ANIMATION WRAPPER
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

export default function AllProducts() {
    const [groupedProducts, setGroupedProducts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAllProducts = async () => {
            try {
                const response = await api.get('/products');
                const products = response.data || [];
                const activeProducts = products.filter(p => p.active !== false);
                
                // --- GROUPING LOGIC ---
                const grouped = activeProducts.reduce((acc, product) => {
                    const category = product.material ? product.material.trim() : 'Other';
                    if (!acc[category]) {
                        acc[category] = [];
                    }
                    acc[category].push(product);
                    return acc;
                }, {});

                setGroupedProducts(grouped);
                setLoading(false);
            } catch (err) {
                console.error("Products Fetch Error:", err);
                setError('Failed to load products. Is the server running?');
                setLoading(false);
            }
        };

        fetchAllProducts();
    }, []);

    return (
        <div className="min-h-screen bg-[#0B1120] pt-4 sm:pt-6 pb-12 sm:pb-20 relative overflow-hidden">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-1/4 w-150 h-150 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="fixed bottom-0 left-1/4 w-150 h-150 bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                {/* --- TOP NAVIGATION / BACK BUTTON --- */}
                <FadeInScroll delay={0} direction="right">
                    <div className="flex justify-start mb-4 sm:mb-6 relative z-20">
                        <Link 
                            to="/" 
                            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gray-800/40 hover:bg-blue-600/20 text-gray-300 hover:text-blue-400 rounded-xl border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-sm shadow-lg group w-fit"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            <span className="font-bold text-xs sm:text-sm tracking-wide">Back to Home</span>
                        </Link>
                    </div>
                </FadeInScroll>

                {/* --- PAGE HEADER --- */}
                <FadeInScroll delay={100}>
                    <div className="text-center mb-10 sm:mb-20 mt-4 sm:mt-0">
                        <span className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-4 sm:mb-6 inline-block shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse">
                            Our Complete Collection
                        </span>
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-linear-to-r from-white via-blue-200 to-indigo-400 tracking-tight mb-3 sm:mb-6 drop-shadow-2xl px-2">
                            Incubator Catalog
                        </h1>
                        <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-lg leading-relaxed font-medium px-2 sm:px-0">
                            Browse our extensive range of high-efficiency incubators, categorized by material to help you find the perfect match for your hatching needs.
                        </p>
                    </div>
                </FadeInScroll>

                {/* --- LOADING STATE --- */}
                {loading ? (
                    <div className="space-y-12 sm:space-y-20">
                        {[1, 2].map((groupIndex) => (
                            <div key={groupIndex}>
                                <div className="h-6 sm:h-8 w-40 sm:w-64 bg-gray-800 rounded-lg animate-pulse mb-6 sm:mb-8"></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 xl:gap-8">
                                    {[1, 2, 3, 4].map((itemIndex) => (
                                        // Height matches horizontal layout on mobile, vertical layout on SM+
                                        <div key={itemIndex} className="animate-pulse bg-[#111827] rounded-2xl h-35 sm:h-95 border border-gray-800"></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                /* --- ERROR STATE --- */
                    <FadeInScroll delay={100}>
                        <div className="p-8 sm:p-12 text-center bg-red-500/10 border border-red-500/20 rounded-2xl sm:rounded-3xl shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                            <span className="text-4xl sm:text-5xl mb-3 sm:mb-4 block">⚠️</span>
                            <h3 className="text-xl sm:text-2xl font-bold text-red-400 mb-2">Connection Error</h3>
                            <p className="text-xs sm:text-base text-gray-400">{error}</p>
                        </div>
                    </FadeInScroll>
                ) : Object.keys(groupedProducts).length === 0 ? (
                /* --- EMPTY STATE --- */
                    <FadeInScroll delay={100}>
                        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4 bg-[#111827] rounded-2xl sm:rounded-3xl border border-gray-800 shadow-inner text-center">
                            <span className="text-5xl sm:text-6xl mb-4">🪹</span>
                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">No Products Found</h3>
                            <p className="text-xs sm:text-base text-gray-400 max-w-md">Our catalog is currently empty. Please check back later.</p>
                        </div>
                    </FadeInScroll>
                ) : (
                /* --- CATEGORY RENDER LOOP --- */
                    <div className="space-y-16 sm:space-y-24">
                        {Object.entries(groupedProducts).map(([category, items], categoryIndex) => (
                            <div key={category}>
                                {/* Category Header */}
                                <FadeInScroll delay={100}>
                                    <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10 bg-gray-900/40 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-gray-800/50 sm:border-none">
                                        <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2 sm:gap-3 capitalize">
                                            <span className={`w-1.5 sm:w-2 h-6 sm:h-8 rounded-full inline-block ${categoryIndex % 2 === 0 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]'}`}></span>
                                            {category} <span className="hidden sm:inline">Incubators</span>
                                        </h2>
                                        
                                        <span className="ml-auto sm:ml-0 bg-gray-800 text-gray-300 text-[10px] sm:text-sm font-bold px-2.5 sm:px-3 py-1 rounded-full border border-gray-700 shadow-inner">
                                            {items.length} <span className="hidden sm:inline">Items</span>
                                        </span>
                                        
                                        <div className="h-px bg-linear-to-r from-gray-800 to-transparent grow hidden sm:block"></div>
                                    </div>
                                </FadeInScroll>

                                {/* Product Grid for this Category */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 xl:gap-8">
                                    {items.map((product, productIndex) => (
                                        <FadeInScroll key={product.id} delay={productIndex * 100}>
                                            <div className="h-full transform transition-all duration-500 hover:translate-y-0 sm:hover:-translate-y-3 sm:hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.35)] active:scale-95 group">
                                                <div className="absolute -inset-0.5 bg-linear-to-b from-blue-500 to-indigo-600 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500 z-0 hidden sm:block"></div>
                                                <div className="relative z-10 h-full">
                                                    <ProductCard product={product} />
                                                </div>
                                            </div>
                                        </FadeInScroll>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}