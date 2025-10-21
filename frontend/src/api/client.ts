import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true
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
