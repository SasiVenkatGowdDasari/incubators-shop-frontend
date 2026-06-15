import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext'; 
import api from '../services/api';

export default function Login() {
    const { showToast } = useContext(ToastContext); 
    const [mobileNumber, setMobileNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    // --- Forgot Password States ---
    const [isForgotOpen, setIsForgotOpen] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); // 1 = Check/OTP, 2 = New Password
    const [forgotMobile, setForgotMobile] = useState('');
    const [isAccountFound, setIsAccountFound] = useState(false); 
    const [isChecking, setIsChecking] = useState(false);
    const [forgotOtp, setForgotOtp] = useState({ sent: false, verified: false, code: '' });
    const [forgotPass, setForgotPass] = useState({ password: '', confirmPassword: '' });
    const [showForgotPass, setShowForgotPass] = useState(false);
    const [showForgotConf, setShowForgotConf] = useState(false);
    const [forgotError, setForgotError] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 10);
        return () => clearTimeout(timer);
    }, []);

    // Strict 10-digit mobile number handler for Login
    const handleMobileChange = (e) => {
        const val = e.target.value.replace(/\D/g, ''); 
        if (val.length <= 10) setMobileNumber(val);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (mobileNumber.length !== 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { mobileNumber, password });
            login(response.data);
            navigate('/');
        } catch (err) {
            const errMsg = typeof err.response?.data === 'string' 
                ? err.response.data 
                : 'Invalid mobile number or password.';
            setError(errMsg);
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // FORGOT PASSWORD HANDLERS
    // ==========================================
    const closeForgotModal = () => {
        setIsForgotOpen(false);
        setForgotStep(1);
        setForgotMobile('');
        setIsAccountFound(false);
        setForgotOtp({ sent: false, verified: false, code: '' });
        setForgotPass({ password: '', confirmPassword: '' });
        setForgotError('');
    };

    const handleForgotMobileChange = (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
        setForgotMobile(val);
        // Reset everything if user changes the number
        setIsAccountFound(false);
        setForgotError('');
        if (forgotOtp.sent || forgotOtp.verified) {
            setForgotOtp({ sent: false, verified: false, code: '' });
        }
    };

    // CHECK MOBILE (Requires 200 OK for success)
    const handleCheckMobile = async () => {
        setForgotError('');
        if (forgotMobile.length !== 10) {
            return setForgotError("Please enter a complete 10-digit mobile number.");
        }
        
        setIsChecking(true);
        try {
            // Call backend to verify if user exists
            await api.post('/auth/check-mobile', { mobileNumber: forgotMobile });
            
            // HTTP 200 OK: Account exists! Proceed to OTP flow.
            setIsAccountFound(true);
        } catch (err) {
            // HTTP 404: Account not found
            setForgotError("No account present with this number. Please register.");
            console.log(err)
            setIsAccountFound(false);
        } finally {
            setIsChecking(false);
        }
    };

    // DISPATCH LIVE OTP
    const handleSendForgotOtp = async () => {
        setForgotError('');
        try {
            showToast(`Sending secure OTP to +91 ${forgotMobile}...`, 'info');
            await api.post('/auth/send-mobile-otp', { mobileNumber: forgotMobile });
            showToast(`Live OTP dispatched to mobile! Valid for 10 minutes.`, 'success');
            setForgotOtp(prev => ({ ...prev, sent: true, code: '' }));
        } catch (err) {
            setForgotError(err.response?.data || "Failed to dispatch OTP. Please try again.");
        }
    };

    // VERIFY LIVE OTP
    const handleVerifyForgotOtp = async () => {
        setForgotError('');
        try {
            const response = await api.post('/auth/verify-mobile-otp', { mobileNumber: forgotMobile, otp: forgotOtp.code });
            
            // Strict JSON boolean parsing
            if (response.data === false || response.data === "false") {
                throw new Error("Invalid or Expired mobile verification code.");
            }
            
            setForgotOtp(prev => ({ ...prev, verified: true, sent: false, code: '' }));
            setForgotError('');
            setForgotStep(2); // Proceed to Set New Password Step
            showToast(`Mobile number verified! Proceeding to password reset.`, 'success');
        } catch (err) {
            const errorMsg = err.response?.data || err.message || "Invalid or Expired mobile verification code.";
            setForgotError(errorMsg);
            showToast(errorMsg, 'error');
        }
    };

    const handleForgotPassChange = (e) => {
        setForgotPass(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSaveNewPassword = async () => {
        setForgotError('');
        
        if (forgotPass.password !== forgotPass.confirmPassword) {
            return setForgotError("Passwords do not match!");
        }
        
        const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passRegex.test(forgotPass.password)) {
            return setForgotError("Password must be 8+ characters, contain at least 1 uppercase letter and 1 number.");
        }

        try {
            setIsSubmitting(true);
            
            // Calls backend to actually save the new password
            await api.put('/auth/reset-password', {
                mobileNumber: forgotMobile,
                newPassword: forgotPass.password
            });
            
            setIsSubmitting(false);
            closeForgotModal();
            
            showToast("Password reset successfully! Please login with your new password.", "success");
            setMobileNumber(forgotMobile); 
            setPassword('');
        } catch (err) {
            setIsSubmitting(false);
            // Prevents the "Blank White Screen" by ensuring we extract a string, not a JSON object
            const errMsg = typeof err.response?.data === 'string' 
                ? err.response.data 
                : err.response?.data?.message || "Failed to reset password. Please try again.";
            setForgotError(errMsg);
        }
    };

    const isPasswordValid = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(forgotPass.password);
    const inputClass = "w-full bg-[#0B1120] text-white p-4 rounded-2xl border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all duration-300";

    return (
        <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 right-1/4 w-125 h-125 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
            
            <div className={`bg-[#111827]/80 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] border border-gray-800 w-full max-w-md relative z-10 transition-all duration-700 transform ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Welcome Back</h2>
                    <p className="text-gray-400 text-sm">Sign in to your Venkat Incubators account</p>
                </div>
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Mobile Number</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">+91</span>
                            <input 
                                type="text" 
                                placeholder="9876543210"
                                className={`${inputClass} pl-12`}
                                value={mobileNumber}
                                onChange={handleMobileChange}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2 ml-1">
                            <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Password</label>
                            <button 
                                type="button" 
                                onClick={() => setIsForgotOpen(true)}
                                className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors"
                            >
                                Forgot Password?
                            </button>
                        </div>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className={`${inputClass} pr-12`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                                {showPassword ? "👁️" : "🙈"}
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-[0_10px_20px_-5px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 active:scale-[0.98] mt-2"
                    >
                        {isSubmitting ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm">
                    <span className="text-gray-500">Don't have an account? </span>
                    <Link to="/register" className="text-blue-400 font-bold hover:text-blue-300 transition-colors">Register here</Link>
                </div>
            </div>

            {/* ==========================================
                FORGOT PASSWORD MODAL 
            ========================================== */}
            {isForgotOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#111827] border border-gray-700 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
                        
                        {forgotStep === 1 ? (
                            // --- STEP 1: MOBILE & OTP ---
                            <>
                                <h3 className="text-2xl font-black text-white mb-2">Reset Password</h3>
                                <p className="text-gray-400 text-xs mb-6">Verify your mobile number to reset your password.</p>

                                {forgotError && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
                                        <span>⚠️</span> {forgotError}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Mobile Number</label>
                                        
                                        <div className="flex gap-3">
                                            {/* Input is on the left */}
                                            <div className="relative w-full">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">+91</span>
                                                <input 
                                                    type="text" 
                                                    placeholder="9876543210" 
                                                    maxLength="10" 
                                                    className={`${inputClass} pl-12 py-3 ${forgotError ? 'border-red-500 focus:border-red-500' : ''}`} 
                                                    value={forgotMobile} 
                                                    onChange={handleForgotMobileChange} 
                                                    disabled={forgotOtp.verified} 
                                                />
                                            </div>
                                            
                                            {/* Dynamic Button is on the right */}
                                            <button 
                                                type="button" 
                                                disabled={forgotMobile.length !== 10 || isChecking} 
                                                onClick={!isAccountFound ? handleCheckMobile : handleSendForgotOtp} 
                                                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-4 rounded-xl font-bold transition-colors shrink-0 text-sm w-28"
                                            >
                                                {isChecking ? 'Checking...' : !isAccountFound ? 'Check' : forgotOtp.sent ? 'Resend OTP' : 'Send OTP'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* 4-DIGIT OTP Input Field */}
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${forgotOtp.sent ? 'max-h-20 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="flex gap-3">
                                            <input 
                                                type="text" 
                                                placeholder="4-digit OTP" 
                                                maxLength="4" 
                                                className={`${inputClass} py-3 text-center tracking-widest font-bold`} 
                                                value={forgotOtp.code} 
                                                onChange={(e) => setForgotOtp(p => ({...p, code: e.target.value.replace(/\D/g, '')}))} 
                                            />
                                            <button 
                                                type="button" 
                                                disabled={forgotOtp.code.length !== 4}
                                                onClick={handleVerifyForgotOtp} 
                                                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-6 rounded-xl font-bold transition-colors shrink-0"
                                            >
                                                Verify
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-800/80 mt-4">
                                        <button onClick={closeForgotModal} className="w-full py-3 rounded-xl font-bold text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // --- STEP 2: NEW PASSWORD ---
                            <>
                                <h3 className="text-2xl font-black text-white mb-2">Create New Password</h3>
                                <p className="text-gray-400 text-xs mb-6">Create a secure new password for your account.</p>

                                {forgotError && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
                                        <span>⚠️</span> {forgotError}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1">New Password *</label>
                                        <div className="relative">
                                            <input 
                                                type={showForgotPass ? "text" : "password"} 
                                                name="password" 
                                                value={forgotPass.password} 
                                                onChange={handleForgotPassChange} 
                                                className={`${inputClass} py-3 ${forgotPass.password && !isPasswordValid ? 'border-orange-500/50 focus:border-orange-500' : forgotPass.password && isPasswordValid ? 'border-green-500/50 focus:border-green-500' : ''}`} 
                                                placeholder="Create new password"
                                            />
                                            <button type="button" onClick={() => setShowForgotPass(!showForgotPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">{showForgotPass ? "👁️" : "🙈"}</button>
                                        </div>
                                        <p className={`text-[10px] font-bold mt-1.5 ml-1 transition-colors duration-300 ${!forgotPass.password ? 'text-gray-500' : isPasswordValid ? 'text-green-400' : 'text-orange-400'}`}>
                                            {isPasswordValid ? "✓ Password is strong" : "8+ chars, at least 1 uppercase & 1 number"}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1">Confirm New Password *</label>
                                        <div className="relative">
                                            <input 
                                                type={showForgotConf ? "text" : "password"} 
                                                name="confirmPassword" 
                                                value={forgotPass.confirmPassword} 
                                                onChange={handleForgotPassChange} 
                                                className={`${inputClass} py-3 ${forgotPass.confirmPassword && forgotPass.password !== forgotPass.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`} 
                                                placeholder="Repeat new password"
                                            />
                                            <button type="button" onClick={() => setShowForgotConf(!showForgotConf)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">{showForgotConf ? "👁️" : "🙈"}</button>
                                        </div>
                                        {forgotPass.confirmPassword && forgotPass.password !== forgotPass.confirmPassword && (
                                            <p className="text-red-400 text-[10px] uppercase font-bold mt-1.5 ml-1">Passwords do not match</p>
                                        )}
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t border-gray-800/80">
                                        <button onClick={closeForgotModal} className="w-1/3 py-3 rounded-xl font-bold text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition">
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleSaveNewPassword} 
                                            disabled={isSubmitting || !isPasswordValid || forgotPass.password !== forgotPass.confirmPassword}
                                            className="w-2/3 py-3 rounded-xl font-bold text-white bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                        >
                                            {isSubmitting ? 'Saving...' : 'Save Password'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}