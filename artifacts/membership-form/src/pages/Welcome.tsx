import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAdminAuthenticated } from '@/pages/Login';
import logoPath from "@assets/Retreat_2026__20260808_123924_0000_1786193668114.png";

export default function Welcome() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/applications'), 1800);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  if (!isAdminAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white p-2 shadow-2xl">
          <img src={logoPath} alt="BWYDC Logo" className="h-20 w-20 rounded-full object-contain" />
        </div>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          BWYDC Admin Portal
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Welcome back</h1>
        <p className="mx-auto mt-4 max-w-sm text-white/70">
          You are signed in successfully. Your administration dashboard is ready.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" aria-label="Loading dashboard" />
          <Button
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white hover:text-black"
            onClick={() => navigate('/applications')}
          >
            Continue to dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}