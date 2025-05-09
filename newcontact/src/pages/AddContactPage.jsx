import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { addContact } from '../store/contactsSlice';
import ContactForm from '../components/ContactForm';

const AddContactPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.contacts);

  const handleSubmit = async (contactData) => {
    try {
      await dispatch(addContact(contactData)).unwrap();
      navigate('/');
    } catch (err) {
      console.error('Error al crear contacto:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Añadir Contacto</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <ContactForm onSubmit={handleSubmit} isLoading={loading} />
    </div>
  );
};

export default AddContactPage; 