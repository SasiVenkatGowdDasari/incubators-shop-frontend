import { useState, useEffect, useCallback, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import { ToastContext } from '../context/ToastContext';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const getMediaUrl = (urlStr) => {
    if (!urlStr) return '';
    const firstUrl = urlStr.split(',')[0].trim();
    return firstUrl.startsWith('http') ? firstUrl : BACKEND_URL + firstUrl;
};

export default function ManageInventory() {
    const { showToast } = useContext(ToastContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        id: null, title: '', description: '', actualPrice: '', currentPrice: '', stockQuantity: '', material: '', type: '', capacity: '', warranty: '', shippingOptions: '', active: true
    });

    // Holds URLs already stored in the DB
    const [existingImages, setExistingImages] = useState([]);
    const [existingVideos, setExistingVideos] = useState([]);
    
    // Holds actual File objects selected from the computer
    const [newImages, setNewImages] = useState([]);
    const [newVideos, setNewVideos] = useState([]);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const response = await api.get('/products');
                const sortedProducts = response.data.sort((a, b) => b.id - a.id);
                setProducts(sortedProducts);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        loadProducts();
    }, [refreshKey]);

    const openAddModal = useCallback(() => {
        setFormData({ id: null, title: '', description: '', actualPrice: '', currentPrice: '', stockQuantity: '', material: '', type: 'Fully Automatic', capacity: '', warranty: '', shippingOptions: '', active: true });
        setExistingImages([]); 
        setExistingVideos([]); 
        setNewImages([]); 
        setNewVideos([]);
        setIsEditMode(false);
        setIsModalOpen(true);
    }, []);

    const openEditModal = useCallback((product) => {
        setFormData({
            id: product.id, title: product.title || '', description: product.description || '', actualPrice: product.actualPrice || '', currentPrice: product.currentPrice || '', stockQuantity: product.stockQuantity || '', material: product.material || '', type: product.type || 'Fully Automatic', capacity: product.capacity || '', warranty: product.warranty || '', shippingOptions: product.shippingOptions || '', active: product.active !== undefined ? product.active : true
        });
        
        // Safely parse existing URLs from the database
        setExistingImages(product.imageUrl ? product.imageUrl.split(',').map(s => s.trim()).filter(Boolean) : []);
        setExistingVideos(product.videoUrl ? product.videoUrl.split(',').map(s => s.trim()).filter(Boolean) : []);
        
        setNewImages([]); 
        setNewVideos([]);
        setIsEditMode(true);
        setIsModalOpen(true);
    }, []);

    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId && products.length > 0) {
            const productToEdit = products.find(p => p.id.toString() === editId);
            if (productToEdit) {
                setTimeout(() => {
                    openEditModal(productToEdit);
                    setSearchParams({ tab: 'inventory' });
                }, 0);
            }
        }
    }, [products, searchParams, setSearchParams, openEditModal]);

    // ==========================================
    // DYNAMIC FILE HANDLERS (ADD vs EDIT logic)
    // ==========================================
    const handleNewImagesChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            if (isEditMode) {
                // Edit Mode: Append files securely so we don't lose pending files
                setNewImages(prev => [...prev, ...Array.from(e.target.files)]);
            } else {
                // Add Mode: Replace entirely like native HTML behavior
                setNewImages(Array.from(e.target.files));
            }
        }
        e.target.value = ''; // Reset input to allow re-selection
    };

    const handleNewVideosChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            if (isEditMode) {
                setNewVideos(prev => [...prev, ...Array.from(e.target.files)]);
            } else {
                setNewVideos(Array.from(e.target.files));
            }
        }
        e.target.value = '';
    };

    const removeNewImage = (indexToRemove) => {
        setNewImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const removeNewVideo = (indexToRemove) => {
        setNewVideos(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    // ==========================================

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let newImgUrls = [];
            let newVidUrls = [];

            // FETCH CLOUDINARY SIGNATURE ONCE FOR ENTIRE BATCH (Huge speed boost)
            let signature, timestamp, apiKey, cloudName;
            if (newImages.length > 0 || newVideos.length > 0) {
                const sigRes = await api.get('/cloudinary/sign');
                ({ signature, timestamp, apiKey, cloudName } = sigRes.data);
            }

            // 1. UPLOAD NEW IMAGES TO CLOUDINARY
            if (newImages.length > 0) {
                for (const file of newImages) {
                    const uploadData = new FormData();
                    uploadData.append("file", file);
                    uploadData.append("api_key", apiKey);
                    uploadData.append("timestamp", timestamp);
                    uploadData.append("signature", signature);
                    const cloudinaryRes = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, uploadData);
                    newImgUrls.push(cloudinaryRes.data.secure_url);
                }
            }

            // 2. UPLOAD NEW VIDEOS TO CLOUDINARY
            if (newVideos.length > 0) {
                for (const file of newVideos) {
                    const uploadData = new FormData();
                    uploadData.append("file", file);
                    uploadData.append("api_key", apiKey);
                    uploadData.append("timestamp", timestamp);
                    uploadData.append("signature", signature);
                    const cloudinaryRes = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, uploadData);
                    newVidUrls.push(cloudinaryRes.data.secure_url);
                }
            }

            // 3. COMBINE OLD AND NEW SAFELY
            // Existing URLs minus the ones the user clicked "X" on, plus the newly uploaded ones.
            const finalImageUrls = [...existingImages, ...newImgUrls].filter(Boolean).join(',');
            const finalVideoUrls = [...existingVideos, ...newVidUrls].filter(Boolean).join(',');

            // 4. SEND TEXT URLs TO BACKEND
            const payload = new URLSearchParams();
            
            Object.keys(formData).forEach(key => {
                if (key !== 'id' && formData[key] !== null && formData[key] !== undefined) {
                    payload.append(key, formData[key]);
                }
            });
            payload.append('imageUrls', finalImageUrls);
            payload.append('videoUrls', finalVideoUrls);

            // Using toString() forces Axios to send as application/x-www-form-urlencoded
            // This permanently prevents Tomcat 400 Bad Request errors on PUT mappings!
            const config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            if (isEditMode) {
                await api.put(`/products/${formData.id}`, payload.toString(), config);
                showToast('Product Updated Successfully!', 'success');
            } else {
                await api.post('/products', payload.toString(), config);
                showToast('Product Added Successfully!', 'success');
            }
            
            setIsModalOpen(false);
            setRefreshKey(p => p + 1);
        } catch (err) {
            console.error(err);
            showToast('Failed to save product. Please check your network connection.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="text-center text-gray-400 py-8">Loading Inventory...</div>;

    return (
        <div>
            <div className="bg-transparent md:bg-[#111827] border-0 md:border border-gray-800 rounded-xl overflow-hidden md:shadow-2xl">

                <div className="p-4 md:p-6 bg-[#111827] border border-gray-800 md:border-b rounded-xl md:rounded-none flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 md:mb-0">
                    <div>
                        <h2 className="font-extrabold text-2xl text-white">Inventory Catalog</h2>
                        <p className="text-gray-400 text-sm mt-1">Manage products, stock, and media</p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-lg font-bold shadow-lg transition flex items-center justify-center gap-2"
                    >
                        <span className="text-xl leading-none pb-0.5">+</span> Add Product
                    </button>
                </div>

                {/* MOBILE VIEW */}
                <div className="md:hidden flex flex-col gap-4">
                    {products.length === 0 ? (
                        <div className="px-6 py-12 text-center text-gray-500 bg-[#111827] rounded-xl">No products in inventory.</div>
                    ) : (
                        products.map((product) => (
                            <div key={product.id} className="bg-[#111827] border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 shrink-0 border border-gray-700 rounded-lg overflow-hidden bg-black flex items-center justify-center">
                                        {product.imageUrl ? (
                                            <img src={getMediaUrl(product.imageUrl)} className="w-full h-full object-cover opacity-80" alt="" />
                                        ) : (
                                            <span className="text-xs text-gray-600 font-bold uppercase">No Img</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col justify-center w-full">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-mono text-gray-500 font-bold mb-1">ID: #{product.id}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${product.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                                                {product.active ? 'Visible' : 'Hidden'}
                                            </span>
                                        </div>
                                        <p className="font-bold text-white leading-snug line-clamp-2 text-sm">{product.title}</p>
                                        <div className="mt-2">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase border ${product.stockQuantity > 10 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    product.stockQuantity > 0 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                {product.stockQuantity > 0 ? `${product.stockQuantity} In Stock` : 'Out of Stock'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-gray-500 font-bold">Type</span>
                                        <span className="text-xs font-bold text-blue-400 truncate">{product.type || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-gray-500 font-bold">Material</span>
                                        <span className="text-xs font-bold text-purple-400 truncate">{product.material || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-gray-500 font-bold">Capacity</span>
                                        <span className="text-xs font-bold text-indigo-400 truncate">{product.capacity || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-gray-500 font-bold">Performance</span>
                                        <span className="text-xs font-bold text-gray-300">
                                            <span className="text-yellow-400 mr-1">★ {product.rating || '0.0'}</span>
                                            ({product.totalPurchases || 0} Sales)
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end border-t border-gray-800 pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Price</span>
                                        <span className="font-extrabold text-white text-xl leading-none">₹{product.currentPrice}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditModal(product)} className="w-full rounded bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white flex items-center justify-center transition py-2 px-6 font-bold text-sm" title="Edit">✏️ Edit Status & Info</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* DESKTOP VIEW */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-800/50 text-gray-400">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Product Info</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Specifications</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Performance</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Price & Stock</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {products.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">No products found in inventory.</td></tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className={`hover:bg-gray-800/30 transition ${!product.active ? 'opacity-50 grayscale-30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 shrink-0 border border-gray-700 rounded-lg overflow-hidden bg-black flex items-center justify-center relative">
                                                    {!product.active && <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10"><span className="text-[10px] text-white font-bold uppercase">Hidden</span></div>}
                                                    {product.imageUrl ? (
                                                        <img src={getMediaUrl(product.imageUrl)} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition" alt="" />
                                                    ) : <span className="text-xs text-gray-600">No Img</span>}
                                                </div>
                                                <div className="flex flex-col max-w-62.5">
                                                    <span className="text-xs font-mono text-gray-500 font-bold mb-0.5">ID: #{product.id}</span>
                                                    <p className="font-bold text-white truncate text-base" title={product.title}>{product.title}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5 text-xs font-medium">
                                                <div className="flex items-center gap-2"><span className="text-gray-500 uppercase tracking-widest w-16">Type:</span><span className="text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded">{product.type || 'N/A'}</span></div>
                                                <div className="flex items-center gap-2"><span className="text-gray-500 uppercase tracking-widest w-16">Material:</span><span className="text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded">{product.material || 'N/A'}</span></div>
                                                <div className="flex items-center gap-2"><span className="text-gray-500 uppercase tracking-widest w-16">Capacity:</span><span className="text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded">{product.capacity || 'N/A'}</span></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2"><span className="text-yellow-400 text-lg">★</span><span className="text-gray-300 font-bold">{product.rating || '0.0'}</span><span className="text-gray-500 text-xs">/ 5.0</span></div>
                                                <div className="flex items-center gap-2 text-sm text-gray-400"><span className="text-gray-300">🛒 {product.totalPurchases || 0}</span><span>Sales</span></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-end gap-2"><span className="font-extrabold text-white text-lg">₹{product.currentPrice}</span>{product.actualPrice > product.currentPrice && (<span className="text-xs text-gray-500 line-through mb-1">₹{product.actualPrice}</span>)}</div>
                                                <div><span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border ${product.stockQuantity > 10 ? 'bg-green-500/10 text-green-400 border-green-500/20' : product.stockQuantity > 0 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{product.stockQuantity > 0 ? `${product.stockQuantity} IN STOCK` : 'OUT OF STOCK'}</span></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center">
                                                <button onClick={() => openEditModal(product)} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white font-bold text-xs transition" title="Edit Product">✏️ Edit Status & Info</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 md:p-6 backdrop-blur-md">
                    <div className="bg-[#111827] border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col relative custom-scrollbar">

                        <div className="sticky top-0 bg-[#111827] border-b border-gray-800/80 p-4 md:p-6 flex justify-between items-center z-20 backdrop-blur-sm">
                            <h2 className="text-xl md:text-2xl font-extrabold text-white">{isEditMode ? 'Edit Incubator Details' : 'Add New Incubator'}</h2>
                            <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="w-8 h-8 shrink-0 bg-black/40 hover:bg-red-500 text-gray-400 hover:text-white rounded-full flex items-center justify-center text-xl transition border border-gray-700 hover:border-red-500 disabled:opacity-50">&times;</button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

                            <div className="space-y-4 md:space-y-5 md:col-span-2">
                                <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Product Title</label><input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-black/50 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" /></div>
                                <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Detailed Description</label><textarea required rows="4" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black/50 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition resize-none custom-scrollbar" /></div>
                            </div>

                            <div className="space-y-4 md:space-y-5 bg-black/20 p-4 md:p-5 rounded-xl border border-gray-800">

                                <div className="border-b border-gray-700 pb-4 mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                    <h3 className="text-white font-bold text-lg">Pricing & Inventory</h3>

                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-widest shrink-0">Status:</span>

                                        <div className="relative inline-block w-32">
                                            <select
                                                value={formData.active}
                                                onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                                                className={`w-full appearance-none text-xs font-bold rounded-lg py-2 pl-3 pr-8 cursor-pointer outline-none transition-all shadow-sm ${formData.active
                                                        ? 'bg-green-500/10 text-green-400 border border-green-500/30 focus:border-green-500/60'
                                                        : 'bg-gray-800/50 text-gray-300 border border-gray-600 focus:border-gray-400'
                                                    }`}
                                            >
                                                <option value="true" className="bg-gray-900 text-green-400">Visible</option>
                                                <option value="false" className="bg-gray-900 text-gray-300">Hidden</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                                                <svg className={`w-3.5 h-3.5 ${formData.active ? 'text-green-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Original Price (₹)</label><input type="number" required value={formData.actualPrice} onChange={(e) => setFormData({ ...formData, actualPrice: e.target.value })} className="w-full bg-black/50 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 transition" /></div>
                                <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Selling Price (₹)</label><input type="number" required value={formData.currentPrice} onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })} className="w-full bg-black/50 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 transition" /></div>
                                <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Stock Quantity</label><input type="number" required value={formData.stockQuantity} onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })} className="w-full bg-black/50 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 transition" /></div>
                            </div>

                            <div className="space-y-4 md:space-y-5 bg-black/20 p-4 md:p-5 rounded-xl border border-gray-800">
                                <h3 className="text-white font-bold mb-4 border-b border-gray-700 pb-4 text-lg">Specifications</h3>
                                <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Capacity</label><input required value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} placeholder="e.g. 100 Eggs" className="w-full bg-black/50 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 transition" /></div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Type</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full appearance-none bg-black/50 border border-gray-700 text-white rounded-lg p-3 pr-10 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                                        >
                                            <option value="Fully Automatic" className="bg-gray-900 text-white">Fully Automatic</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Material</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={formData.material}
                                            onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                                            className="w-full appearance-none bg-black/50 border border-gray-700 text-white rounded-lg p-3 pr-10 focus:outline-none focus:border-blue-500 transition cursor-pointer"
                                        >
                                            <option value="Plywood" className="bg-gray-900 text-white">Plywood</option>
                                            <option value="Thermacole" className="bg-gray-900 text-white">Thermacole</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                <div className="space-y-0"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Warranty Info</label><input required value={formData.warranty} onChange={(e) => setFormData({ ...formData, warranty: e.target.value })} className="w-full bg-black/50 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 transition" /></div>
                                <div className="space-y-0"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Shipping Details</label><input required value={formData.shippingOptions} onChange={(e) => setFormData({ ...formData, shippingOptions: e.target.value })} className="w-full bg-black/50 border border-gray-700 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500 transition" /></div>
                            </div>

                            <div className="md:col-span-2 border-t border-gray-800/80 pt-6 md:pt-8 mt-2 md:mt-4">
                                <h3 className="text-white font-extrabold mb-4 md:mb-6 text-lg border-l-4 border-blue-500 pl-3">Media Management</h3>

                                {/* EXISTING MEDIA ROW (Displays when Editing) */}
                                {isEditMode && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
                                        {existingImages.length > 0 && (
                                            <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🖼️ Current Images</p>
                                                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                                    {existingImages.map((url, i) => (
                                                        <div key={i} className="relative w-20 md:w-24 h-20 md:h-24 shrink-0 border border-gray-700 rounded-lg overflow-hidden bg-black group">
                                                            <img src={getMediaUrl(url)} className="w-full h-full object-cover opacity-70 group-hover:opacity-40 transition" alt="" />
                                                            <button type="button" disabled={isSubmitting} onClick={() => setExistingImages(existingImages.filter(u => u !== url))} className="absolute inset-0 m-auto bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold opacity-0 group-hover:opacity-100 transition shadow-lg">&times;</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {existingVideos.length > 0 && (
                                            <div className="bg-black/30 p-4 rounded-xl border border-gray-800">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🎥 Current Videos</p>
                                                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                                    {existingVideos.map((url, i) => (
                                                        <div key={i} className="relative w-32 md:w-36 h-20 md:h-24 shrink-0 border border-gray-700 rounded-lg overflow-hidden bg-black group">
                                                            <video src={getMediaUrl(url)} className="w-full h-full object-cover opacity-70 group-hover:opacity-40 transition" />
                                                            <button type="button" disabled={isSubmitting} onClick={() => setExistingVideos(existingVideos.filter(u => u !== url))} className="absolute inset-0 m-auto bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold opacity-0 group-hover:opacity-100 transition shadow-lg">&times;</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* NEW MEDIA UPLOAD ROW */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-blue-900/10 p-4 md:p-5 rounded-xl border border-blue-900/30">
                                    
                                    {/* Image Upload Column */}
                                    <div>
                                        <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Upload New Images</label>
                                        
                                        <label className="flex items-center justify-center w-full bg-[#0B1120] border-2 border-dashed border-gray-700 hover:border-blue-500 text-gray-400 hover:text-white py-3.5 rounded-xl cursor-pointer transition-all mb-3 group">
                                            <span className="flex items-center gap-2 font-bold text-sm">
                                                <svg className="w-5 h-5 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                                {(!isEditMode && newImages.length > 0) ? 'Replace Selection' : 'Select Images'}
                                            </span>
                                            <input type="file" multiple accept="image/*" onChange={handleNewImagesChange} className="hidden" />
                                        </label>

                                        {newImages.length > 0 && (
                                            <div className="flex flex-col gap-2 pt-3 border-t border-blue-500/20 mt-3">
                                                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                                    Total Added: {newImages.length} Image{newImages.length > 1 ? 's' : ''}
                                                </div>
                                                {newImages.map((file, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-[#0B1120] border border-blue-500/30 px-3 py-2 rounded-lg shadow-sm">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <img src={URL.createObjectURL(file)} alt="preview" className="w-8 h-8 object-cover rounded bg-black shrink-0" />
                                                            <span className="text-xs text-gray-300 font-medium truncate pr-2">{file.name}</span>
                                                        </div>
                                                        <button type="button" disabled={isSubmitting} onClick={() => removeNewImage(idx)} className="text-red-400 hover:text-red-300 text-xl leading-none font-bold shrink-0">&times;</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Video Upload Column */}
                                    <div>
                                        <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Upload New Videos</label>
                                        
                                        <label className="flex items-center justify-center w-full bg-[#0B1120] border-2 border-dashed border-gray-700 hover:border-purple-500 text-gray-400 hover:text-white py-3.5 rounded-xl cursor-pointer transition-all mb-3 group">
                                            <span className="flex items-center gap-2 font-bold text-sm">
                                                <svg className="w-5 h-5 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                                {(!isEditMode && newVideos.length > 0) ? 'Replace Selection' : 'Select Videos'}
                                            </span>
                                            <input type="file" multiple accept="video/*" onChange={handleNewVideosChange} className="hidden" />
                                        </label>

                                        {newVideos.length > 0 && (
                                            <div className="flex flex-col gap-2 pt-3 border-t border-purple-500/20 mt-3">
                                                <div className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">
                                                    Total Added: {newVideos.length} Video{newVideos.length > 1 ? 's' : ''}
                                                </div>
                                                {newVideos.map((file, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-[#0B1120] border border-purple-500/30 px-3 py-2 rounded-lg shadow-sm">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <video src={URL.createObjectURL(file)} className="w-8 h-8 object-cover rounded bg-black shrink-0" />
                                                            <span className="text-xs text-gray-300 font-medium truncate pr-2">{file.name}</span>
                                                        </div>
                                                        <button type="button" disabled={isSubmitting} onClick={() => removeNewVideo(idx)} className="text-red-400 hover:text-red-300 text-xl leading-none font-bold shrink-0">&times;</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 mt-4 md:mt-6">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full py-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] text-lg transition duration-300 transform md:hover:-translate-y-0.5 flex justify-center items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Uploading Media & Publishing...
                                        </>
                                    ) : (
                                        isEditMode ? 'Save Changes' : 'Publish Product to Catalog'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}