import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import styles from './Layout.module.css';
import { AnimatedList } from './ui/animated-list';

function Layout() {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2 className={styles.logo}>Kuali CRM</h2>
        <nav className={styles.nav}>
          <AnimatedList delay={200} className="w-full">
            <Link to="/" className={styles.navLink}>Dashboard</Link>
            <Link to="/companies" className={styles.navLink}>Empresas</Link>
            <Link to="/leads" className={styles.navLink}>Leads</Link>
            <Link to="/contacts" className={styles.navLink}>Contactos</Link>
            <Link to="/templates" className={styles.navLink}>Plantillas</Link>
            <Link to="/config" className={styles.navLink}>Configuración</Link>
          </AnimatedList>
        </nav>
      </aside>
      <div className={styles.main}>
        <header className={styles.header}>
          <span>Bienvenido, Usuario</span>
        </header>
        <section className={styles.content}>
          <Outlet />
        </section>
      </div>
    </div>
  );
}

export default Layout; 