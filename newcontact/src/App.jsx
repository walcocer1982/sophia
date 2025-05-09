import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';

import HomePage from './pages/HomePage';
import ContactDetailPage from './pages/ContactDetailPage';
import AddContactPage from './pages/AddContactPage';
import EditContactPage from './pages/EditContactPage';

// Importar estilos CSS
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-blue-700 text-white p-4 shadow-md">
            <div className="container mx-auto">
              <h1 className="text-2xl font-bold">Aplicación de Contactos</h1>
            </div>
          </header>
          
          <main className="py-6">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/contact/:id" element={<ContactDetailPage />} />
              <Route path="/add" element={<AddContactPage />} />
              <Route path="/edit/:id" element={<EditContactPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          <footer className="bg-gray-800 text-white p-4 mt-8">
            <div className="container mx-auto text-center">
              <p>© {new Date().getFullYear()} Aplicación de Contactos. Todos los derechos reservados.</p>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </Provider>
  );
}

export default App; 