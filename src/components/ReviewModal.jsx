import { useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext'; // <-- ADDED

export default function ReviewModal({ productId, orderId, onClose, onSave }) {
    const { user } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext); // <-- ADDED

    // Form States
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [files, setFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Animation State
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // Trigger entrance animation shortly after mounting
        const timer = setTimeout(() => setIsMounted(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        // Trigger exit animation before actually unmounting
        setIsMounted(false);
        setTimeout(() => onClose(), 300);
    };

    const handleFileChange = (e) => {
        // Convert FileList to Array
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const removeFile = (indexToRemove) => {
        setFiles(files.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("productId", productId);
        formData.append("orderId", orderId);
        formData.append("userId", user.id);
        formData.append("rating", rating);
        formData.append("comment", comment);

        for (let i = 0; i < files.length; i++) {
            formData.append("files", files[i]);
        }

        try {
            await api.post('/reviews/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast("Review submitted successfully!", "success");
            onSave();
            handleClose();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data || err.message;
            if (typeof errorMsg === 'string' && errorMsg.includes("File too large")) {
                showToast(errorMsg, "error");
            } else {
                showToast("Failed to save review. Please compress your files.", "error");
            }
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className={`fixed inset-0 z-150 flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ease-out ${isMounted ? 'bg-[#0B1120]/80 backdrop-blur-md opacity-100' : 'bg-transparent opacity-0'}`}
            onClick={handleClose} // Clicking the dark background closes the modal
        >

            {/* Modal Container */}
            <div
                onClick={(e) => e.stopPropagation()} // Prevents clicks inside the box from closing it
                className={`bg-[#111827] border border-gray-800 rounded-3xl w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative flex flex-col max-h-[80vh] transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] transform ${isMounted ? 'scale-100 translate-y-0' : 'scale-95 translate-y-12'}`}
            >
                {/* Floating Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-gray-800/80 text-gray-400 hover:text-white hover:bg-red-500 hover:rotate-90 transition-all duration-300 z-50 shadow-lg"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                {/* Scrollable Form Content */}
                <div className="overflow-y-auto custom-scrollbar w-full relative z-10 rounded-3xl">

                    {/* Decorative Background Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-blue-600/10 blur-[60px] pointer-events-none z-0"></div>

                    <form onSubmit={handleSubmit} className="p-6 sm:p-8 relative z-10 pt-10">

                        <div className="text-center mb-8">
                            <span className="text-4xl mb-3 block drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">✍️</span>
                            <h2 className="text-2xl font-black text-white tracking-wide">Rate Your Experience</h2>
                            <p className="text-gray-400 text-sm mt-1">Share your thoughts to help other buyers.</p>
                        </div>

                        {/* Interactive Star Rating */}
                        <div className="flex justify-center gap-2 mb-8">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setRating(s)}
                                    onMouseEnter={() => setHoverRating(s)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className={`text-5xl transition-all duration-200 transform hover:scale-110 focus:outline-none ${s <= (hoverRating || rating)
                                            ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]'
                                            : 'text-gray-700 hover:text-gray-600'
                                        }`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>

                        {/* Review Textarea */}
                        <div className="mb-6">
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Your Review</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full bg-[#0B1120] text-white border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 p-4 rounded-2xl h-32 resize-none transition-all duration-300 outline-none custom-scrollbar"
                                placeholder="What did you love about this incubator?"
                                required
                            />
                        </div>

                        {/* Custom File Upload Area */}
                        <div className="mb-8">
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Attach Media (Optional)</label>

                            <div className="relative group">
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-700 hover:border-blue-500/50 rounded-2xl cursor-pointer bg-[#0B1120] hover:bg-blue-600/5 transition-all duration-300">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-8 h-8 mb-2 text-gray-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        <p className="text-sm text-gray-400 group-hover:text-gray-300 font-medium">Click to upload photos or videos</p>
                                    </div>
                                    <input type="file" multiple onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                                </label>
                            </div>

                            {/* File Previews / List */}
                            {files.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded-full border border-gray-700">
                                            <span className="truncate max-w-37.5">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(idx)}
                                                className="text-red-400 hover:text-red-300 font-bold ml-1 text-base leading-none"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="flex-1 bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white py-3.5 rounded-xl font-bold transition-all duration-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`flex-1 flex justify-center items-center py-3.5 rounded-xl font-bold text-white transition-all duration-300 shadow-lg ${isSubmitting
                                        ? 'bg-blue-600/50 cursor-not-allowed'
                                        : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Publishing...
                                    </>
                                ) : (
                                    'Publish Review'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}