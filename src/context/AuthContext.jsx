import { createContext, useState } from 'react';

// 1. Create the Context
// Tell Vite's Fast Refresh linter to ignore this specific export
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

// 2. Create the Provider Component
export const AuthProvider = ({ children }) => {
    
    // Lazy Initialization: This checks localStorage exactly once when the app first loads
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('incubatorUser');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    // Login function: Saves user to state and local storage
    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('incubatorUser', JSON.stringify(userData));
    };

    // Logout function: Clears state and local storage
    const logout = () => {
        setUser(null);
        localStorage.removeItem('incubatorUser');
    };

    // We removed the loading state entirely, so we just return the Provider!
    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};