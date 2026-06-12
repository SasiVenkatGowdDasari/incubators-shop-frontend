import { createContext, useState, useEffect } from 'react';

// 1. Create and EXPORT the context
// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext();

// 2. Create and EXPORT the provider
export const CartProvider = ({ children }) => {
    
    // Initialize state by checking localStorage first
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('incubatorCart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    // Whenever the cart changes, save it to localStorage
    useEffect(() => {
        localStorage.setItem('incubatorCart', JSON.stringify(cart));
    }, [cart]);

    // Add item to cart
    const addToCart = (product) => {
        setCart((prevCart) => {
            // Check if it already exists to prevent duplicates
            const existingItem = prevCart.find((item) => item.id === product.id);
            if (existingItem) return prevCart; 
            
            // Add to array with a starting quantity of 1
            return [...prevCart, { ...product, cartQuantity: 1 }];
        });
    };

    // Increase or Decrease quantity
    const updateQuantity = (productId, amount) => {
        setCart((prevCart) =>
            prevCart.map((item) => {
                if (item.id === productId) {
                    // Prevent quantity from dropping below 1
                    const newQuantity = Math.max(1, item.cartQuantity + amount);
                    return { ...item, cartQuantity: newQuantity };
                }
                return item;
            })
        );
    };

    // Remove item entirely
    const removeFromCart = (productId) => {
        setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
    };

    // Wipe cart clean after successful purchase
    const clearCart = () => setCart([]);

    return (
        <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};