'use client';

import { Fragment, useState } from 'react';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!session) return null;

  const isAdmin = session.user.role === 'ADMIN';

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/profile', label: 'Min profil' },
  ];

  if (isAdmin) {
    navItems.push({ href: '/admin', label: 'Admin' });
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-main">
          {/* Mobile Menu Button */}
          <button
            className="navbar-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>

          <Link href="/dashboard" className="navbar-logo">
            <div className="relative h-8 w-auto aspect-[3/1]">
              <Image
                src="/logo-v1.png"
                alt="Party-plan Storo"
                width={120}
                height={40}
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="navbar-links desktop-only">
          {navItems.map((item, index) => (
            <Fragment key={item.href}>
              <Link
                href={item.href}
                className={`navbar-link ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
              >
                <span className="navbar-link-label">{item.label}</span>
              </Link>
              {index < navItems.length - 1 && <div className="navbar-separator" />}
            </Fragment>
          ))}
        </div>

        {/* Desktop User Menu */}
        <div className="navbar-user desktop-only">
          <span className="navbar-user-name">{session.user.name}</span>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn btn-ghost btn-sm">
            Logg ut
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMenuOpen && (
        <div className="mobile-menu">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-link ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="mobile-menu-divider" />
          <div className="mobile-user-info">
            <span className="text-sm text-muted">Logget inn som:</span>
            <span className="font-semibold">{session.user.name}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn btn-secondary btn-sm w-full mt-2"
          >
            Logg ut
          </button>
        </div>
      )}

      <style jsx>{`
        .navbar {
          background: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .navbar-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--space-md) var(--space-lg);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .navbar-main {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .navbar-toggle {
          display: none;
          background: none;
          border: none;
          color: var(--color-text-primary);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          text-decoration: none;
          color: var(--color-text-primary);
          font-weight: 600;
          font-size: 1.125rem;
        }

        .navbar-logo-icon {
          font-size: 1.5rem;
        }

        .navbar-links {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .navbar-separator {
            width: 1px;
            height: 20px;
            background-color: var(--color-border);
            margin: 0 var(--space-sm);
        }

        .navbar-link {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: all var(--transition-fast);
        }

        .navbar-link:hover {
          background: var(--color-bg-card);
          color: var(--color-text-primary);
        }

        .navbar-link.active {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(129, 140, 248, 0.1));
          color: var(--color-brand-secondary);
        }

        .navbar-user {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .navbar-user-name {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        /* Mobile Menu Styles */
        .mobile-menu {
          background: var(--color-bg-secondary);
          border-top: 1px solid var(--color-border);
          padding: var(--space-md);
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          animation: slideDown 0.2s ease-out;
        }

        .mobile-link {
          padding: var(--space-md);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          text-decoration: none;
          background: var(--color-bg-card);
        }

        .mobile-link.active {
          background: var(--color-brand-primary);
          color: white;
        }

        .mobile-menu-divider {
          height: 1px;
          background: var(--color-border);
          margin: var(--space-sm) 0;
        }

        .mobile-user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 var(--space-xs);
        }

        .w-full {
          width: 100%;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }

          .navbar-toggle {
            display: block;
          }

          .navbar-container {
            padding: var(--space-sm) var(--space-md);
          }
        }
      `}</style>
    </nav>
  );
}
