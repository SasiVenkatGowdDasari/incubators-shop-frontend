import { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext'; 
import api from '../services/api';
import { INDIA_LOCATIONS } from '../utils/locations';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const getMediaUrl = (urlStr) => {
    if (!urlStr) return '';
    const firstUrl = urlStr.split(',')[0].trim();
    if (firstUrl.startsWith('http')) return firstUrl;
    const cleanPath = firstUrl.startsWith('/') ? firstUrl : `/uploads/${firstUrl}`.replace('/uploads/uploads/', '/uploads/');
    return `${BACKEND_URL}${cleanPath}`;
};

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
                className={`w-full bg-[#0B1120] text-sm sm:text-base text-white p-3 sm:p-3.5 rounded-xl border border-gray-700 flex justify-between items-center transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-800/30' : 'cursor-pointer hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none'}`}
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

const parseAddress = (user) => {
    if (user.state && user.district && user.village) {
        return { state: user.state, district: user.district, village: user.village };
    }
    const parts = (user.address || '').split(',').map(s => s.trim());
    return { village: parts[0] || '', district: parts[1] || '', state: parts[2] || '' };
};

function ProfileForm({ initialUser, updateUser }) {
    const { showToast } = useContext(ToastContext); 
    const [isEditing, setIsEditing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const fileInputRef = useRef(null);
    const [imagePreview, setImagePreview] = useState(null); 
    const [selectedImageFile, setSelectedImageFile] = useState(null);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordStep, setPasswordStep] = useState(1); 
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' }); 
    const [isPasswordVerifying, setIsPasswordVerifying] = useState(false);
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);
    
    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfPass, setShowConfPass] = useState(false);

    const initialAddress = parseAddress(initialUser);
    const cleanInitialMobile = (initialUser.mobileNumber || '').replace(/\D/g, '').slice(-10);

    const [formData, setFormData] = useState({
        fullName: initialUser.fullName || '',
        email: initialUser.email || '',
        mobileNumber: cleanInitialMobile, 
        state: initialAddress.state,
        district: initialAddress.district,
        village: initialAddress.village
    });

    const [errors, setErrors] = useState({ email: '', mobileNumber: '' });
    
    const [otpFlow, setOtpFlow] = useState({
        mobileNumber: { checking: false, checked: false, isAvailable: false, sent: false, verified: false, code: '' }
    });

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'state') setFormData(prev => ({ ...prev, district: '' }));
        if (name === 'email') {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
            setErrors(prev => ({ ...prev, email: (value && !emailRegex.test(value)) ? 'Must be a valid @gmail.com address' : '' }));
        }
    };

    const handleMobileChange = (e) => {
        const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
        setFormData(prev => ({ ...prev, mobileNumber: rawDigits }));

        // Instantly reset the verify flow and clear errors if they change the number back
        setOtpFlow({ mobileNumber: { checking: false, checked: false, isAvailable: false, sent: false, verified: false, code: '' } });

        if (rawDigits.length > 0 && rawDigits.length !== 10) {
            setErrors(prev => ({ ...prev, mobileNumber: 'Must be exactly 10 digits' }));
        } else {
            setErrors(prev => ({ ...prev, mobileNumber: '' }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImagePreview(URL.createObjectURL(file)); 
            setSelectedImageFile(file);
        }
    };

    const handleCheckExists = async () => {
        setOtpFlow(prev => ({ ...prev, mobileNumber: { ...prev.mobileNumber, checking: true } }));
        setErrors(prev => ({ ...prev, mobileNumber: '' }));
        try {
            await api.post('/auth/check-mobile', { mobileNumber: formData.mobileNumber });
            // 200 OK means it EXISTS. We block it!
            setOtpFlow(prev => ({ ...prev, mobileNumber: { ...prev.mobileNumber, checking: false, checked: true, isAvailable: false } }));
            setErrors(prev => ({ ...prev, mobileNumber: 'Mobile number already exists, check with another one.' }));
        } catch (err) {
            if (err.response?.status === 404) {
                // 404 Not Found means it's available. Proceed to Send OTP.
                setOtpFlow(prev => ({ ...prev, mobileNumber: { ...prev.mobileNumber, checking: false, checked: true, isAvailable: true } }));
                setErrors(prev => ({ ...prev, mobileNumber: '' }));
            } else {
                setErrors(prev => ({ ...prev, mobileNumber: 'Failed to verify mobile availability.' }));
                setOtpFlow(prev => ({ ...prev, mobileNumber: { ...prev.mobileNumber, checking: false } }));
            }
        }
    };

    const handleSendOtp = async () => {
        try {
            showToast(`Sending secure OTP to +91 ${formData.mobileNumber}...`, 'info');
            await api.post('/auth/send-mobile-otp', { mobileNumber: formData.mobileNumber });
            showToast(`OTP sent to your mobile phone! Valid for 5 minutes.`, 'success');
            setOtpFlow(prev => ({ ...prev, mobileNumber: { ...prev.mobileNumber, sent: true } }));
        } catch (err) {
            showToast(err.response?.data || "Failed to send OTP to mobile number.", "error");
        }
    };

    const handleVerifyOtp = async () => {
        try {
            const response = await api.post('/auth/verify-mobile-otp', { mobileNumber: formData.mobileNumber, otp: otpFlow.mobileNumber.code });
            
            // STRICT CHECK: If backend returns true/false wrapped in a 200 OK
            if (response.data === false || response.data === "false") {
                throw new Error("Invalid or expired mobile OTP.");
            }
            
            setOtpFlow(prev => ({ ...prev, mobileNumber: { ...prev.mobileNumber, verified: true, sent: false, code: '' } }));
            setErrors(prev => ({ ...prev, mobileNumber: '' }));
            showToast(`Mobile number verified successfully!`, 'success');
        } catch (err) {
            const errorMsg = err.response?.data || err.message || "Invalid or expired mobile OTP.";
            setErrors(prev => ({ ...prev, mobileNumber: errorMsg }));
            showToast(errorMsg, "error");
        }
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        const fullAddress = `${formData.village}, ${formData.district}, ${formData.state}`;
        const formDataToSend = new FormData();
        formDataToSend.append('fullName', formData.fullName);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('mobileNumber', formData.mobileNumber); 
        formDataToSend.append('address', fullAddress);
        
        if (selectedImageFile) formDataToSend.append('profilePicture', selectedImageFile);

        try {
            const response = await api.put(`/profile/${initialUser.id}`, formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            updateUser({ ...initialUser, ...response.data }); 
            setIsEditing(false);
            setOtpFlow({ mobileNumber: { checking: false, checked: false, isAvailable: false, sent: false, verified: false, code: '' } });
            showToast("Profile updated successfully!", "success");
        } catch (err) { 
            showToast("Failed to update profile. Please try again.", "error"); 
            console.log(err)
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        const resetAddress = parseAddress(initialUser);
        setFormData({
            fullName: initialUser.fullName || '',
            email: initialUser.email || '',
            mobileNumber: cleanInitialMobile,
            state: resetAddress.state,
            district: resetAddress.district,
            village: resetAddress.village
        });
        setOtpFlow({ mobileNumber: { checking: false, checked: false, isAvailable: false, sent: false, verified: false, code: '' } });
        setErrors({ email: '', mobileNumber: '' }); 
        setImagePreview(null);
        setSelectedImageFile(null); 
    };

    const handlePasswordInputChange = (e) => setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const closePasswordModal = () => {
        setIsPasswordModalOpen(false);
        setPasswordStep(1);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordStatus({ type: '', message: '' });
        setShowOldPass(false);
        setShowNewPass(false);
        setShowConfPass(false);
    };

    const handleVerifyOldPassword = async () => {
        setPasswordStatus({ type: '', message: '' });
        if (!passwordData.oldPassword) return setPasswordStatus({ type: 'error', message: 'Please enter your current password.' });

        setIsPasswordVerifying(true);
        try {
            await api.post(`/profile/${initialUser.id}/verify-password`, { password: passwordData.oldPassword });
            setPasswordStatus({ type: '', message: '' });
            setPasswordStep(2);
        } catch (err) {
            setPasswordStatus({ type: 'error', message: "Password incorrect." });
            console.log(err)
        } finally {
            setIsPasswordVerifying(false);
        }
    };

    const handleSaveNewPassword = async () => {
        setPasswordStatus({ type: '', message: '' });
        if (passwordData.newPassword.length < 6) return setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters.' });
        if (passwordData.newPassword !== passwordData.confirmPassword) return setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });

        setIsPasswordSaving(true);
        try {
            await api.put(`/profile/${initialUser.id}/password`, {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
            setTimeout(() => closePasswordModal(), 2000);
        } catch (err) {
            setPasswordStatus({ type: 'error', message: "Failed to update password. Please try again." });
            console.log(err)
        } finally {
            setIsPasswordSaving(false);
        }
    };

    const isMobileChanged = cleanInitialMobile !== formData.mobileNumber && formData.mobileNumber.length === 10;
    const hasErrors = errors.email !== '' || errors.mobileNumber !== '';
    const isAddressIncomplete = !formData.state || !formData.district || !formData.village;
    const isSaveDisabled = hasErrors || isAddressIncomplete || isSubmitting || (isMobileChanged && !otpFlow.mobileNumber.verified);
    
    const availableDistricts = INDIA_LOCATIONS[formData.state] || [];
    const inputClass = "w-full bg-[#0B1120] text-white p-3 sm:p-3.5 rounded-xl border border-gray-700 text-sm sm:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all duration-300 disabled:opacity-60 disabled:bg-gray-800/30 disabled:cursor-not-allowed";

    return (
        <div className="min-h-screen bg-[#0B1120] pt-4 sm:pt-6 pb-12 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 right-1/4 w-125 h-125 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/4 w-125 h-125 bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>

            <div className={`w-full max-w-6xl bg-[#111827]/80 backdrop-blur-xl border border-gray-800 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative z-10 transition-all duration-700 transform ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                    
                    {/* LEFT COLUMN: Profile Pic */}
                    <div className="col-span-1 lg:col-span-3 flex flex-col items-center p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-gray-800/80 relative">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] ring-4 ring-[#0B1120] overflow-hidden group relative mb-4 sm:mb-6">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : initialUser.profilePicturePath ? (
                                <img src={getMediaUrl(initialUser.profilePicturePath)} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl sm:text-5xl font-black text-white uppercase drop-shadow-md">
                                    {initialUser.fullName ? initialUser.fullName.charAt(0) : 'U'}
                                </span>
                            )}

                            {isEditing && (
                                <div 
                                    onClick={() => fileInputRef.current.click()} 
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                                >
                                    <span className="text-2xl sm:text-3xl mb-1">📷</span>
                                    <span className="text-[10px] sm:text-xs font-bold text-white tracking-widest uppercase">Change</span>
                                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                                </div>
                            )}
                        </div>

                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight text-center px-2">{initialUser.fullName}</h2>
                        <div className="flex flex-col items-center gap-2 mt-3 sm:mt-4 w-full px-2">
                            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 w-full max-w-xs">
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 animate-pulse"></span> {initialUser.role}
                            </span>
                            <span className="bg-gray-800/50 border border-gray-700/50 text-gray-400 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center w-full max-w-xs">
                                ID: {initialUser.id}
                            </span>
                        </div>
                    </div>

                    {/* CENTER COLUMN: Details */}
                    <div className="col-span-1 lg:col-span-6 p-5 sm:p-8 lg:px-10 flex flex-col space-y-6 sm:space-y-8 relative">
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-white font-bold flex items-center gap-2 sm:gap-3 border-b border-gray-800 pb-2 text-lg sm:text-xl">
                                <span className="text-blue-500">👤</span> Personal Details
                            </h3>
                            <div>
                                <label className="block text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-1.5 ml-1">Full Name</label>
                                <input name="fullName" disabled={!isEditing} value={formData.fullName} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>

                        {/* CONTACT INFO */}
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-white font-bold flex items-center gap-2 sm:gap-3 border-b border-gray-800 pb-2 text-lg sm:text-xl">
                                <span className="text-indigo-500">📞</span> Contact Information
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-5 sm:gap-6">
                                {/* Mobile Number */}
                                <div>
                                    <label className="block text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-1.5 ml-1">Mobile Number</label>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2 sm:gap-3">
                                            <div className="relative w-full">
                                                <span className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 font-bold text-sm sm:text-base ${!isEditing ? 'text-gray-500' : 'text-white'}`}>+91</span>
                                                <input name="mobileNumber" type="text" maxLength="10" disabled={!isEditing} value={formData.mobileNumber} onChange={handleMobileChange} className={`${inputClass} pl-10 sm:pl-12 ${errors.mobileNumber ? 'border-red-500' : ''}`} />
                                            </div>
                                            
                                            {/* Show verification buttons ONLY if the number is different from the original */}
                                            {isEditing && isMobileChanged && !otpFlow.mobileNumber.verified && (
                                                !otpFlow.mobileNumber.checked ? (
                                                    <button type="button" disabled={formData.mobileNumber.length !== 10 || otpFlow.mobileNumber.checking} onClick={handleCheckExists} className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white px-3 sm:px-4 rounded-xl text-[10px] sm:text-xs font-bold transition-colors shrink-0 w-24 sm:w-32">
                                                        {otpFlow.mobileNumber.checking ? 'Checking...' : 'Check'}
                                                    </button>
                                                ) : otpFlow.mobileNumber.isAvailable ? (
                                                    <button type="button" onClick={handleSendOtp} className="bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 rounded-xl text-[10px] sm:text-xs font-bold transition-colors shrink-0 w-24 sm:w-32">
                                                        {otpFlow.mobileNumber.sent ? 'Resend OTP' : 'Send OTP'}
                                                    </button>
                                                ) : (
                                                    <button type="button" disabled className="bg-red-500/20 text-red-400 px-3 sm:px-4 rounded-xl text-[10px] sm:text-xs font-bold shrink-0 w-24 sm:w-32 cursor-not-allowed">
                                                        Exists
                                                    </button>
                                                )
                                            )}
                                            {isEditing && isMobileChanged && otpFlow.mobileNumber.verified && (
                                                <div className="bg-green-500/20 text-green-400 px-2 sm:px-4 rounded-xl flex items-center justify-center shrink-0 w-24 sm:w-32 text-[10px] sm:text-xs font-bold border border-green-500/30">
                                                    ✓ Verified
                                                </div>
                                            )}
                                        </div>
                                        {/* Display specific error underneath the mobile input */}
                                        {errors.mobileNumber && <p className="text-red-400 text-[10px] uppercase font-bold ml-1">{errors.mobileNumber}</p>}
                                    </div>
                                    
                                    <div className={`overflow-hidden transition-all duration-300 ${isEditing && isMobileChanged && otpFlow.mobileNumber.sent && !otpFlow.mobileNumber.verified ? 'max-h-20 mt-2 sm:mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="flex gap-2 sm:gap-3">
                                            <input placeholder="6-digit OTP" maxLength="6" value={otpFlow.mobileNumber.code} onChange={(e) => setOtpFlow(prev => ({ ...prev, mobileNumber: { ...prev.mobileNumber, code: e.target.value.replace(/\D/g, '') } }))} className={`${inputClass} text-center tracking-widest`} />
                                            <button type="button" onClick={handleVerifyOtp} className="bg-green-600 hover:bg-green-500 text-white px-4 sm:px-6 rounded-xl text-sm font-bold transition shrink-0">Verify</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Email Address */}
                                <div>
                                    <label className=" text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-1.5 ml-1 flex justify-between">
                                        <span>Email Address <span className="text-gray-600 normal-case ml-1">(Optional)</span></span>
                                    </label>
                                    <div className="relative w-full">
                                        <input name="email" type="email" disabled={!isEditing} value={formData.email} onChange={handleChange} placeholder="example@gmail.com" className={`${inputClass} ${errors.email ? 'border-red-500' : ''}`} />
                                    </div>
                                    {errors.email && <p className="text-red-400 text-[10px] uppercase font-bold ml-1 mt-1">{errors.email}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-white font-bold flex items-center gap-2 sm:gap-3 border-b border-gray-800 pb-2 text-lg sm:text-xl">
                                <span className="text-red-500 text-xl">📍</span> Delivery Address
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <CustomSelect name="state" value={formData.state} options={Object.keys(INDIA_LOCATIONS)} placeholder="Select State" onChange={handleChange} disabled={!isEditing} />
                                <CustomSelect name="district" value={formData.district} options={availableDistricts} placeholder="Select District" onChange={handleChange} disabled={!isEditing || !formData.state} />
                            </div>
                            <input type="text" name="village" disabled={!isEditing} value={formData.village} onChange={handleChange} placeholder="Village / City / Street Name" className={inputClass} />
                        </div>

                        <div className="pt-5 sm:pt-6 border-t border-gray-800 flex flex-col sm:flex-row gap-3 sm:gap-4 mt-auto">
                            {!isEditing ? (
                                <button onClick={() => setIsEditing(true)} className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base shadow-[0_10px_20px_-10px_rgba(59,130,246,0.6)] transform hover:-translate-y-1 transition-all duration-300">
                                    Edit Profile
                                </button>
                            ) : (
                                <>
                                    <button onClick={handleCancel} disabled={isSubmitting} className="w-full sm:w-1/3 bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSave} 
                                        disabled={isSaveDisabled} 
                                        className={`w-full sm:w-2/3 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base text-white transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${isSaveDisabled ? 'bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-500/25 transform hover:-translate-y-1'}`}
                                    >
                                        {isSubmitting ? 'Saving...' : isSaveDisabled ? 'Fill required fields to Save' : 'Save Changes'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="col-span-1 lg:col-span-3 p-5 sm:p-8 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-gray-800/80 bg-gray-900/30 rounded-b-2xl sm:rounded-b-3xl lg:rounded-bl-none lg:rounded-r-3xl">
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-white font-bold flex items-center gap-2 sm:gap-3 border-b border-gray-800 pb-2 text-lg sm:text-xl">
                                <span className="text-yellow-500 text-xl">🔒</span> Security
                            </h3>
                            <p className="text-gray-400 text-[11px] sm:text-xs leading-relaxed mb-3 sm:mb-4">
                                Keep your account secure. Ensure you use a strong password with letters, numbers, and symbols.
                            </p>
                            <button 
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="w-full bg-[#111827] border border-gray-700 hover:border-yellow-500 text-gray-300 hover:text-white py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2 group"
                            >
                                <span>Change Password</span>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* PASSWORD RESET MODAL */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#111827] border border-gray-700 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative transition-all duration-300">
                        {passwordStatus.message && (
                            <div className={`mb-5 sm:mb-6 p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 ${passwordStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                <span>{passwordStatus.type === 'error' ? '⚠️' : '✓'}</span> {passwordStatus.message}
                            </div>
                        )}

                        {passwordStep === 1 ? (
                            <>
                                <h3 className="text-xl sm:text-2xl font-black text-white mb-1.5 sm:mb-2">Verify Password</h3>
                                <p className="text-gray-400 text-[10px] sm:text-xs mb-5 sm:mb-6">Please enter your current password to continue.</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1">Current Password</label>
                                        <div className="relative">
                                            <input type={showOldPass ? "text" : "password"} name="oldPassword" value={passwordData.oldPassword} onChange={handlePasswordInputChange} disabled={isPasswordVerifying} className={`${inputClass} pr-12`} placeholder="Enter current password" />
                                            <button type="button" onClick={() => setShowOldPass(!showOldPass)} disabled={isPasswordVerifying} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50">
                                                {showOldPass ? "👁️" : "🙈"}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-3 sm:pt-4">
                                        <button onClick={closePasswordModal} disabled={isPasswordVerifying} className="w-1/3 py-3 rounded-xl font-bold text-sm sm:text-base text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition disabled:opacity-50">Cancel</button>
                                        <button onClick={handleVerifyOldPassword} disabled={isPasswordVerifying || !passwordData.oldPassword} className="w-2/3 py-3 rounded-xl font-bold text-sm sm:text-base text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed">
                                            {isPasswordVerifying ? 'Verifying...' : 'Verify'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-xl sm:text-2xl font-black text-white mb-1.5 sm:mb-2">Set New Password</h3>
                                <p className="text-gray-400 text-[10px] sm:text-xs mb-5 sm:mb-6">Create a secure new password for your account.</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                                        <div className="relative">
                                            <input type={showNewPass ? "text" : "password"} name="newPassword" value={passwordData.newPassword} onChange={handlePasswordInputChange} disabled={isPasswordSaving} className={`${inputClass} pr-12`} placeholder="Enter new password" />
                                            <button type="button" onClick={() => setShowNewPass(!showNewPass)} disabled={isPasswordSaving} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50">
                                                {showNewPass ? "👁️" : "🙈"}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1">Confirm New Password</label>
                                        <div className="relative">
                                            <input type={showConfPass ? "text" : "password"} name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordInputChange} disabled={isPasswordSaving} className={`${inputClass} pr-12`} placeholder="Confirm new password" />
                                            <button type="button" onClick={() => setShowConfPass(!showConfPass)} disabled={isPasswordSaving} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50">
                                                {showConfPass ? "👁️" : "🙈"}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-3 sm:pt-4">
                                        <button onClick={closePasswordModal} disabled={isPasswordSaving} className="w-1/3 py-3 rounded-xl font-bold text-sm sm:text-base text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition disabled:opacity-50">Cancel</button>
                                        <button onClick={handleSaveNewPassword} disabled={isPasswordSaving || passwordData.newPassword.length < 6 || passwordData.newPassword !== passwordData.confirmPassword} className="w-2/3 py-3 rounded-xl font-bold text-sm sm:text-base text-white bg-linear-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 shadow-lg shadow-yellow-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed">
                                            {isPasswordSaving ? 'Saving...' : 'Save Password'}
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

export default function Profile() {
    const { user, login } = useContext(AuthContext);
    const navigate = useNavigate();

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white p-6 relative">
                <div className="absolute top-0 right-1/4 w-75 h-75 bg-blue-600/10 rounded-full blur-[100px]"></div>
                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6 relative z-10"></div>
                <div className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400 animate-pulse mb-2 relative z-10">LOADING PROFILE...</div>
                <p className="text-gray-500 text-sm mb-8 relative z-10">If this takes too long, your session may have expired.</p>
                <button onClick={() => navigate('/login')} className="bg-[#111827] border border-gray-800 hover:border-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all relative z-10 shadow-lg hover:shadow-blue-500/20">
                    Return to Login
                </button>
            </div>
        );
    }

    return <ProfileForm initialUser={user} updateUser={login} />;
}