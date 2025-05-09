import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from '../components/Table.module.css';

function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api.get('/templates');
        setTemplates(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  if (loading) return <p>Cargando plantillas...</p>;
  if (error) return <p>Error al cargar plantillas: {error.message}</p>;

  return (
    <div className={styles.tableContainer}>
      <h1 className={styles.tableHeader}>Plantillas</h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Mensaje</th>
          </tr>
        </thead>
        <tbody>
          {templates.map(template => (
            <tr key={template.id}>
              <td>{template.id}</td>
              <td>{template.name}</td>
              <td>{template.body || template.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Templates; 