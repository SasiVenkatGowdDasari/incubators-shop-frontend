import axios from 'axios';

// Create a central Axios instance pointing to your Spring Boot backend
const api = axios.create({
    // If the VITE environment variable exists (Render), use it and append /api. 
    // Otherwise, fall back to your local laptop environment!
    baseURL: import.meta.env.VITE_API_BASE_URL 
        ? `${import.meta.env.VITE_API_BASE_URL}/api` 
        : 'http://localhost:8080/api',
    
    headers: {
        'Content-Type': 'application/json',
    },
    
    // (Recommended) Ensures secure cookies/login tokens work across different domains
    withCredentials: true 
});

export default api;