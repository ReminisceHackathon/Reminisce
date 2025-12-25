import React from 'react';
import './AuthLayout.css';

/**
 * Shared Claude-style auth layout.
 * Left: headline + auth card
 * Right: hero image (from /public)
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-shell">
      {/* Claude-style centered page container */}
      <div className="auth-shell-inner">
        {/* Top bar (logo like a navbar) */}
        <div className="auth-topbar" aria-label="Top navigation">
          <div className="auth-brand" aria-label="Reminisce">
            <span className="auth-brand-mark">Reminisce</span>
          </div>
        </div>

        <div className="auth-left">
          <div className="auth-left-content">
            <header className="auth-hero-copy">
              <h1 className="auth-hero-title">{title}</h1>
              {subtitle ? <p className="auth-hero-subtitle">{subtitle}</p> : null}
            </header>

            <div className="auth-card-claude">
              {children}
              {footer ? <div className="auth-card-footer">{footer}</div> : null}
            </div>
          </div>
        </div>

        <aside className="auth-right" aria-label="Illustration">
          <div className="auth-hero-frame">
            <img
              className="auth-hero-image"
              src="/happy.avif"
              alt="A happy person smiling"
              loading="eager"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}


