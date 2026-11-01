import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();
createRoot(document.getElementById('root')!).render(
  <StrictMode><QueryClientProvider client={queryClient}>
    <main><h1>NestFlow</h1><p>M1: core logic scaffold. Wallet actions will be added in a later milestone.</p></main>
  </QueryClientProvider></StrictMode>,
);
