import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy } from 'react';
import { ScreenBoundary } from './ScreenBoundary';
const Diagnostics = lazy(() => import('./Diagnostics').then(module => ({ default: module.Diagnostics })));
import { App } from './App';
const queryClient = new QueryClient();
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    {window.location.pathname.replace(/\/$/, '') === '/diagnostics' ? <ScreenBoundary><Diagnostics /></ScreenBoundary> : <App />}
  </QueryClientProvider>,
);
