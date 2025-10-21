import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/index.css';
import iconUrl from './public/icon.svg?url';
import DevAuthGate from './components/dev/DevAuthGate';

const ensureFavicon = () => {
  const existing = document.querySelector<HTMLLinkElement>("link[rel='icon']") || document.createElement('link');
  existing.rel = 'icon';
  existing.href = iconUrl;
  existing.type = 'image/svg+xml';
  if (!existing.parentElement) {
    document.head.appendChild(existing);
  }
};

ensureFavicon();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DevAuthGate>
          <App />
        </DevAuthGate>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
