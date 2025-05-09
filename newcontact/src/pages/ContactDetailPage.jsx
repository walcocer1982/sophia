import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchContactById } from '../store/contactsSlice';
import ContactDetail from '../components/ContactDetail';

const ContactDetailPage = () => {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { currentContact, loading, error } = useAppSelector((state) => state.contacts);

  useEffect(() => {
    if (id) {
      dispatch(fetchContactById(Number(id)));
    }
  }, [dispatch, id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">Cargando detalles del contacto...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Detalles del Contacto</h1>
      <ContactDetail contact={currentContact} />
    </div>
  );
};

export default ContactDetailPage; 