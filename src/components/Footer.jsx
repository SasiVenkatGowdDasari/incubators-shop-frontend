import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

export default function Footer() {
    const { user } = useContext(AuthContext);
    const isAdmin = user?.role === 'ADMIN';
    const isCustomer = user && user.role !== 'ADMIN';

    const [adminContact, setAdminContact] = useState({
        email: 'support@venkatincubators.com',
        phone: '95022 55923',
        address: 'Hyderabad, Telangana, India'
    });

    useEffect(() => {
        const fetchAdminInfo = async () => {
            try {
                const res = await api.get('/profile/admin-contact');
                if (res.data) {
                    setAdminContact({
                        email: res.data.email || 'support@venkatincubators.com',
                        phone: res.data.mobileNumber || '95022 55923',
                        address: res.data.address ? res.data.address.replace(/,/g, ', ') : 'Hyderabad, Telangana, India'
                    });
                }
            } catch (err) {
                console.warn("Could not fetch admin info for footer.");
                console.log(err)
            }
        };
        fetchAdminInfo();
    }, []);

    const linkClass = "text-gray-400 hover:text-blue-400 transition-all duration-300 text-sm font-medium flex items-center gap-2 group";

    return (
        <footer className="bg-[#0B1120] border-t border-gray-800 pt-16 pb-8 relative overflow-hidden z-20 mt-auto">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-blue-900/10 blur-[100px] pointer-events-none z-0"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                {/* =========================================================
                         DEVELOPER PROMO BANNER (Updated & Rounded)
                    ========================================================= */}
                <div className="mb-16 w-full">
                    <div className="bg-linear-to-r from-[#111827] via-indigo-900/10 to-[#111827] border border-indigo-500/20 rounded-3xl p-6 md:p-10 shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:border-indigo-500/40 transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-full bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                            <div className="text-center lg:text-left">
                                <h4 className="text-white font-black text-2xl md:text-3xl mb-3 flex items-center justify-center lg:justify-start gap-3">
                                    <span className="text-3xl">👨‍💻</span> Need a Custom Website?
                                </h4>
                                <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-xl">
                                    Built with passion by <strong className="text-white">Sasi Venkat Gowd</strong>. I build premium, high-performance web solutions. Let's create something extraordinary.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                                {/* Email Button */}
                                <a
                                    href="mailto:sasivenkatgowdnda@gmail.com"
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-600/30 transition-all duration-300 px-8 py-4 rounded-full border border-indigo-500/30 text-sm font-bold whitespace-nowrap shadow-lg hover:shadow-indigo-500/20"
                                >
                                    ✉️ Email Me
                                </a>

                                {/* WhatsApp Button - Official Green Branding */}
                                <a
                                    href="https://wa.me/916304999476?text=Hi%20Sasi,%20I%20saw%20your%20website%20Venkat%20Incubators%20and%20I'm%20reaching%20out%20to%20build%20a%20custom%20website%20for%20me!"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 text-white bg-[#25D366] hover:bg-[#128C7E] transition-all duration-300 px-8 py-4 rounded-full text-sm font-bold whitespace-nowrap shadow-lg hover:shadow-green-500/20"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.452-.885-.77-1.482-1.72-1.655-2.017-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                    </svg>
                                    WhatsApp Me
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- FOOTER GRID --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 border-t border-gray-800/80 pt-12">
                    <div className="space-y-4">
                        <Link to="/" className="text-xl font-extrabold text-white tracking-wider flex items-center gap-3">
                            <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">V</div>
                            <span>VENKAT INCUBATORS</span>
                        </Link>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                            Maximizing hatching rates with next-gen technology.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-white font-bold uppercase tracking-widest mb-6 text-sm border-l-2 border-blue-500 pl-3">Navigation</h3>
                        <ul className="space-y-3">
                            <li><Link to="/" className={linkClass}><span className="w-1.5 h-1.5 rounded-full bg-gray-700 group-hover:bg-blue-500"></span> Home</Link></li>
                            <li><Link to="/products" className={linkClass}><span className="w-1.5 h-1.5 rounded-full bg-gray-700 group-hover:bg-blue-500"></span> All Products</Link></li>
                            {isAdmin && <li><Link to="/admin" className={linkClass}><span className="w-1.5 h-1.5 rounded-full bg-gray-700 group-hover:bg-blue-500"></span> Admin</Link></li>}
                            {isCustomer && (
                                <>
                                    <li><Link to="/cart" className={linkClass}><span className="w-1.5 h-1.5 rounded-full bg-gray-700 group-hover:bg-blue-500"></span> Cart</Link></li>
                                    <li><Link to="/my-orders" className={linkClass}><span className="w-1.5 h-1.5 rounded-full bg-gray-700 group-hover:bg-blue-500"></span> My Orders</Link></li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-bold uppercase tracking-widest mb-6 text-sm border-l-2 border-indigo-500 pl-3">Contact</h3>
                        <ul className="space-y-4 text-sm text-gray-400">
                            <li className="flex items-center gap-3 hover:text-white transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-blue-400 shrink-0">📧</div>
                                <span className="break-all">{adminContact.email}</span>
                            </li>
                            <li className="flex items-center gap-3 hover:text-white transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-green-400 shrink-0">📞</div>
                                <span>+91 {adminContact.phone}</span>
                            </li>
                            <li className="flex items-start gap-3 hover:text-white transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-red-400 shrink-0">📍</div>
                                <span className="leading-relaxed mt-1">{adminContact.address}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="text-center pt-8 border-t border-gray-800/50">
                    <p className="text-gray-600 text-xs font-medium tracking-wide">
                        &copy; {new Date().getFullYear()} Venkat Incubators. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}