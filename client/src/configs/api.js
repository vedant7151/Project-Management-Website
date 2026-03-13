import axios from 'axios'

const resolvedBaseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:5000/api'

if (!import.meta.env.VITE_BASE_URL) {
    // Fallback helps local dev when env is missing, without changing API behavior when it is set.
    console.warn(
        '[API] VITE_BASE_URL is not defined; falling back to default http://localhost:5000/api. ' +
        'Set VITE_BASE_URL in your client env to match your backend URL.'
    )
}

const api = axios.create({
    baseURL: resolvedBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Centralized Error Handling Interceptor (Step 6 & 7)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error(
            'Central API Error:',
            error.response?.data?.message || error.message
        )
        return Promise.reject(error)
    }
)

export default api
