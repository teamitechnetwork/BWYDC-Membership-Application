import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { getApiBaseUrl } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft, Printer, Share2, CheckCircle2, Clock, XCircle,
  CreditCard, User, RefreshCw, Phone, Mail, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import logoPath from '@assets/Retreat_2026__20260808_123924_0000_1786193668114.png';

/* ─── Public member-card type (no sensitive contact fields) ── */
interface MemberCard {
  id: number;
  fullName: string;
  county: string;
  countryState: string;
  town: string | null;
  membershipType: string;
  status: string;
  // dateOfBirth omitted — not returned by the public endpoint (PII)
  interestCategories: string[];
  signatureName: string;
  sharesContribution: string | null;
  residentOf: string;
  reviewerName: string | null;
  reviewerPosition: string | null;
  reviewDate: string | null;
  submittedAt: string;
  photoUrl: string | null;
}

/* ─── Constants ─────────────────────────────────────────── */
const INTEREST_LABELS: Record<string, string> = {
  A: 'Loans',
  AB: 'Group Participation & Dev.',
  AC: 'Personal Development & Training',
  AD: 'Volunteerism',
  AE: 'General Benefits',
};

const MEMBERSHIP_LABELS: Record<string, string> = {
  individual: 'Individual / Regular',
  group: 'Group / Regular',
  associate: 'Associate Member',
};

/* ─── Barcode SVG (decorative) ─────────────────────────── */
function Barcode({ value }: { value: number }) {
  // Generate a visually varied barcode pattern from the ID
  const seed = value * 2654435761;
  const bars = Array.from({ length: 40 }, (_, i) => {
    const w = ((seed >> (i % 16)) & 1) ? (((seed >> ((i + 3) % 20)) & 3) + 1) : 0;
    return w;
  });

  let x = 0;
  const rects: React.ReactNode[] = [];
  bars.forEach((w, i) => {
    if (w > 0) {
      rects.push(<rect key={i} x={x} y={0} width={w} height={28} fill="currentColor" />);
      x += w + (((seed >> (i % 12)) & 1) ? 2 : 1);
    } else {
      x += 2;
    }
  });
  // normalise to fixed width
  const scale = 88 / Math.max(x, 1);

  return (
    <svg viewBox={`0 0 ${x} 28`} width="88" height="22" preserveAspectRatio="none" className="text-current">
      {rects}
    </svg>
  );
}

