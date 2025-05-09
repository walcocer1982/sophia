import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { removeContact } from '../store/contactsSlice';

const ContactDetail = ({ contact }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  if (!contact) {
    return (
      <div className="text-center py-10 text-gray-500">
        Contacto no encontrado
      </div>
    );
  }

  const handleEdit = () => {
    navigate(`/edit/${contact.id}`);
  };

  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este contacto?')) {
      dispatch(removeContact(contact.id));
      navigate('/');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const getTypeColor = () => {
    switch (contact.type) {
      case 'trabajo':
        return 'bg-blue-100 text-blue-800';
      case 'familia':
        return 'bg-green-100 text-green-800';
      case 'social':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold">{contact.fullname}</h2>
        <span className={`px-3 py-1 rounded-full text-sm ${getTypeColor()}`}>
          {contact.type}
        </span>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex border-b pb-2">
          <span className="font-semibold w-32">Teléfono:</span>
          <span>{contact.phonenumber}</span>
        </div>
        
        <div className="flex border-b pb-2">
          <span className="font-semibold w-32">Email:</span>
          <span>{contact.email}</span>
        </div>
        
        {contact.company && (
          <div className="flex border-b pb-2">
            <span className="font-semibold w-32">Empresa:</span>
            <span>{contact.company}</span>
          </div>
        )}
        
        {contact.birthday && (
          <div className="flex border-b pb-2">
            <span className="font-semibold w-32">Cumpleaños:</span>
            <span>{new Date(contact.birthday).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleBack}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Volver
        </button>
        <button
          onClick={handleEdit}
          className="px-4 py-2 border border-yellow-300 rounded-md text-yellow-700 hover:bg-yellow-50"
        >
          Editar
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default ContactDetail; 