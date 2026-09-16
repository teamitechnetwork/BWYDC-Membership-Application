import { useGetApplicationStats, useListApplications, useDeleteApplication, getListApplicationsQueryKey, getGetApplicationStatsQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';
import {
  Users, Clock, CheckCircle2, XCircle, LayoutDashboard,
  Filter, Download, Printer, LogOut, CreditCard,
  TableProperties, LayoutList, Eye, Trash2, FileText, MessagesSquare,
} from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { clearAdminAuth } from '@/pages/Login';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DeleteMemberDialog } from '@/components/DeleteMemberDialog';

/* ─── Helpers ─────────────────────────────────────────────── */
const membershipLabel = (t: string) =>
  ({ individual: 'Individual', group: 'Group', associate: 'Associate' }[t] ?? t);

const genderLabel = (g: string | null | undefined) =>
  g === 'M' ? 'Male' : g === 'F' ? 'Female' : '—';

const INTEREST_LABELS: Record<string, string> = {
  A: 'Loans',
  AB: 'Group Participation & Development',
  AC: 'Personal Development & Training',
  AD: 'Volunteerism',
  AE: 'General Benefits',
};

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved')
    return <Badge className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap">Approved</Badge>;
  if (status === 'denied')
    return <Badge variant="destructive" className="whitespace-nowrap">Denied</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-600 text-white whitespace-nowrap">Pending</Badge>;
}

/* ─── All-fields column definitions ──────────────────────── */
const ALL_COLUMNS = [
  { key: 'id',                    label: '#',                     width: 60 },
  { key: 'fullName',              label: 'Full Name',             width: 180, sticky: true },
  { key: 'status',                label: 'Status',                width: 110 },
  { key: 'membershipType',        label: 'Membership Type',       width: 140 },
  { key: 'phoneNumber',           label: 'Phone',                 width: 140 },
  { key: 'emailAddress',          label: 'Email',                 width: 200 },
  { key: 'gender',                label: 'Gender',                width: 90 },
  { key: 'dateOfBirth',           label: 'Date of Birth',         width: 120 },
  { key: 'age',                   label: 'Age',                   width: 60 },
  { key: 'county',                label: 'County',                width: 130 },
  { key: 'countryState',          label: 'Country / State',       width: 140 },
  { key: 'town',                  label: 'Town',                  width: 120 },
  { key: 'educationalBackground', label: 'Education',             width: 160 },
  { key: 'maritalStatus',         label: 'Marital Status',        width: 130 },
  { key: 'numberOfChildren',      label: '# Children',            width: 100 },
  { key: 'emergencyContactName',  label: 'Emergency Contact',     width: 170 },
  { key: 'emergencyContactPhone', label: 'Emergency Phone',       width: 150 },
  { key: 'affiliateGroup',        label: 'Affiliate Group',       width: 160 },
  { key: 'interestCategories',    label: 'Interests',             width: 220 },
  { key: 'residentOf',            label: 'Resident Of',           width: 130 },
  { key: 'onBehalfOf',            label: 'On Behalf Of',          width: 150 },
  { key: 'sharesContribution',    label: 'Shares Contribution',   width: 150 },
  { key: 'newsletterSubscribe',   label: 'Newsletter',            width: 100 },
  { key: 'signatureName',         label: 'Signature Name',        width: 160 },
  { key: 'submittedAt',           label: 'Submitted',             width: 120 },
  { key: 'reviewDate',            label: 'Review Date',           width: 120 },
  { key: 'reviewerName',          label: 'Reviewer',              width: 150 },
  { key: 'reviewerPosition',      label: 'Reviewer Position',     width: 160 },
] as const;

type ColKey = typeof ALL_COLUMNS[number]['key'];

function getCellValue(app: any, key: ColKey): string {
  switch (key) {
    case 'status':               return app.status.charAt(0).toUpperCase() + app.status.slice(1);
    case 'membershipType':       return membershipLabel(app.membershipType);
    case 'gender':               return genderLabel(app.gender);
    case 'dateOfBirth':          return app.dateOfBirth ? format(new Date(app.dateOfBirth), 'MMM d, yyyy') : '—';
    case 'submittedAt':          return app.submittedAt ? format(new Date(app.submittedAt), 'MMM d, yyyy') : '—';
    case 'reviewDate':           return app.reviewDate ? format(new Date(app.reviewDate), 'MMM d, yyyy') : '—';
    case 'interestCategories':   return (app.interestCategories ?? []).map((c: string) => INTEREST_LABELS[c] ?? c).join(', ') || '—';
    case 'newsletterSubscribe':  return app.newsletterSubscribe ? 'Yes' : 'No';
    case 'numberOfChildren':     return app.numberOfChildren != null ? String(app.numberOfChildren) : '—';
    default:                     return app[key] ?? '—';
  }
}

function renderCell(app: any, key: ColKey) {
  if (key === 'status') return <StatusBadge status={app.status} />;
  return <span className="whitespace-nowrap">{getCellValue(app, key)}</span>;
}

