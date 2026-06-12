import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Smoothly scroll to the top of the window every time the URL path changes
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'instant' 
        });
    }, [pathname]);

    return null;
}