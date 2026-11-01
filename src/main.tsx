import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Diagnostics } from './Diagnostics';
import { App } from './App';
const queryClient = new QueryClient();
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    {window.location.pathname.replace(/\/$/, '') === '/diagnostics' ? <Diagnostics /> : <App />}
  </QueryClientProvider>,
);
