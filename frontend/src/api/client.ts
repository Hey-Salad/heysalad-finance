import axios from 'axios';
import { DEV_TOKEN_STORAGE_KEY } from '../constants/auth';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true
});

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(DEV_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

client.interceptors.request.use((config) => {
  const token = getStoredToken() ?? import.meta.env.VITE_DEV_AUTH_TOKEN ?? '';
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = token;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO: trigger auth workflow when ready
    }
    return Promise.reject(error);
  }
);

export default client;
