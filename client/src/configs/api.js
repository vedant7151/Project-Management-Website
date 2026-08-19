import axios from 'axios'

const PRODUCTION_API = 'https://project-management-website-duhr.onrender.com/api'

const resolvedBaseUrl =
    import.meta.env.VITE_BASE_URL ||
    (import.meta.env.PROD ? PRODUCTION_API : 'http://localhost:5000/api')

if (!import.meta.env.VITE_BASE_URL && import.meta.env.PROD) {
    console.warn(
        `[API] VITE_BASE_URL is not defined; using ${PRODUCTION_API}. ` +
        'Set VITE_BASE_URL on Vercel to your backend /api URL.'
    )
}

const api = axios.create({
    baseURL: resolvedBaseUrl,
    timeout: 45000,
    headers: {
        'Content-Type': 'application/json',
    },
})

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
