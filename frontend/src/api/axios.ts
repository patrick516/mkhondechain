import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000",
});

// Attach token to every request automatically
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("mkhonde_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// If server returns 401 or 403 — token expired or invalid
// Clear storage and redirect to login
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("mkhonde_token");
      localStorage.removeItem("mkhonde_admin");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default instance;
