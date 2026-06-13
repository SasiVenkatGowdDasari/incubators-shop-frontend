import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Robust helper to handle both Cloudinary and local images
const getMediaUrl = (urlStr) => {
    if (!urlStr) return null;
    const firstUrl = urlStr.split(',')[0].trim();
    if (firstUrl.startsWith('http')) return firstUrl;
    const cleanPath = firstUrl.startsWith('/') ? firstUrl : `/uploads/${firstUrl}`.replace('/uploads/uploads/', '/uploads/');
    return `${BACKEND_URL}${cleanPath}`;
};

export default function ProductCard({ product }) {
    const { addToCart, cart } = useContext(CartContext);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const imageUrl = getMediaUrl(product.imageUrl);
    const isAdmin = user?.role === 'ADMIN';

    // FIX: Strictly check if 'user' exists before evaluating cart status
    const isInCart = user ? cart.some(item => item.id === product.id) : false;
    const isOutOfStock = product.stockQuantity <= 0;

    const handleActionClick = (e) => {
        e.preventDefault(); 
        e.stopPropagation(); // Prevents the outer <Link> from triggering

        // Check if logged in first!
        if (!user) {
            sessionStorage.setItem('pendingCartItem', JSON.stringify(product));
            navigate('/login');
            return;
        }

        if (isInCart) {
            navigate('/cart');
        } else {
            addToCart(product);
        }
    };

    // Determine Stock Badge Properties
    let stockText = 'IN STOCK';
    let stockColor = 'bg-green-600 text-white';
    if (isOutOfStock) {
        stockText = 'OUT OF STOCK';
        stockColor = 'bg-red-600 text-white';
    } else if (product.stockQuantity < 5) {
        stockText = 'LIMITED';
        stockColor = 'bg-yellow-500 text-yellow-950';
    }

    // Safely parse rating
    const ratingValue = parseFloat(product.rating) || 0;
    const fullStars = Math.round(ratingValue);
    const emptyStars = 5 - fullStars;

    return (
        <Link to={`/product/${product.id}`} className="block h-full group">
            <div className="flex flex-row sm:flex-col bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden h-full sm:hover:border-gray-700 transition-all duration-300 relative shadow-lg group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                
                {/* --- Top Left Badge (Stock Status) --- */}
                <div className={`absolute top-0 left-0 z-10 px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-br-lg shadow-md ${stockColor}`}>
                    {stockText}
                </div>

                {/* --- IMAGE SECTION --- */}
                <div className="w-[40%] sm:w-full min-h-35 sm:h-48 relative bg-[#0B1120] flex items-center justify-center p-3 sm:p-4 shrink-0 overflow-hidden border-r sm:border-r-0 sm:border-b border-gray-800">
                    {imageUrl ? (
                        <img 
                            src={imageUrl} 
                            alt={product.title} 
                            className="w-full h-full object-contain filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)] transform sm:group-hover:scale-105 transition-transform duration-500" 
                            onError={(e) => { 
                                e.target.style.display = 'none'; 
                                e.target.parentElement.innerHTML = '<span class="text-4xl opacity-50">📦</span>'; 
                            }}
                        />
                    ) : (
                        <span className="text-4xl opacity-50">📦</span>
                    )}
                </div>

                {/* --- DETAILS SECTION --- */}
                <div className="w-[60%] sm:w-full p-3 sm:p-5 flex flex-col grow justify-between bg-[#111827]">
                    
                    <div>
                        {/* Brand / Material Label */}
                        <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1 truncate">
                            {product.material || "Venkat Incubators"}
                        </div>
                        
                        {/* Product Title */}
                        <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug mb-1.5 hover:text-blue-400 transition-colors">
                            {product.title}
                        </h3>

                        {/* Rating Row */}
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-sm mb-2">
                            <span className="text-blue-400 font-bold">{ratingValue.toFixed(1)}</span>
                            <div className="flex text-blue-500 tracking-widest">
                                {'★'.repeat(fullStars)}
                                <span className="text-gray-700">{'☆'.repeat(emptyStars)}</span>
                            </div>
                            <span className="text-gray-500 ml-1">({product.totalPurchases || 0})</span>
                        </div>

                        {/* Price Row */}
                        <div className="flex items-end gap-1.5 mb-1.5">
                            <span className="text-lg sm:text-2xl font-black text-white">₹{product.currentPrice}</span>
                            {product.actualPrice > product.currentPrice && (
                                <span className="text-[10px] sm:text-sm text-gray-500 line-through mb-0.5 sm:mb-1">₹{product.actualPrice}</span>
                            )}
                        </div>
                        
                        {/* Delivery Text from Database */}
                        <div className="text-[9px] sm:text-[10px] font-bold text-green-400 mb-3 truncate">
                            {product.shippingOptions || "FREE Delivery Available"}
                        </div>
                    </div>

                    {/* --- ACTION BUTTONS --- */}
                    <div className="mt-auto flex gap-2">
                        {isAdmin ? (
                            <button 
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    e.stopPropagation(); 
                                    navigate(`/admin?tab=inventory&edit=${product.id}`); 
                                }}
                                className="w-full bg-gray-800 hover:bg-gray-700 text-white text-[10px] sm:text-xs font-bold py-2 sm:py-3 rounded-lg border border-gray-700 transition"
                            >
                                Edit Product
                            </button>
                        ) : (
                            <>
                                <button className="w-1/3 bg-[#0B1120] text-gray-300 hover:text-white hover:bg-gray-800 text-[10px] sm:text-xs font-bold py-2 sm:py-2.5 rounded-lg border border-gray-700 transition shadow-sm flex items-center justify-center">
                                    Details
                                </button>
                                <button 
                                    onClick={handleActionClick}
                                    disabled={isOutOfStock && !isInCart}
                                    className={`w-2/3 text-[10px] sm:text-xs font-bold py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 ${
                                        isOutOfStock && !isInCart 
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' 
                                            : isInCart 
                                                ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] hover:-translate-y-1 active:scale-95' 
                                                : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:-translate-y-1 active:scale-95'
                                    }`}
                                >
                                    {isOutOfStock && !isInCart ? (
                                        'Sold Out'
                                    ) : isInCart ? (
                                        <><span>✓</span> In Cart</>
                                    ) : (
                                        <><span>🛒</span> Add</>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}