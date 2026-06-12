import { useState} from 'react';
import api from '../services/api';

export default function ReviewSection({ productId, userId, onClose }) {
    // const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const submitReview = async () => {
        try {
            await api.post('/reviews', { productId, userId, rating, comment });
            alert("Review submitted!");
            onClose(); // Close modal after success
        } catch (err) {
            alert("Failed to submit review",err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 p-6 rounded-xl text-white w-full max-w-lg shadow-2xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Write a Review</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <select onChange={(e) => setRating(e.target.value)} className="bg-gray-700 p-2 mb-3 w-full rounded border border-gray-600">
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                </select>
                
                <textarea 
                    placeholder="Share your experience with this product..." 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3 bg-gray-700 rounded mb-4 h-32 border border-gray-600 focus:ring-2 focus:ring-blue-500"
                />
                
                <button onClick={submitReview} className="w-full bg-blue-600 py-3 rounded font-bold hover:bg-blue-500 transition">
                    Submit Review
                </button>
            </div>
        </div>
    );
}