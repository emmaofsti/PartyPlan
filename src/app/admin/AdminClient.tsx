'use client';

import Link from 'next/link';

export default function AdminClient() {
  return (
    <main className="main-content">
      <div className="admin-header">
        <h1>⚙️ Administrasjon</h1>
        <p className="text-muted">Administrer ansatte og vakter</p>
      </div>

      <div className="admin-nav">
        <Link href="/admin/employees" className="admin-nav-card card">
          <div className="admin-nav-icon">👥</div>
          <div>
            <h3>Ansatte</h3>
            <p>Opprett, rediger og administrer ansatte</p>
          </div>
          <span className="admin-nav-arrow">→</span>
        </Link>

        <Link href="/admin/shifts" className="admin-nav-card card">
          <div className="admin-nav-icon">📅</div>
          <div>
            <h3>Vakter</h3>
            <p>Opprett og administrer vakter</p>
          </div>
          <span className="admin-nav-arrow">→</span>
        </Link>
      </div>

      <style jsx>{`
        .admin-header {
          margin-bottom: var(--space-xl);
        }

        .admin-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 var(--space-sm) 0;
        }

        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .admin-nav-card {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          text-decoration: none;
          color: var(--color-text-primary);
        }

        .admin-nav-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg-input);
          border-radius: var(--radius-md);
        }

        .admin-nav-card h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 var(--space-xs) 0;
        }

        .admin-nav-card p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .admin-nav-arrow {
          margin-left: auto;
          font-size: 1.5rem;
          color: var(--color-text-muted);
          transition: transform var(--transition-fast);
        }

        .admin-nav-card:hover .admin-nav-arrow {
          transform: translateX(4px);
          color: var(--color-brand-primary);
        }
      `}</style>
    </main>
  );
}
