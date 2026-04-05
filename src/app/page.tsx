'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    /* ─── Hero entrance timeline ─── */
    /* Title stays visible for LCP; only animate secondary elements */
    gsap.set([
      '.landing__logo-entrance', '.landing__full-name',
      '.landing__subtitle', '.landing__cta-wrap', '.landing__status-btn', '.landing__scroll-hint'
    ], { opacity: 0, y: 30 });

    const heroTl = gsap.timeline();
    heroTl
      .to('.landing__logo-entrance', { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.3)
      .to('.landing__full-name', { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.7)
      .to('.landing__subtitle', { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.9)
      .to('.landing__cta-wrap', { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' }, 1.1)
      .to('.landing__status-btn', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.3)
      .to('.landing__scroll-hint', { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.6);

    /* ─── Scroll-triggered section reveals ─── */
    const sections = gsap.utils.toArray<HTMLElement>('.landing-section');
    sections.forEach((section) => {
      const badge = section.querySelector('.landing-section__badge');
      const title = section.querySelector('.landing-section__title');
      const desc = section.querySelector('.landing-section__desc');

      if (badge) gsap.fromTo(badge, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', scrollTrigger: { trigger: section, start: 'top 82%' } });
      if (title) gsap.fromTo(title, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: section, start: 'top 80%' } });
      if (desc)  gsap.fromTo(desc,  { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', scrollTrigger: { trigger: section, start: 'top 78%' } });
    });

    /* ─── Cards stagger ─── */
    gsap.utils.toArray<HTMLElement>('.highlight-card').forEach((el, i) => {
      gsap.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, delay: i * 0.1, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    gsap.utils.toArray<HTMLElement>('.step').forEach((el, i) => {
      gsap.fromTo(el, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.6, delay: i * 0.12, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    gsap.utils.toArray<HTMLElement>('.feature-card').forEach((el, i) => {
      gsap.fromTo(el, { opacity: 0, y: 30, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, delay: i * 0.06, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });

    gsap.utils.toArray<HTMLElement>('.tech-card').forEach((el, i) => {
      gsap.fromTo(el, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.4, delay: i * 0.05, ease: 'back.out(1.5)', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });

    return () => {
      heroTl.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="landing-page">
      {/* ─── HERO SECTION ─── */}
      <section className="landing">
        <ThreeScene />
        <div className="landing__overlay" />
        <div className="landing__content">
          <div className="landing__logo-entrance">
            <div className="landing__logo-wrap">
              <Image
                src="/SGA.png"
                alt="SGALA Logo"
                width={180}
                height={180}
                className="landing__logo"
                priority
              />
            </div>
          </div>
          <h1 className="landing__title">SGALA</h1>
          <p className="landing__full-name">Shree Ganpati Agency Ledger Audit System</p>
          <p className="landing__subtitle">
            Secure Digital Bahi-Khata for Hardware & Bath Fittings
          </p>
          <div className="landing__cta-wrap">
            <button
              className="landing__cta"
              onClick={() => router.push('/login')}
            >
              <span>Enter System</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          <button
            className="landing__status-btn"
            onClick={() => router.push('/status')}
          >
            <span className="landing__status-dot" />
            <span>System Status</span>
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
              <div className="tech-card__role">3D Experience</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">GSAP</div>
              <div className="tech-card__role">Animations</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">Firebase</div>
              <div className="tech-card__role">Cloud Database</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">MongoDB Atlas</div>
              <div className="tech-card__role">Monitoring DB</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">Upstash Redis</div>
              <div className="tech-card__role">Cache Layer</div>
            </div>
            <div className="tech-card">
              <div className="tech-card__name">JWT + bcrypt</div>
              <div className="tech-card__role">Auth &amp; Security</div>
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
            <div className="tech-card">
              <div className="tech-card__name">TypeScript</div>
              <div className="tech-card__role">Type Safety</div>
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
            <Image src="/SGA.png" alt="SGALA" width={40} height={40} className="landing-footer__logo" />
            <div>
              <div className="landing-footer__name">SGALA</div>
              <div className="landing-footer__tagline">Shree Ganpati Agency Ledger Audit System</div>
            </div>
          </div>
          <button
            className="landing__status-btn landing__status-btn--footer"
            onClick={() => router.push('/status')}
          >
            <span className="landing__status-dot" />
            <span>System Status</span>
          </button>
          <div className="landing-footer__copy">
            &copy; {new Date().getFullYear()} Shree Ganpati Agency. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
