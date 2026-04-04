'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const ThreeScene = dynamic(() => import('@/components/landing/ThreeScene'), {
  ssr: false,
  loading: () => <div className="landing__canvas" style={{ background: '#000' }} />,
});

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="landing">
      <ThreeScene />
      <div className="landing__overlay" />
      <div className="landing__content">
        <img
          src="/SGA.png"
          alt="SGA Ledger System"
          className="landing__logo"
          width={280}
          height={280}
        />
        <h1 className="landing__title">SGA Ledger</h1>
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
        <div className="landing__features">
          <div className="landing__feature">
            <span className="landing__feature-icon">🔒</span>
            <span>Admin Only Access</span>
          </div>
          <div className="landing__feature">
            <span className="landing__feature-icon">☁️</span>
            <span>Cloud Synced</span>
          </div>
          <div className="landing__feature">
            <span className="landing__feature-icon">📊</span>
            <span>Real-time Ledger</span>
          </div>
          <div className="landing__feature">
            <span className="landing__feature-icon">🔍</span>
            <span>Full Audit Trail</span>
          </div>
        </div>
      </div>
    </div>
  );
}
