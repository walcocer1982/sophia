import React from 'react';
import { useAppDispatch } from '../hooks/redux';
import { removeContact, setCurrentContact } from '../store/contactsSlice';
import { useNavigate } from 'react-router-dom';

const ContactItem = ({ contact }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleEdit = () => {
    dispatch(setCurrentContact(contact));
    navigate(`/edit/${contact.id}`);
  };

  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este contacto?')) {
      dispatch(removeContact(contact.id));
    }
  };

  const handleView = () => {
    dispatch(setCurrentContact(contact));
    navigate(`/contact/${contact.id}`);
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
    <div className="border rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold" onClick={handleView} role="button">{contact.fullname}</h3>
        <span className={`px-2 py-1 rounded text-xs ${getTypeColor()}`}>
          {contact.type}
        </span>
      </div>
      
      <div className="text-gray-600 mb-1">{contact.phonenumber}</div>
      <div className="text-gray-600 mb-3">{contact.email}</div>
      
      <div className="flex justify-end space-x-2">
        <button 
          onClick={handleView}
          className="text-blue-600 hover:text-blue-800"
        >
          Ver
        </button>
        <button 
          onClick={handleEdit}
          className="text-yellow-600 hover:text-yellow-800"
        >
          Editar
        </button>
        <button 
          onClick={handleDelete}
          className="text-red-600 hover:text-red-800"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default ContactItem; 