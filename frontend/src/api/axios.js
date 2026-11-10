import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL,
  timeout: 120000, // 2 minutes for LLM generation and embedding
  headers: {
    'Accept': 'application/json',
  },
});

// Response interceptor to normalize error responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred.';
    let code = 'UNKNOWN_ERROR';
    let details = null;
    let statusCode = error.response?.status;

    if (!error.response) {
      // Network failure / backend offline
      message = `Cannot reach backend at ${baseURL}. Ensure the FastAPI server is running.`;
      code = 'NETWORK_ERROR';
    } else if (error.response.data) {
      const data = error.response.data;

      // AppError format: { error: { code, message, details } }
      if (data.error) {
        message = data.error.message || message;
        code = data.error.code || code;
        details = data.error.details || null;
      }
      // HTTPException format: { detail: "..." or { message: "...", existing_document_id: "..." } }
      else if (data.detail) {
        if (typeof data.detail === 'string') {
          message = data.detail;
        } else if (typeof data.detail === 'object') {
          message = data.detail.message || JSON.stringify(data.detail);
          details = data.detail;
        }
      }
    }

    const enhancedError = new Error(message);
    enhancedError.code = code;
    enhancedError.status = statusCode;
    enhancedError.details = details;
    enhancedError.originalError = error;

    return Promise.reject(enhancedError);
  }
);

export default apiClient;
export { baseURL };

