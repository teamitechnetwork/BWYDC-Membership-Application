import { type ReactNode } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { FloatingChatbot } from '@/components/FloatingChatbot';
import logoPath from "@assets/Retreat_2026__20260808_123924_0000_1786193668114.png";
import { CircleHelp } from 'lucide-react';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20 selection:text-primary-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black text-white shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white p-1.5 shadow-sm">
              <img src={logoPath} alt="BWYDC Logo" className="h-full w-full object-contain" />
            </span>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-white text-sm tracking-tight leading-tight">Bong County Women and</span>
              <span className="font-bold text-primary text-sm tracking-tight leading-tight">Youth Development Cooperration</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/faqs" aria-label="BWYDC FAQs">
              <Button
                variant="outline"
                size="icon"
                className="border-white/25 bg-transparent text-white hover:bg-white hover:text-black"
                title="BWYDC FAQs"
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/applications">
              <Button variant="outline" size="sm" className="border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground font-semibold">
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-white/10 bg-black py-10 mt-auto text-white">
        <div className="container mx-auto px-4 text-center text-sm">
          <p className="text-white/80">
            &copy; {new Date().getFullYear()} Bong County Women and Youth Development Cooperration. All rights reserved.
          </p>
          <p className="mt-3 text-white/80">
            Developed by:{' '}
            <a
              href="https://www.itechnetworkafrica.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
            >
              iTech Network Africa
            </a>
          </p>
          <div className="mt-5 flex items-center justify-center gap-5 text-2xl text-white" aria-label="Social media platforms">
            <span title="Facebook" aria-label="Facebook">
              <FaFacebookF />
            </span>
            <span title="Instagram" aria-label="Instagram">
              <FaInstagram />
            </span>
            <span title="X" aria-label="X">
              <FaXTwitter />
            </span>
            <span title="YouTube" aria-label="YouTube">
              <FaYoutube />
            </span>
            <span title="LinkedIn" aria-label="LinkedIn">
              <FaLinkedinIn />
            </span>
            <span title="WhatsApp Business" aria-label="WhatsApp Business">
              <FaWhatsapp />
            </span>
          </div>
        </div>
      </footer>
      <FloatingChatbot />
    </div>
  );
}
