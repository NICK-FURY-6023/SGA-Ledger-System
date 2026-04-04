'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  IconLedger, IconCloud, IconLock, IconDashboard, IconSearch, IconShield,
  IconExport, IconReturn, IconZap, IconBell, IconSettings, IconArrowRight, IconChevronDown
} from '@/components/icons/Icons';

const ThreeScene = dynamic(() => import('@/components/landing/ThreeScene'), {
  ssr: false,
  loading: () => <div className="landing__canvas" style={{ background: '#000' }} />,
});

export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-page">
      {/* ─── HERO SECTION ─── */}
      <section className="landing" ref={heroRef}>
        <ThreeScene />
        <div className="landing__overlay" />
        <div className="landing__content">
          <div className="landing__logo-wrap">
            <img
              src="/SGA.png"
              alt="SGALA Logo"
              className="landing__logo"
            />
          </div>
          <h1 className="landing__title">SGALA</h1>
          <p className="landing__full-name">Shree Ganpati Agency Ledger Audit System</p>
          <p className="landing__subtitle">
            Secure Digital Bahi-Khata for Hardware & Bath Fittings
          </p>
          <button
            className="landing__cta"
            onClick={() => router.push('/login')}
          >
            <span>Enter System</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          <div className="landing__scroll-hint">
            <span>Scroll to explore</span>
            <div className="landing__scroll-arrow">
              <IconChevronDown size={20} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHAT IS SGALA ─── */}
      <section className="landing-section">
        <div className="landing-section__inner">
          <span className="landing-section__badge">About</span>
          <h2 className="landing-section__title">What is <span className="text-gradient">SGALA</span>?</h2>
          <p className="landing-section__desc">
            SGALA (Shree Ganpati Agency Ledger Audit System) is a cloud-based digital ledger that replaces the traditional handwritten
            bahi-khata. Designed specifically for hardware &amp; bath fittings shops, it brings your daily accounting online
            while keeping the familiar register-style look you&apos;re used to.
          </p>
          <div className="landing-section__highlights">
            <div className="highlight-card">
              <div className="highlight-card__icon"><IconLedger size={28} /></div>
              <h3>Traditional Look</h3>
              <p>Looks and feels like a real physical register — familiar columns, date-wise grouping, running balance</p>
            </div>
            <div className="highlight-card">
              <div className="highlight-card__icon"><IconCloud size={28} /></div>
              <h3>Cloud Powered</h3>
              <p>All data saved to the cloud automatically. No manual saving, no USB backups, no data loss</p>
            </div>
            <div className="highlight-card">
              <div className="highlight-card__icon"><IconLock size={28} /></div>
              <h3>Secure Access</h3>
              <p>Admin-only login with JWT authentication. No public signup — only approved users can access</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="landing-section landing-section--dark">
        <div className="landing-section__inner">
          <span className="landing-section__badge">Workflow</span>
          <h2 className="landing-section__title">How It <span className="text-gradient-orange">Works</span></h2>
          <div className="steps">
            <div className="step">
              <div className="step__number">01</div>
              <div className="step__content">
                <h3>Login Securely</h3>
                <p>Enter your admin credentials. The system verifies with encrypted password checking and issues a secure JWT token.</p>
              </div>
            </div>
            <div className="step">
              <div className="step__number">02</div>
              <div className="step__content">
                <h3>Open Ledger</h3>
                <p>Access the register-style ledger view. See all transactions grouped by date, just like a physical bahi-khata.</p>
              </div>
            </div>
            <div className="step">
              <div className="step__number">03</div>
              <div className="step__content">
                <h3>Add Entries</h3>
                <p>Click &quot;New Entry&quot; and fill in the details — party name, bill number, amount, and type (Credit / Debit / Sales Return).</p>
              </div>
            </div>
            <div className="step">
              <div className="step__number">04</div>
              <div className="step__content">
                <h3>Auto-Save &amp; Sync</h3>
                <p>Every entry is instantly saved to the cloud. Balance recalculates automatically. Other devices see updates in real-time.</p>
              </div>
            </div>
            <div className="step">
              <div className="step__number">05</div>
              <div className="step__content">
                <h3>Export &amp; Print</h3>
                <p>Download your ledger as PDF, Excel, or CSV. Or print it directly — the print view matches a physical register.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="landing-section">
        <div className="landing-section__inner">
          <span className="landing-section__badge">Features</span>
          <h2 className="landing-section__title">Everything You <span className="text-gradient">Need</span></h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-card__icon"><IconDashboard size={24} /></div>
              <h3>Dashboard</h3>
              <p>See total debit, credit, balance, and today&apos;s summary at a glance</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon"><IconLedger size={24} /></div>
              <h3>Register Ledger</h3>
              <p>Traditional bahi-khata layout with date grouping and running balance</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon"><IconSearch size={24} /></div>
              <h3>Search &amp; Filter</h3>
              <p>Find any transaction by bill number, party name, date range, or type</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon"><IconShield size={24} /></div>
              <h3>Full Audit Trail</h3>
              <p>Every action logged — login, transaction create/edit/delete, with timestamps</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon"><IconExport size={24} /></div>
              <h3>Export &amp; Print</h3>
              <p>Download as PDF, Excel, CSV or print directly in register format</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon"><IconReturn size={24} /></div>
              <h3>Sales Return</h3>
              <p>Dedicated SR type that correctly adds to balance while staying visually distinct</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon"><IconZap size={24} /></div>
              <h3>Real-time Sync</h3>
              <p>Cloud-synced data — updates appear instantly across all authorized devices</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon"><IconBell size={24} /></div>
              <h3>Notifications</h3>
              <p>Toast notifications for every action — success or error, you always know what happened</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon"><IconSettings size={24} /></div>
              <h3>Settings</h3>
              <p>Configure shop name, currency, date format, sort order, and change password</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TECH STACK ─── */}
      <section className="landing-section landing-section--dark">
        <div className="landing-section__inner">
          <span className="landing-section__badge">Technology</span>
          <h2 className="landing-section__title">Built With <span className="text-gradient-orange">Modern Stack</span></h2>
          <p className="landing-section__desc">
            SGALA is built with industry-standard technologies for reliability, speed, and maintainability.
          </p>
          <div className="tech-grid">
            <div className="tech-card">
              <div className="tech-card__name">Next.js 14</div>
              <div className="tech-card__role">App Framework</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">React.js</div>
              <div className="tech-card__role">UI Components</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">Three.js</div>
              <div className="tech-card__role">3D Landing Page</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">JWT Auth</div>
              <div className="tech-card__role">Secure Sessions</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">bcrypt</div>
              <div className="tech-card__role">Password Hashing</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">Vercel</div>
              <div className="tech-card__role">Cloud Hosting</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">jsPDF</div>
              <div className="tech-card__role">PDF Export</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">XLSX</div>
              <div className="tech-card__role">Excel Export</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="landing-section landing-section--cta">
        <div className="landing-section__inner" style={{ textAlign: 'center' }}>
          <h2 className="landing-section__title" style={{ fontSize: '2.5rem' }}>
            Ready to Go <span className="text-gradient">Digital</span>?
          </h2>
          <p className="landing-section__desc" style={{ maxWidth: '500px', margin: '0 auto 2rem' }}>
            Replace your handwritten register with SGALA. Faster, safer, and always accessible from anywhere.
          </p>
          <button
            className="landing__cta"
            onClick={() => router.push('/login')}
          >
            <span>Login Now</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div className="landing-footer__brand">
            <img src="/SGA.png" alt="SGALA" className="landing-footer__logo" />
            <div>
              <div className="landing-footer__name">SGALA</div>
              <div className="landing-footer__tagline">Shree Ganpati Agency Ledger Audit System</div>
            </div>
          </div>
          <div className="landing-footer__copy">
            © {new Date().getFullYear()} Shree Ganpati Agency. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
