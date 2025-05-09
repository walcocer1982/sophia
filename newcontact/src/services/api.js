import axios from 'axios';

// Usamos el proxy configurado en vite.config.js para evitar problemas de CORS
const API_URL = '/api/contacts';

const api = axios.create({
  baseURL: API_URL,
});

export const getContacts = async () => {
  try {
    const response = await api.get('/');
    return response.data;
  } catch (error) {
    console.error('Error al obtener contactos:', error);
    throw error;
  }
};

export const getContact = async (id) => {
  try {
    const response = await api.get(`/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener contacto ${id}:`, error);
    throw error;
  }
};

export const createContact = async (contactData) => {
  try {
    const response = await api.post('/', contactData);
    return response.data;
  } catch (error) {
    console.error('Error al crear contacto:', error);
    throw error;
  }
};

export const updateContact = async (id, contactData) => {
  try {
    const response = await api.put(`/${id}`, contactData);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar contacto ${id}:`, error);
    throw error;
  }
};

export const deleteContact = async (id) => {
  try {
    await api.delete(`/${id}`);
  } catch (error) {
    console.error(`Error al eliminar contacto ${id}:`, error);
    throw error;
  }
}; 