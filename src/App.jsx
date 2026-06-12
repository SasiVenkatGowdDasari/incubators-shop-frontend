import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Cart from './pages/Cart';
import Register from './pages/Register';
import ProductDetails from './pages/ProductDetails';
import MyOrders from './pages/MyOrders';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Footer from './components/Footer';
import AllProducts from './pages/AllProducts';
import ScrollToTop from './components/ScrollToTop';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext'; // <-- ADDED THIS IMPORT

// Import the Route Guards
import { GuestRoute, CustomerRoute, AdminRoute, SharedAuthRoute } from './components/ProtectedRoutes';

export default function App() {
  return (
    // Wrap the entire Router inside the ToastProvider and ConfirmProvider
    <ToastProvider>
      <ConfirmProvider> {/* <-- ADDED WRAPPER HERE */}
        <Router>
          <ScrollToTop/>
          <Navbar/>
          <div className="min-h-screen bg-gray-100 pt-16">
            <Routes>
              
              {/* =========================================
                  PUBLIC ROUTES (Anyone can access) 
              ========================================= */}
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<AllProducts />} />
              <Route path="/product/:id" element={<ProductDetails />} />

              {/* =========================================
                  GUEST ROUTES (Only accessible if NOT logged in) 
              ======================================== */}
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* =========================================
                  CUSTOMER ROUTES (Only accessible by Customers) 
              ======================================== */}
              <Route element={<CustomerRoute />}>
                <Route path="/cart" element={<Cart />} />
                <Route path="/my-orders" element={<MyOrders />} />
              </Route>

              {/* =========================================
                  ADMIN ROUTES (Only accessible by Admins) 
              ======================================== */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              {/* =========================================
                  SHARED AUTH ROUTES (Admin & Customer) 
              ======================================== */}
              <Route element={<SharedAuthRoute />}>
                <Route path="/profile" element={<Profile />} />
              </Route>

            </Routes>
          </div>
          <Footer />
        </Router>
      </ConfirmProvider> {/* <-- CLOSED WRAPPER HERE */}
    </ToastProvider>
  );
}