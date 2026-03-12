import React, { useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// SHA-256 of the access code — plaintext never stored in source
const PASS_HASH = 'f4f21176c1217d4375c5b5cf6baf94beae4d78d320d028d15d43fe2b6586867d';
const SESSION_KEY = 'cyient_auth';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function LoginGate({ children }: { children: ReactNode }) {
  const [authed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const hash = await sha256(pass);
      if (hash === PASS_HASH) {
        sessionStorage.setItem(SESSION_KEY, '1');
        window.location.reload();
      } else {
        setError(true);
        setLoading(false);
      }
    },
    [pass],
  );

  if (authed) return <>{children}</>;

  return (
    <div className="login-gate-overlay">
      <div className="login-gate-card">
        <img src="/assets/CYIENT Logo.png" alt="Cyient" className="login-gate-logo" />
        <p className="login-gate-subtitle">Intelligent Network Automation</p>
        <form onSubmit={handleSubmit} className="login-gate-form">
          <input
            type="password"
            placeholder="Access code"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              setError(false);
            }}
            className={`login-gate-input${error ? ' error' : ''}`}
            autoFocus
          />
          {error && <p className="login-gate-error">Incorrect access code</p>}
          <button
            type="submit"
            className="login-gate-btn"
            disabled={loading || !pass}
          >
            {loading ? '…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
