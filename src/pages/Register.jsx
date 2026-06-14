import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { INDIA_LOCATIONS } from '../utils/locations';
import { ToastContext } from '../context/ToastContext'; 

// ========================================================
// SMART PREMIUM DROPDOWN (Viewport Detection Added)
// ========================================================
const CustomSelect = ({ name, value, options, placeholder, onChange, disabled, tabIndex }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropDirection, setDropDirection] = useState('down');
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => {
        if (disabled) return;
        
        // Smart Viewport Detection Logic
        if (!isOpen && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            if (spaceBelow < 260 && spaceAbove > spaceBelow) {
                setDropDirection('up');
            } else {
                setDropDirection('down');
            }
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative" ref={ref}>
            <div 
                tabIndex={disabled ? -1 : tabIndex || 0}
                className={`w-full bg-[#0B1120] text-white p-3.5 rounded-xl border border-gray-700 flex justify-between items-center transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-800/30' : 'cursor-pointer hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none'}`}
                onClick={toggleDropdown}
            >
                <span className={value ? 'text-white' : 'text-gray-500'}>{value || placeholder}</span>
                <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen && dropDirection === 'down' ? 'rotate-180' : ''} ${isOpen && dropDirection === 'up' ? '-rotate-180' : ''} ${isOpen ? 'text-blue-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            
            {isOpen && !disabled && (
                <div className={`absolute z-50 w-full bg-[#1f2937] border border-gray-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${dropDirection === 'up' ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top'}`}>
                    <ul className="max-h-60 overflow-y-auto py-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                        {options.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-gray-500 text-center italic">No options available</li>
                        ) : (
                            options.map((opt) => (
                                <li 
                                    key={opt} 
                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${value === opt ? 'bg-blue-600 text-white font-bold' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                                    onClick={() => {
                                        onChange({ target: { name, value: opt } });
                                        setIsOpen(false);
                                    }}
                                >
                                    {opt}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default function Register() {
    const { showToast } = useContext(ToastContext); 
    const [formData, setFormData] = useState({
        fullName: '', mobileNumber: '', email: '', password: '', confirmPassword: '',
        state: '', district: '', village: ''
    });

    const [showPass, setShowPass] = useState(false);
    const [showConfPass, setShowConfPass] = useState(false);
    
    // Removed Email from otpFlow entirely
    const [otpFlow, setOtpFlow] = useState({
        mobile: { checking: false, checked: false, isAvailable: false, sent: false, verified: false, code: '' }
    });
    
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'mobileNumber') {
            const digits = value.replace(/\D/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [name]: digits }));
            setOtpFlow(prev => ({ ...prev, mobile: { checking: false, checked: false, isAvailable: false, sent: false, verified: false, code: '' } }));
            setError('');
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Refactored to only check Mobile
    const handleCheckExists = async () => {
        setError('');
        setOtpFlow(prev => ({ ...prev, mobile: { ...prev.mobile, checking: true } }));

        try {
            await api.post('/auth/check-mobile', { mobileNumber: formData.mobileNumber });
            
            setOtpFlow(prev => ({ ...prev, mobile: { ...prev.mobile, checking: false, checked: true, isAvailable: false } }));
            setError('This mobile number is already registered. Please login.');
            
        } catch (err) {
            if (err.response?.status === 404) {
                setOtpFlow(prev => ({ ...prev, mobile: { ...prev.mobile, checking: false, checked: true, isAvailable: true } }));
            } else {
                setError(`Failed to check mobile number. Please try again.`);
                setOtpFlow(prev => ({ ...prev, mobile: { ...prev.mobile, checking: false } }));
            }
        }
    };

    // Refactored to only send Mobile OTP
    const handleSendOtp = async () => {
        setError('');
        try {
            showToast(`Sending secure OTP to +91 ${formData.mobileNumber}...`, 'info');
            await api.post('/auth/send-mobile-otp', { mobileNumber: formData.mobileNumber });
            showToast(`Live OTP dispatched to mobile! Valid for 5 minutes.`, 'success');
            setOtpFlow(prev => ({ ...prev, mobile: { ...prev.mobile, sent: true, code: '' } }));
        } catch (err) {
            showToast(err.response?.data || "Failed to route OTP to your cellular network.", "error");
            console.log(err);
        }
    };

    // Refactored to only verify Mobile OTP
    const handleVerifyOtp = async () => {
        setError('');
        try {
            await api.post('/auth/verify-mobile-otp', { mobileNumber: formData.mobileNumber, otp: otpFlow.mobile.code });
            setOtpFlow(prev => ({ ...prev, mobile: { ...prev.mobile, verified: true, sent: false, code: '' } }));
            showToast(`Mobile Number verified successfully!`, 'success');
        } catch (err) {
            showToast(err.response?.data || `Invalid or Expired mobile verification code.`, 'error');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        
        if (formData.password !== formData.confirmPassword) return setError("Passwords do not match!");
        if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password)) return setError("Password must be 8+ characters, contain at least 1 uppercase letter and 1 number.");
        if (!otpFlow.mobile.verified) return setError("You must verify your mobile number to register.");

        setIsSubmitting(true);
        const fullAddress = `${formData.village}, ${formData.district}, ${formData.state}`;
        const cleanPayload = { ...formData, address: fullAddress };
        
        try {
            await api.post('/auth/register', cleanPayload);
            showToast("Account created successfully! Please login.", "success");
            navigate('/login');
        } catch (err) { 
            const errMsg = typeof err.response?.data === 'string' ? err.response.data : "Registration failed. Please try again.";
            setError(errMsg); 
            setIsSubmitting(false);
        }
    };

    const availableDistricts = INDIA_LOCATIONS[formData.state] || [];
    const isPasswordValid = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password);
    const isFormLocked = !otpFlow.mobile.verified;

    const inputClass = "w-full bg-[#0B1120] text-white p-3.5 rounded-xl border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all duration-300";

    return (
        <div className="min-h-screen bg-[#0B1120] pt-24 pb-12 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-125 h-125 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-125 h-125 bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

            <div className={`bg-[#111827]/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-xl border border-gray-800 relative z-10 transition-all duration-700 transform ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Create Account</h2>
                    <p className="text-gray-400 text-sm">Join Venkat Incubators today.</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 text-sm font-bold border border-red-500/20 flex items-center gap-3 animate-fade-in-up">
                        <span className="text-xl">⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-5">
                    
                    {/* Full Name */}
                    <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-1.5 ml-1">Full Name *</label>
                        <input type="text" name="fullName" placeholder="e.g. Rajesh Kumar" required className={inputClass} onChange={handleFormChange} value={formData.fullName} />
                    </div>
                    
                    {/* ================= MOBILE SECTION ================= */}
                    <div className="p-4 rounded-2xl bg-gray-800/30 border border-gray-700/50">
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Mobile Number *</label>
                        <div className="flex gap-3">
                            <div className="relative w-full">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">+91</span>
                                <input type="text" name="mobileNumber" placeholder="9876543210" maxLength="10" required className={`${inputClass} pl-12`} value={formData.mobileNumber} onChange={handleFormChange} disabled={otpFlow.mobile.verified} />
                            </div>
                            
                            {!otpFlow.mobile.verified ? (
                                !otpFlow.mobile.checked ? (
                                    <button type="button" disabled={formData.mobileNumber.length !== 10 || otpFlow.mobile.checking} onClick={handleCheckExists} className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white px-4 rounded-xl font-bold transition-colors shrink-0 w-28 text-sm">
                                        {otpFlow.mobile.checking ? 'Checking...' : 'Check'}
                                    </button>
                                ) : otpFlow.mobile.isAvailable ? (
                                    <button type="button" onClick={handleSendOtp} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl font-bold transition-colors shrink-0 w-28 text-sm">
                                        {otpFlow.mobile.sent ? 'Resend OTP' : 'Send OTP'}
                                    </button>
                                ) : (
                                    <button type="button" disabled className="bg-red-500/20 text-red-400 px-4 rounded-xl font-bold shrink-0 w-28 text-sm cursor-not-allowed">
                                        Exists
                                    </button>
                                )
                            ) : (
                                <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 rounded-xl font-bold flex items-center justify-center shrink-0 w-28 text-sm">
                                    ✓ Verified
                                </div>
                            )}
                        </div>

                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${otpFlow.mobile.sent ? 'max-h-20 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="flex gap-3">
                                <input type="text" placeholder="Enter 6-digit OTP" maxLength="6" className={`${inputClass} text-center tracking-widest font-bold`} value={otpFlow.mobile.code} onChange={(e) => setOtpFlow(p => ({...p, mobile: {...p.mobile, code: e.target.value.replace(/\D/g, '')}}))} />
                                <button type="button" onClick={handleVerifyOtp} className="bg-green-600 hover:bg-green-500 text-white px-6 rounded-xl font-bold transition-colors shrink-0">
                                    Verify
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ================= EMAIL SECTION (No OTP) ================= */}
                    <div className="p-4 rounded-2xl bg-gray-800/30 border border-gray-700/50">
                        <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 flex justify-between">
                            <span>Email Address <span className="text-gray-600 normal-case ml-1">(Optional)</span></span>
                        </label>
                        <div className="flex gap-3">
                            <input 
                                type="email" 
                                name="email" 
                                placeholder="example@gmail.com" 
                                className={inputClass} 
                                value={formData.email} 
                                onChange={handleFormChange} 
                                disabled={isFormLocked}
                                tabIndex={isFormLocked ? -1 : 0}
                            />
                        </div>
                    </div>

                    {/* ================= LOCKED SECTION ================= */}
                    <div className={`space-y-5 transition-all duration-500 ${isFormLocked ? 'opacity-30 pointer-events-none grayscale-50' : 'opacity-100'}`}>
                        
                        {isFormLocked && (
                            <div className="flex items-center justify-center text-gray-400 text-sm font-bold bg-gray-800/50 p-2 rounded-xl mb-4 border border-gray-700">
                                🔒 Verify your mobile number to unlock these fields
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-1.5 ml-1">Password *</label>
                                <div className="relative">
                                    <input 
                                        type={showPass ? "text" : "password"} 
                                        name="password" 
                                        placeholder="Create Password" 
                                        required={!isFormLocked} 
                                        className={`${inputClass} ${formData.password && !isPasswordValid ? 'border-orange-500/50 focus:border-orange-500' : formData.password && isPasswordValid ? 'border-green-500/50 focus:border-green-500' : ''}`} 
                                        onChange={handleFormChange} 
                                        tabIndex={isFormLocked ? -1 : 0}
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} tabIndex={isFormLocked ? -1 : 0} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">{showPass ? "👁️" : "🙈"}</button>
                                </div>
                                <p className={`text-[10px] font-bold mt-1.5 ml-1 transition-colors duration-300 ${!formData.password ? 'text-gray-500' : isPasswordValid ? 'text-green-400' : 'text-orange-400'}`}>
                                    {isPasswordValid ? "✓ Password is strong" : "8+ chars, at least 1 uppercase & 1 number"}
                                </p>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-1.5 ml-1">Confirm *</label>
                                <div className="relative">
                                    <input 
                                        type={showConfPass ? "text" : "password"} 
                                        name="confirmPassword" 
                                        placeholder="Repeat Password" 
                                        required={!isFormLocked} 
                                        className={`${inputClass} ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`} 
                                        onChange={handleFormChange} 
                                        tabIndex={isFormLocked ? -1 : 0}
                                    />
                                    <button type="button" onClick={() => setShowConfPass(!showConfPass)} tabIndex={isFormLocked ? -1 : 0} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">{showConfPass ? "👁️" : "🙈"}</button>
                                </div>
                                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                    <p className="text-red-400 text-[10px] uppercase font-bold mt-1.5 ml-1">Passwords do not match</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 ml-1 border-b border-gray-800 pb-2">Delivery Address *</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                {/* CUSTOM UI DROPDOWNS */}
                                <CustomSelect 
                                    name="state"
                                    value={formData.state}
                                    options={Object.keys(INDIA_LOCATIONS)}
                                    placeholder="Select State"
                                    onChange={handleFormChange}
                                    disabled={isFormLocked}
                                    tabIndex={isFormLocked ? -1 : 0}
                                />
                                
                                <CustomSelect 
                                    name="district"
                                    value={formData.district}
                                    options={availableDistricts}
                                    placeholder="Select District"
                                    onChange={handleFormChange}
                                    disabled={!formData.state || isFormLocked}
                                    tabIndex={isFormLocked ? -1 : 0}
                                />

                            </div>
                            <input type="text" name="village" placeholder="Village / City / Street Name" className={inputClass} onChange={handleFormChange} value={formData.village} required={!isFormLocked} tabIndex={isFormLocked ? -1 : 0} />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting || isFormLocked}
                            tabIndex={isFormLocked ? -1 : 0}
                            className={`w-full py-4 rounded-xl font-bold text-white tracking-wide transition-all duration-300 shadow-lg mt-4 ${
                                isFormLocked 
                                    ? 'bg-gray-800 text-gray-500 border border-gray-700' 
                                    : isSubmitting 
                                        ? 'bg-green-600/50 cursor-wait' 
                                        : 'bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-500/25 hover:shadow-green-500/40 transform hover:-translate-y-0.5'
                            }`}
                        >
                            {isSubmitting ? 'Creating Account...' : isFormLocked ? 'Verify Mobile to Unlock' : 'Complete Registration'}
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center text-sm text-gray-400">
                    Already registered? <Link to="/login" className="text-blue-400 font-bold hover:text-blue-300 transition-colors ml-1">Login here</Link>
                </div>
            </div>
        </div>
    );
}