/* ─── Component ───────────────────────────────────────────── */
export default function ApplicationsList() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode]         = useState<'summary' | 'full'>('summary');
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Delete state: null when no deletion in progress; otherwise the target member
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const { data: stats, isLoading: statsLoading } = useGetApplicationStats({
    query: { queryKey: getGetApplicationStatsQueryKey() }
  });

  const queryParams = statusFilter !== 'all' ? { status: statusFilter as any } : undefined;
  const { data: applications, isLoading: appsLoading } = useListApplications(
    queryParams,
    { query: { queryKey: getListApplicationsQueryKey(queryParams) } }
  );

  const deleteApp = useDeleteApplication();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteApp.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success(`${deleteTarget.name} has been permanently removed.`);
          queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetApplicationStatsQueryKey() });
          setDeleteTarget(null);
        },
        onError: () => {
          toast.error('Failed to delete member record. Please try again.');
        },
      },
    );
  };

  /* ── Export to Excel ── */
  const handleExport = () => {
    if (!applications?.length) return;
    const rows = applications.map((app) =>
      Object.fromEntries(ALL_COLUMNS.map(({ key, label }) => [label, getCellValue(app as any, key)]))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] ?? {}).map((k) => ({
      wch: Math.max(k.length, ...rows.map((r) => String(r[k] ?? '').length)) + 2,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Applications');
    XLSX.writeFile(wb, `BWYDC_Applications_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="container mx-auto py-8 px-4 print:py-0">
      <style>{`
        @media print { .print\\:hidden { display: none !important; } body { background: white; } }
      `}</style>

      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Manage membership applications and statistics</p>
        </div>
        <div className="flex items-center gap-2 print:hidden flex-wrap">
          <Link href="/forms">
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="h-4 w-4" /> Custom Forms
            </Button>
          </Link>
          <Link href="/groups">
            <Button variant="outline" size="sm" className="gap-2">
              <MessagesSquare className="h-4 w-4" /> Group Chats
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!applications?.length} className="gap-2">
            <Download className="h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="ghost" size="sm" onClick={async () => {
            try {
              const { getApiBaseUrl } = await import('@workspace/api-client-react');
              await fetch(`${getApiBaseUrl()}/api/auth/logout`, { method: 'POST', credentials: 'include' });
            } catch { /* ignore network errors on logout */ }
            clearAdminAuth();
            navigate('/login');
          }} className="gap-2 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Applications" value={statsLoading ? null : stats?.total ?? 0} icon={<Users className="h-5 w-5 text-muted-foreground" />} />
        <StatCard label="Pending Review" value={statsLoading ? null : stats?.pending ?? 0} icon={<Clock className="h-5 w-5 text-amber-500" />}
          className="border-amber-500/20 bg-amber-500/5" labelClass="text-amber-700" valueClass="text-amber-700" note="Awaiting action" />
        <StatCard label="Approved" value={statsLoading ? null : stats?.approved ?? 0} icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          className="border-green-600/20 bg-green-600/5" labelClass="text-green-700" valueClass="text-green-700" note="Active members" />
        <StatCard label="Denied" value={statsLoading ? null : stats?.denied ?? 0} icon={<XCircle className="h-5 w-5 text-destructive" />}
          className="border-destructive/20 bg-destructive/5" labelClass="text-destructive" valueClass="text-destructive" note="Rejected" />
      </div>

      {/* ── Applications panel ── */}
      <Card className="border-border/50 shadow-sm overflow-hidden">

        {/* Panel toolbar */}
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row justify-between items-center gap-3 bg-muted/20 print:bg-white">
          <h2 className="text-xl font-semibold">Membership Applications</h2>

          <div className="flex items-center gap-2 flex-wrap print:hidden">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden bg-background shadow-sm">
              <button
                onClick={() => setViewMode('summary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'summary' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutList className="h-3.5 w-3.5" /> Summary
              </button>
              <button
                onClick={() => setViewMode('full')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'full' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <TableProperties className="h-3.5 w-3.5" /> All Fields
              </button>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-background h-9">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── SUMMARY VIEW ── */}
        {viewMode === 'summary' && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Education</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right print:hidden">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appsLoading ? (
                  <LoadingRow cols={9} />
                ) : applications && applications.length > 0 ? (
                  applications.map((app) => (
                    <TableRow key={app.id} className="group transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">#{app.id}</TableCell>
                      <TableCell>
                        <div className="font-semibold leading-tight">{app.fullName}</div>
                        <div className="text-xs text-muted-foreground">{genderLabel(app.gender)} · {app.age} yrs</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{app.phoneNumber}</div>
                        {app.emailAddress && <div className="text-xs text-muted-foreground truncate max-w-[160px]">{app.emailAddress}</div>}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{(app as any).county || '—'}</div>
                        <div className="text-xs text-muted-foreground">{(app as any).countryState || '—'}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{app.educationalBackground}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                          {membershipLabel(app.membershipType)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {format(new Date(app.submittedAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell><StatusBadge status={app.status} /></TableCell>
                      <TableCell className="text-right print:hidden">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/member-id/${app.id}`} title="ID Card"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            <CreditCard className="h-3.5 w-3.5" />
                          </Link>
                          <Link href={`/applications/${app.id}`}
                            className="inline-flex h-8 items-center gap-1 justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
                            <Eye className="h-3.5 w-3.5" /> View
                          </Link>
                          <button
                            onClick={() => setDeleteTarget({ id: app.id, name: app.fullName })}
                            title="Delete member"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <EmptyRow cols={9} filter={statusFilter} onClear={() => setStatusFilter('all')} />
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── ALL FIELDS VIEW ── */}
        {viewMode === 'full' && (
          <>
            <div className="bg-primary/5 border-b border-border/40 px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <TableProperties className="h-3.5 w-3.5" />
              All {ALL_COLUMNS.length} fields shown · Scroll horizontally to see all columns · First column is pinned
            </div>
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse min-w-max">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50">
                    {ALL_COLUMNS.map((col, i) => (
                      <th
                        key={col.key}
                        style={{ minWidth: col.width }}
                        className={`px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap border-r border-border/30 last:border-r-0 ${
                          i === 1 ? 'sticky left-[60px] z-10 bg-muted/50 shadow-[2px_0_4px_rgba(0,0,0,0.06)]' : ''
                        } ${i === 0 ? 'sticky left-0 z-10 bg-muted/50' : ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap print:hidden sticky right-0 bg-muted/50 z-10">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {appsLoading ? (
                    <tr>
                      <td colSpan={ALL_COLUMNS.length + 1} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2 py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                          Loading applications...
                        </div>
                      </td>
                    </tr>
                  ) : applications && applications.length > 0 ? (
                    applications.map((app, rowIdx) => (
                      <tr key={app.id} className={`border-b border-border/30 transition-colors hover:bg-primary/5 ${rowIdx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        {ALL_COLUMNS.map((col, i) => (
                          <td
                            key={col.key}
                            className={`px-3 py-2 border-r border-border/20 last:border-r-0 align-middle ${
                              i === 1 ? 'sticky left-[60px] z-10 font-medium bg-white shadow-[2px_0_4px_rgba(0,0,0,0.04)]' : ''
                            } ${i === 0 ? 'sticky left-0 z-10 bg-white font-mono text-xs text-muted-foreground' : ''} ${
                              rowIdx % 2 !== 0 && (i === 0 || i === 1) ? '!bg-muted/10' : ''
                            }`}
                          >
                            {renderCell(app as any, col.key)}
                          </td>
                        ))}
                        <td className="px-3 py-2 align-middle print:hidden sticky right-0 bg-white border-l border-border/20">
                          <div className="flex items-center gap-1">
                            <Link href={`/member-id/${app.id}`} title="ID Card"
                              className="inline-flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              <CreditCard className="h-3 w-3" />
                            </Link>
                            <Link href={`/applications/${app.id}`}
                              className="inline-flex h-7 items-center justify-center rounded bg-secondary px-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
                              View
                            </Link>
                            <button
                              onClick={() => setDeleteTarget({ id: app.id, name: app.fullName })}
                              title="Delete member"
                              className="inline-flex h-7 w-7 items-center justify-center rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={ALL_COLUMNS.length + 1} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-1 py-8">
                          <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                          <p>No applications found.</p>
                          {statusFilter !== 'all' && (
                            <button onClick={() => setStatusFilter('all')} className="text-primary text-sm hover:underline mt-1">
                              Clear filter
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {applications && applications.length > 0 && (
          <div className="p-3 border-t border-border/30 bg-muted/10 text-xs text-muted-foreground text-right print:hidden">
            {applications.length} application{applications.length !== 1 ? 's' : ''} · {viewMode === 'full' ? `${ALL_COLUMNS.length} fields visible` : 'Summary view'}
          </div>
        )}
      </Card>

      {/* ── Delete confirmation dialog ── */}
      {deleteTarget && (
        <DeleteMemberDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          memberName={deleteTarget.name}
          memberId={deleteTarget.id}
          isPending={deleteApp.isPending}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */
function StatCard({ label, value, icon, className = '', labelClass = 'text-muted-foreground', valueClass = 'text-foreground', note }: {
  label: string; value: number | null; icon: React.ReactNode;
  className?: string; labelClass?: string; valueClass?: string; note?: string;
}) {
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={`text-sm font-medium ${labelClass}`}>{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueClass}`}>{value === null ? '—' : value}</div>
        {note && <p className={`text-xs mt-1 ${labelClass} opacity-70`}>{note}</p>}
      </CardContent>
    </Card>
  );
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="h-32 text-center text-muted-foreground">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
          Loading applications...
        </div>
      </TableCell>
    </TableRow>
  );
}

function EmptyRow({ cols, filter, onClear }: { cols: number; filter: string; onClear: () => void }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="h-32 text-center text-muted-foreground">
        <div className="flex flex-col items-center justify-center gap-1">
          <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p>No applications found.</p>
          {filter !== 'all' && (
            <button onClick={onClear} className="text-primary text-sm hover:underline mt-1">Clear filter</button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
