import { type ReactNode } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import logoPath from "@assets/Retreat_2026__20260808_123924_0000_1786193668114.png";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20 selection:text-primary-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <img src={logoPath} alt="BWYDC Logo" className="h-10 w-auto object-contain" />
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-foreground text-sm tracking-tight leading-tight">Bong County Women and</span>
              <span className="font-bold text-primary text-sm tracking-tight leading-tight">Youth Development Cooperration</span>
            </div>
          </Link>

          <Link href="/applications">
            <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold">
              Admin
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-background/50 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Bong County Women and Youth Development Cooperration. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
