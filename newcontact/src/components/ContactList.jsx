import React, { useState, useEffect } from 'react';
import ContactItem from './ContactItem';

const ContactList = ({ contacts, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [typeFilter, setTypeFilter] = useState('todos');

  useEffect(() => {
    let filtered = [...contacts];
    
    // Filtrar por tipo
    if (typeFilter !== 'todos') {
      filtered = filtered.filter(contact => contact.type === typeFilter);
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        contact =>
          contact.fullname.toLowerCase().includes(term) ||
          contact.email.toLowerCase().includes(term) ||
          contact.phonenumber.includes(term)
      );
    }
    
    setFilteredContacts(filtered);
  }, [contacts, searchTerm, typeFilter]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleTypeChange = (e) => {
    setTypeFilter(e.target.value);
  };

  if (loading) {
    return <div className="text-center py-10">Cargando contactos...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-grow">
          <input
            type="text"
            placeholder="Buscar contactos..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <select
            value={typeFilter}
            onChange={handleTypeChange}
            className="w-full md:w-auto p-2 border rounded-md"
          >
            <option value="todos">Todos los tipos</option>
            <option value="trabajo">Trabajo</option>
            <option value="familia">Familia</option>
            <option value="social">Social</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>

      {filteredContacts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {contacts.length === 0
            ? 'No hay contactos disponibles'
            : 'No se encontraron contactos con los filtros actuales'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <ContactItem key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactList; 