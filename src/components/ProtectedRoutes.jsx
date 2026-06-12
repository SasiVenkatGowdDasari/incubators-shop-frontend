import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// 1. GUEST ROUTE: Prevents logged-in users from seeing Login/Register
export const GuestRoute = () => {
    const { user } = useContext(AuthContext);
    
    // If they are logged in, send them to Home (or their respective dashboard)
    if (user) {
        return <Navigate to="/" replace />;
    }
    
    // If nobody is logged in, let them access the route
    return <Outlet />;
};

// 2. CUSTOMER ROUTE: Only for standard users
export const CustomerRoute = () => {
    const { user } = useContext(AuthContext);

    // If nobody is logged in, send to Login
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    // If an Admin tries to access Cart/Orders, redirect them to the Admin page
    if (user.role === 'ADMIN') {
        return <Navigate to="/admin" replace />;
    }

    // Otherwise, they are a customer, let them in
    return <Outlet />;
};

// 3. ADMIN ROUTE: Only for Admins
export const AdminRoute = () => {
    const { user } = useContext(AuthContext);

    // If nobody is logged in, send to Login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If a Customer tries to access /admin, redirect to Home
    if (user.role !== 'ADMIN') {
        return <Navigate to="/" replace />;
    }

    // Otherwise, they are an admin, let them in
    return <Outlet />;
};

// 4. SHARED AUTH ROUTE: For routes BOTH Admin and Customer need (like Profile)
export const SharedAuthRoute = () => {
    const { user } = useContext(AuthContext);

    // If nobody is logged in, send to Login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};