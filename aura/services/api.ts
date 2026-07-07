import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3002/v1",
});

// Add a request interceptor to attach the access token
API.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (user?.AccessToken) {
      config.headers.Authorization = `Bearer ${user.AccessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("currentUser");
      if (window.location.pathname !== "/Login") {
        window.location.href = "/Login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