/* ─── Main ──────────────────────────────────────────────── */
export default function MemberIDCard() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || '0', 10);
  const [flipped, setFlipped] = useState(false);

  const { data: application, isLoading, error } = useQuery<MemberCard>({
    queryKey: ['public-member-card', id],
    queryFn: async () => {
      const res = await fetch(`${getApiBaseUrl()}/api/public/member-cards/${id}`);
      if (!res.ok) throw new Error('Member not found');
      return res.json() as Promise<MemberCard>;
    },
    enabled: !!id,
  });

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'BWYDC Member ID Card', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      }
    } catch {
      try { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
      catch { toast.error('Could not copy link'); }
    }
  };

  /* ── Loading / Error states ── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading ID card…</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <XCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Member Not Found</h2>
        <p className="text-muted-foreground">The requested ID card could not be found.</p>
        <Link href="/"><Button variant="outline">Return Home</Button></Link>
      </div>
    );
  }

  /* ── Derived values ── */
  const isPending  = application.status === 'pending';
  const isApproved = application.status === 'approved';
  const memberNo   = String(application.id).padStart(5, '0');
  const issuedDate = format(parseISO(application.submittedAt), 'MM/yy');
  const issuedYear = parseInt(format(parseISO(application.submittedAt), 'yyyy'));
  const expiryDate = `${format(parseISO(application.submittedAt), 'MM')}/${issuedYear + 2}`;
  const location   = [(application as any).county, (application as any).countryState || 'Liberia'].filter(Boolean).join(', ');

  const statusStripe = isApproved ? '#16a34a' : isPending ? '#d97706' : '#dc2626';
  const statusText   = isApproved ? 'APPROVED MEMBER' : isPending ? 'PENDING APPROVAL' : 'APPLICATION DENIED';
  const StatusIcon   = isApproved ? CheckCircle2 : isPending ? Clock : XCircle;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col items-center py-10 px-4 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .card-scene { perspective: none !important; }
          .card-inner { transform: none !important; }
          .card-back-face { display: none !important; }
          @page { size: 3.375in 4.5in; margin: 0.25in; }
        }
        .card-scene { perspective: 1000px; }
        .card-inner {
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.65s cubic-bezier(.4,0,.2,1);
        }
        .card-inner.is-flipped { transform: rotateY(180deg); }
        .card-face {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .card-back-face { transform: rotateY(180deg); }
        .mag-stripe {
          background: repeating-linear-gradient(
            90deg,
            #1a1a1a 0px, #1a1a1a 3px,
            #2a2a2a 3px, #2a2a2a 6px
          );
        }
      `}</style>

      {/* ── Top toolbar ── */}
      <div className="no-print w-full max-w-[420px] flex items-center justify-between mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* ── Card scene ── */}
      <div className="w-full max-w-[420px]">

        {/* Flip instruction */}
        <div className="no-print flex justify-center mb-3">
          <button
            onClick={() => setFlipped(f => !f)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-4 py-1.5 rounded-full border border-border/60 bg-white/80 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {flipped ? 'Show Front' : 'Flip to Back'}
          </button>
        </div>

        <div className="card-scene w-full" style={{ height: 264 }}>
          <div className={`card-inner w-full ${flipped ? 'is-flipped' : ''}`} style={{ height: 264 }}>

            {/* ═══════════════ FRONT ═══════════════ */}
            <div className="card-face absolute inset-0 rounded-2xl overflow-hidden shadow-2xl border border-white/20"
              style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 40%, #1c1917 100%)' }}>

              {/* Decorative circle */}
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #F97316, transparent)' }} />
              <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #F97316, transparent)' }} />

              {/* Orange top accent */}
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #F97316, #fb923c, #F97316)' }} />

              {/* Header */}
              <div className="relative px-5 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center ring-1 ring-white/20">
                    <img src={logoPath} alt="BWYDC" className="h-8 w-auto object-contain brightness-0 invert" />
                  </div>
                  <div>
                    <p className="text-white/90 font-bold text-[11px] leading-none tracking-wide">BONG COUNTY WOMEN &</p>
                    <p className="text-white/90 font-bold text-[11px] leading-none tracking-wide mt-0.5">YOUTH DEVELOPMENT</p>
                    <p className="text-orange-400/80 text-[9px] font-semibold tracking-widest mt-0.5">COOPERRATION · BWYDC</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-orange-400/60 text-[9px] font-semibold tracking-widest uppercase mb-0.5">MEMBER ID</div>
                  <div className="text-orange-400 font-mono font-bold text-lg leading-none">#{memberNo}</div>
                </div>
              </div>

              {/* Body */}
              <div className="relative px-5 py-2 flex gap-4">
                {/* Photo — only revealed for approved members */}
                <div className="flex-shrink-0 w-[70px] h-[84px] rounded-lg border-2 border-orange-400/40 overflow-hidden bg-white/5">
                  {isApproved && application.photoUrl ? (
                    <img
                      src={application.photoUrl}
                      alt={`${application.fullName} passport photo`}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <User className="h-8 w-8 text-orange-400/50" />
                      <span className="text-[8px] text-orange-400/50 font-semibold tracking-wider">PHOTO</span>
                    </div>
                  )}
                </div>

                {/* Info grid */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-[17px] leading-tight truncate mb-2">{application.fullName}</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <InfoItem label="Membership" value={MEMBERSHIP_LABELS[application.membershipType] ?? application.membershipType} dark />
                    <InfoItem label="Location" value={location || '—'} dark />
                    {/* Date of birth not shown on public card (PII omitted from public API) */}
                    <InfoItem label="Valid" value={`${issuedDate} – ${expiryDate}`} dark />
                  </div>
                </div>
              </div>

              {/* Interest tags */}
              {application.interestCategories?.length > 0 && (
                <div className="relative px-5 pt-1 pb-2 flex flex-wrap gap-1">
                  {application.interestCategories.slice(0, 3).map((cat) => (
                    <span key={cat} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)' }}>
                      {INTEREST_LABELS[cat] ?? cat}
                    </span>
                  ))}
                  {application.interestCategories.length > 3 && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full text-white/40 border border-white/10">
                      +{application.interestCategories.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Status footer */}
              <div className="absolute bottom-0 left-0 right-0 px-5 py-2 flex items-center justify-between"
                style={{ background: statusStripe }}>
                <div className="flex items-center gap-1.5">
                  <StatusIcon className="h-3.5 w-3.5 text-white" />
                  <span className="text-white text-[10px] font-bold tracking-widest">{statusText}</span>
                </div>
                <CreditCard className="h-4 w-4 text-white/50" />
              </div>
            </div>

            {/* ═══════════════ BACK ═══════════════ */}
            <div className="card-face card-back-face absolute inset-0 rounded-2xl overflow-hidden shadow-2xl border border-white/20"
              style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 40%, #1c1917 100%)' }}>

              {/* Decorative circle */}
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #F97316, transparent)' }} />

              {/* Orange accent */}
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #F97316, #fb923c, #F97316)' }} />

              {/* Magnetic stripe */}
              <div className="mag-stripe w-full h-9 mt-5 opacity-90" />

              {/* Content */}
              <div className="px-5 pt-3 pb-3 space-y-2.5">

                {/* Signature strip */}
                <div>
                  <p className="text-white/30 text-[8px] font-semibold tracking-widest uppercase mb-1">Authorized Signature</p>
                  <div className="h-8 rounded bg-white/90 flex items-end px-3 pb-1">
                    <span className="font-serif italic text-gray-800 text-sm">{application.signatureName || application.fullName}</span>
                  </div>
                </div>

                {/* Member details row */}
                <div className="grid grid-cols-3 gap-2">
                  <InfoItem label="Member No." value={`#${memberNo}`} dark accent />
                  <InfoItem label="Issued" value={issuedDate} dark />
                  <InfoItem label="Expires" value={expiryDate} dark />
                </div>

                {/* Contact + Barcode row */}
                <div className="flex items-end justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-white/30 text-[8px] font-semibold tracking-widest uppercase">BWYDC Contact</p>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-white/60 text-[9px]">
                        <Globe className="h-2.5 w-2.5 text-orange-400/60" />
                        Bong County, Liberia
                      </div>
                      <div className="flex items-center gap-1.5 text-white/60 text-[9px]">
                        <Phone className="h-2.5 w-2.5 text-orange-400/60" />
                        +231 (0) 770 000 000
                      </div>
                      <div className="flex items-center gap-1.5 text-white/60 text-[9px]">
                        <Mail className="h-2.5 w-2.5 text-orange-400/60" />
                        info@bwydc.org.lr
                      </div>
                    </div>
                  </div>

                  {/* Barcode */}
                  <div className="flex flex-col items-end gap-0.5">
                    <p className="text-white/30 text-[8px] font-semibold tracking-widest uppercase">Member ID</p>
                    <div className="bg-white rounded px-1.5 py-1 flex flex-col items-center gap-0.5">
                      <div className="text-gray-900">
                        <Barcode value={application.id} />
                      </div>
                      <p className="font-mono text-[8px] text-gray-700 tracking-wider">BWYDC-{memberNo}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 px-5 py-2 border-t border-white/10 flex items-center justify-between">
                <p className="text-white/30 text-[8px] leading-tight">
                  This card is the property of BWYDC. If found, please return to nearest BWYDC office.
                </p>
                <img src={logoPath} alt="BWYDC" className="h-5 w-auto object-contain brightness-0 invert opacity-30" />
              </div>
            </div>

          </div>{/* /card-inner */}
        </div>{/* /card-scene */}

        {/* ── Review panel (below card) ── */}
        {!isPending && (
          <div className="mt-5 rounded-2xl overflow-hidden border border-border/40 shadow-sm bg-white">
            <div className="px-5 py-3 border-b border-border/30 bg-muted/30 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" /> Official Review Record
              </p>
              <StatusBadge status={application.status} />
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-4 text-sm">
              <InfoItem label="Reviewed By" value={application.reviewerName || '—'} />
              <InfoItem label="Position" value={application.reviewerPosition || '—'} />
              <InfoItem label="Review Date" value={application.reviewDate ? format(parseISO(application.reviewDate), 'MMMM d, yyyy') : '—'} />
              <InfoItem label="Resident Of" value={application.residentOf} />
            </div>
            <div className="px-5 py-2.5 border-t border-border/20 bg-muted/10 text-[10px] text-muted-foreground text-center">
              Officially issued by the Bong County Women and Youth Development Cooperration (BWYDC), Liberia
            </div>
          </div>
        )}

        {/* ── Pending notice ── */}
        {isPending && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="font-semibold text-amber-800 mb-1 text-sm">Application Under Review</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              Your membership is pending administrative review. Your ID card will be fully activated once approved.
              Keep your reference number <strong>#{application.id}</strong> for follow-up.
            </p>
          </div>
        )}

        {/* Print-only back side */}
        <div className="hidden print:block mt-8">
          <p className="text-xs text-gray-400 mb-2 text-center uppercase tracking-widest">— Card Back —</p>
          <div className="border border-gray-300 rounded-xl p-4 text-xs space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div><p className="text-gray-400 uppercase text-[9px] tracking-wider">Member No.</p><p className="font-mono font-bold">BWYDC-{memberNo}</p></div>
              <div><p className="text-gray-400 uppercase text-[9px] tracking-wider">Issued</p><p className="font-semibold">{issuedDate}</p></div>
              <div><p className="text-gray-400 uppercase text-[9px] tracking-wider">Expires</p><p className="font-semibold">{expiryDate}</p></div>
            </div>
            {!isPending && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-400 uppercase text-[9px] tracking-wider mb-1">Reviewer</p>
                <p className="font-semibold">{application.reviewerName} · {application.reviewerPosition}</p>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 text-gray-500">
              Bong County Women & Youth Development Cooperration (BWYDC) · Bong County, Liberia
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Tiny helpers ──────────────────────────────────────── */
function InfoItem({ label, value, dark, accent }: { label: string; value: string; dark?: boolean; accent?: boolean }) {
  return (
    <div>
      <p className={`text-[9px] font-semibold tracking-widest uppercase mb-0.5 ${dark ? 'text-white/40' : 'text-muted-foreground'}`}>{label}</p>
      <p className={`text-[11px] font-semibold leading-tight truncate ${dark ? (accent ? 'text-orange-400' : 'text-white/90') : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Approved</span>;
  if (status === 'denied')   return <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Denied</span>;
  return <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pending</span>;
}
