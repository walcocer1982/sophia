import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Crear y configurar el cliente de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mantén los datos "frescos" durante 5 minutos
      staleTime: 1000 * 60 * 5,
      // No volver a cargar al montar si los datos aún no han caducado
      refetchOnMount: false,
    },
  },
});

ReactDOM.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById('root')
); 