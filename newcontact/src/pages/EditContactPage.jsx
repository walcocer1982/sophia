import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchContactById, editContact } from '../store/contactsSlice';
import ContactForm from '../components/ContactForm';

const EditContactPage = () => {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentContact, loading, error } = useAppSelector((state) => state.contacts);

  useEffect(() => {
    if (id) {
      dispatch(fetchContactById(Number(id)));
    }
  }, [dispatch, id]);

  const handleSubmit = async (contactData) => {
    try {
      await dispatch(editContact({ id: Number(id), contactData })).unwrap();
      navigate(`/contact/${id}`);
    } catch (err) {
      console.error('Error al actualizar contacto:', err);
    }
  };

  if (loading && !currentContact) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">Cargando datos del contacto...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Editar Contacto</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {currentContact && (
        <ContactForm
          initialData={currentContact}
          onSubmit={handleSubmit}
          isLoading={loading}
        />
      )}
    </div>
  );
};

export default EditContactPage; 