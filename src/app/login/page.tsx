import { Suspense } from 'react';
import LoginForm from './LoginForm';

function LoginLoading() {
  return (
    <div className="login-form" style={{ textAlign: 'center', padding: '2rem' }}>
      <span className="loading-spinner" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">🎉</div>
          <h1 className="login-title">Party-plan Storo</h1>
          <p className="login-subtitle">Logg inn med ditt fornavn</p>
        </div>

        <Suspense fallback={<LoginLoading />}>
          <LoginForm />
        </Suspense>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-lg);
          background: linear-gradient(135deg, var(--color-bg-primary) 0%, #0f0f14 100%);
        }

        .login-container {
          width: 100%;
          max-width: 400px;
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--space-xl);
        }

        .login-logo {
          font-size: 4rem;
          margin-bottom: var(--space-md);
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .login-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }

        .login-subtitle {
          color: var(--color-text-muted);
          margin-top: var(--space-sm);
        }

        .login-form {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-xl);
        }

        .login-button {
          width: 100%;
          margin-top: var(--space-sm);
        }
      `}</style>
    </main>
  );
}
