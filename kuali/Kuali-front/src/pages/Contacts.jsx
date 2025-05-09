import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import styles from '../components/Table.module.css';

function Contacts() {
  const {
    data: contacts = [],
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get('/contacts').then(res => res.data)
  });

  if (isLoading) return <p>Cargando contactos...</p>;
  if (isError)   return <p>Error al cargar contactos: {error.message}</p>;

  return (
    <div className={styles.tableContainer}>
      <h1 className={styles.tableHeader}>Contactos</h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(contact => (
            <tr key={contact.id}>
              <td>{contact.id}</td>
              <td>{contact.name}</td>
              <td>{contact.phone}</td>
              <td>{contact.email || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Contacts; 