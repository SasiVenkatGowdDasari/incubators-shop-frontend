import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';

// --- Reusable Desktop Link Component with Underline Animation ---
const DesktopNavLink = ({ to, children, customColor = "text-gray-300 hover:text-white", underlineColor = "bg-blue-500" }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link to={to} className={`relative font-semibold text-sm tracking-wide transition-colors duration-300 group ${isActive ? 'text-white' : customColor}`}>
            {children}
            {/* Animated Underline */}
            <span className={`absolute -bottom-1.5 left-0 h-0.5 rounded-full transition-all duration-300 ease-out ${underlineColor} ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
        </Link>
    );
};

export default function Navbar() {
    const { user, logout } = useContext(AuthContext);
    const { cart } = useContext(CartContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Add a shadow/blur effect when scrolling down
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu automatically when changing routes
    const [prevPathname, setPrevPathname] = useState(location.pathname);
    if (location.pathname !== prevPathname) {
        setPrevPathname(location.pathname);
        setIsMobileMenuOpen(false);
    }

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMobileMenuOpen]);

    const handleLogout = () => {
        logout();
        navigate('/login');
        setIsMobileMenuOpen(false);
    };

    // Safely handles cart count
    const cartCount = (cart || []).reduce((total, item) => total + (item.quantity || 1), 0);

    const isLoggedIn = !!user;
    const isAdmin = user?.role === 'ADMIN';
    const isCustomer = isLoggedIn && !isAdmin;

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#0B1120]/95 backdrop-blur-xl border-b border-gray-800 shadow-xl' : 'bg-[#0B1120]/80 backdrop-blur-md border-b border-transparent'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 sm:h-20 items-center">

                    {/* ================= LOGO ================= */}
                    <Link to="/" className="text-xl font-extrabold text-white tracking-wider flex items-center gap-2 sm:gap-3 group z-50 relative">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.7)] transition-all duration-300 transform group-hover:scale-105 shrink-0">
                            <span className="text-white text-lg sm:text-xl leading-none">V</span>
                        </div>
                        <span className="bg-clip-text text-transparent bg-linear-to-r from-white to-gray-400 text-sm sm:text-lg whitespace-nowrap">
                            VENKAT INCUBATORS
                        </span>
                    </Link>

                    {/* ================= DESKTOP NAVIGATION ================= */}
                    <div className="hidden md:flex items-center gap-8">
                        <DesktopNavLink to="/">Home</DesktopNavLink>
                        <DesktopNavLink to="/products">All Products</DesktopNavLink>

                        {isAdmin && (
                            <DesktopNavLink to="/admin" customColor="text-blue-400 hover:text-blue-300" underlineColor="bg-blue-400">
                                Admin Panel
                            </DesktopNavLink>
                        )}

                        {isCustomer && (
                            <>
                                <DesktopNavLink to="/my-orders">My Orders</DesktopNavLink>
                                <Link to="/cart" className="text-gray-300 hover:text-white relative flex items-center group transition p-1">
                                    <svg className="w-6 h-6 transform group-hover:scale-110 transition-transform duration-300 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1.5 -right-2 bg-linear-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-[#0B1120] animate-pulse">
                                            {cartCount}
                                        </span>
                                    )}
                                </Link>
                            </>
                        )}

                        {/* Desktop User Actions */}
                        {isLoggedIn ? (
                            <div className="flex items-center gap-5 border-l border-gray-700/60 pl-6 ml-2">
                                <Link to="/profile" className="flex items-center gap-2 group">
                                    <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center border border-gray-600 group-hover:border-blue-500 transition-colors duration-300">
                                        <span className="text-xs font-bold text-gray-300 group-hover:text-blue-400">{user.fullName?.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <span className="text-gray-300 font-medium text-sm group-hover:text-blue-400 transition-colors duration-300">
                                        Hi, {user.fullName?.split(' ')[0]}
                                    </span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-red-400 hover:text-white text-sm font-bold px-4 py-1.5 rounded-full border border-red-500/30 hover:bg-red-500 hover:border-red-500 transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                >
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <div className="border-l border-gray-700/60 pl-6 ml-2">
                                <Link to="/login" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transform hover:-translate-y-0.5">
                                    Login
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* ================= MOBILE CONTROLS ================= */}
                    <div className="md:hidden flex items-center gap-3 relative z-50">
                        {isCustomer && (
                            <Link to="/cart" className="text-gray-300 hover:text-white relative p-1.5 bg-gray-800/50 rounded-lg active:scale-95 transition-transform">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#0B1120]">{cartCount}</span>}
                            </Link>
                        )}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-gray-300 hover:text-white p-1.5 rounded-lg bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all active:scale-95"
                        >
                            <svg className={`h-5 w-5 transform transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90 text-blue-400' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMobileMenuOpen
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                }
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* ================= MOBILE MENU OVERLAY & DROPDOWN ================= */}
            {/* Backdrop overlay to close menu by clicking outside */}
            <div 
                className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            <div className={`md:hidden absolute w-full left-0 top-full bg-[#0B1120]/95 backdrop-blur-2xl border-b border-gray-800 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden z-50 ${isMobileMenuOpen ? 'max-h-[85vh] opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`}>
                <div className="px-5 py-6 space-y-3 flex flex-col max-h-[80vh] overflow-y-auto custom-scrollbar">

                    <Link to="/" className="flex items-center gap-3 px-4 py-4 font-bold text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-2xl transition-all duration-300 transform active:scale-95 bg-gray-900/20 border border-gray-800/50">
                        <span className="text-xl">🏠</span> Home
                    </Link>

                    <Link to="/products" className="flex items-center gap-3 px-4 py-4 font-bold text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-2xl transition-all duration-300 transform active:scale-95 bg-gray-900/20 border border-gray-800/50">
                        <span className="text-xl">🛍️</span> All Products
                    </Link>

                    {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-4 font-bold text-blue-400 bg-blue-900/10 border border-blue-500/20 rounded-2xl transition-all duration-300 transform active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                            <span className="text-xl">⚙️</span> Admin Panel
                        </Link>
                    )}
                    
                    {isCustomer && (
                        <Link to="/my-orders" className="flex items-center gap-3 px-4 py-4 font-bold text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-2xl transition-all duration-300 transform active:scale-95 bg-gray-900/20 border border-gray-800/50">
                            <span className="text-xl">📦</span> My Orders
                        </Link>
                    )}

                    {isLoggedIn ? (
                        <div className="mt-4 pt-6 border-t border-gray-800 flex flex-col gap-3">
                            <Link to="/profile" className="flex items-center gap-3 px-4 py-4 font-bold text-white bg-linear-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-2xl transition-all duration-300 transform active:scale-95 border border-gray-700 shadow-md">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                    {user.fullName?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">Logged in as</span>
                                    <span>{user.fullName?.split(' ')[0]}</span>
                                </div>
                            </Link>
                            <button onClick={handleLogout} className="w-full text-center px-4 py-4 font-bold text-red-400 hover:text-white hover:bg-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <div className="mt-4 pt-6 border-t border-gray-800">
                            <Link to="/login" className="flex items-center justify-center gap-2 w-full px-4 py-4 font-black text-white bg-linear-to-r from-blue-600 to-indigo-600 shadow-[0_10px_20px_-10px_rgba(59,130,246,0.6)] rounded-2xl text-center transition-all duration-300 transform active:scale-95 text-lg">
                                <span>🔒</span> Login / Sign Up
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}