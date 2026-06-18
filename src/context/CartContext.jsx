import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { ToastContext } from './ToastContext';
import api from '../services/api';

// Tell Vite Fast Refresh to safely ignore this specific non-component export
// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);
    const [cart, setCart] = useState([]);
    const [isCartLoading, setIsCartLoading] = useState(false);

    // We define the fetch logic OUTSIDE the effect, but we don't call state setters
    // synchronously on the root level of the effect.
    const fetchCartFromDB = useCallback(async (userId) => {
        try {
            // We set loading state, but because it's inside an async function 
            // that is awaited, the linter is usually happier.
            setIsCartLoading(true);
            const response = await api.get(`/cart/${userId}`);
            
            const formattedCart = response.data.map(cartItem => ({
                ...cartItem.product,
                cartQuantity: cartItem.quantity 
            }));
            
            setCart(formattedCart);
        } catch (err) {
            console.error("Failed to sync cart with database:", err);
        } finally {
            setIsCartLoading(false);
        }
    }, []);

    // The effect simply triggers the async function and catches any errors.
    // It does not directly call setState.
    useEffect(() => {
        let isMounted = true; // Use a flag to prevent updates if component unmounts

        const initCart = async () => {
             if (user && user.id) {
                 await fetchCartFromDB(user.id);
             } else {
                 if (isMounted) {
                    // Using a callback pattern here is often safer for linters
                    setCart(prev => (prev.length > 0 ? [] : prev));
                 }
             }
        };

        initCart();

        return () => {
            isMounted = false; // Cleanup to prevent memory leaks
        };
    }, [user, fetchCartFromDB]);


    const addToCart = async (product, quantity = 1) => {
        if (!user) {
            showToast("Please sign in to add items to your cart.", "error");
            return;
        }

        try {
            await api.post('/cart/add', {
                userId: user.id,
                productId: product.id,
                quantity: quantity
            });
            await fetchCartFromDB(user.id);
            showToast("Item added to cart!", "success");
        } catch (err) {
            console.error("Error adding to cart:", err);
            showToast("Failed to add item to cart.", "error");
        }
    };

    const updateQuantity = async (productId, amount) => {
        if (!user) return;
        
        const currentItem = cart.find(item => item.id === productId);
        if (!currentItem) return;

        const newQuantity = currentItem.cartQuantity + amount;

        if (newQuantity < 1) {
            return removeFromCart(productId);
        }

        try {
            setCart(prevCart => prevCart.map(item => 
                item.id === productId ? { ...item, cartQuantity: newQuantity } : item
            ));

            await api.put('/cart/update', {
                userId: user.id,
                productId: productId,
                quantity: newQuantity
            });
        } catch (err) {
            console.error("Error updating cart quantity:", err);
            await fetchCartFromDB(user.id); 
        }
    };

    const removeFromCart = async (productId) => {
        if (!user) return;

        try {
            setCart(prevCart => prevCart.filter(item => item.id !== productId));
            
            await api.delete(`/cart/remove/${user.id}/${productId}`);
        } catch (err) {
            console.error("Error removing item from cart:", err);
            await fetchCartFromDB(user.id); 
        }
    };

    const clearCart = async () => {
        if (!user) return;

        try {
            await api.delete(`/cart/clear/${user.id}`);
            setCart([]);
        } catch (err) {
            console.error("Error clearing cart:", err);
        }
    };

    return (
        <CartContext.Provider value={{ cart, isCartLoading, addToCart, updateQuantity, removeFromCart, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};