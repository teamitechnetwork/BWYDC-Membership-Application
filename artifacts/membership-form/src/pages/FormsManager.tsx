import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiBaseUrl } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FilePlus2, Link2, Copy, Trash2, Eye, EyeOff, Plus, X, ArrowLeft,
  GripVertical, Inbox, ExternalLink, ClipboardList, Mail, Send, Settings2, AlertTriangle,
  Palette, ImagePlus,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

/* ─── Types ─────────────────────────────────────────────── */
export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'checkbox' | 'photo';
  required: boolean;
  options?: string[];
}

export interface FormTheme {
  logoDataUrl?: string | null;
  headerImageDataUrl?: string | null;
  primaryColor?: string | null;
  textColor?: string | null;
  backgroundColor?: string | null;
  successMessage?: string | null;
}

interface CustomForm {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  fields: FormField[];
  theme?: FormTheme;
  published: boolean;
  createdAt: string;
  submissionCount?: number;
  lastSend?: {
    sent: number;
    failed: number;
    error: string | null;
    sentAt: string;
  } | null;
}

const FIELD_TYPES: { value: FormField['type']; label: string }[] = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Paragraph' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'photo', label: 'Photo Upload' },
];

/** Reads an image file into a base64 data URL, resizing so the longest edge
 *  is at most `maxEdge` px (keeps submissions and logos small). */
function readImageResized(file: File, maxEdge: number, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not process image')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

const api = (path: string) => `${getApiBaseUrl()}/api${path}`;

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  });
  if (res.status === 401) {
    // Session expired — redirect to login
    window.location.href = (import.meta.env.BASE_URL || '/') + 'login';
    throw new Error('Session expired. Redirecting to login…');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

/* ─── Public link helper ────────────────────────────────── */
function publicFormUrl(slug: string): string {
  const base = window.location.origin + (import.meta.env.BASE_URL || '/');
  return `${base.replace(/\/$/, '')}/f/${slug}`;
}

/* ─── Main ──────────────────────────────────────────────── */
export default function FormsManager() {
  const queryClient = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<CustomForm | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<CustomForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomForm | null>(null);

  const { data: forms, isLoading } = useQuery<CustomForm[]>({
    queryKey: ['custom-forms'],
    queryFn: () => jsonFetch(api('/forms')),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, published }: { id: number; published: boolean }) =>
      jsonFetch(api(`/forms/${id}`), { method: 'PATCH', body: JSON.stringify({ published }) }),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['custom-forms'] });
      toast.success(vars.published ? 'Form published! Link is now live.' : 'Form unpublished.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteForm = useMutation({
    mutationFn: (id: number) => jsonFetch(api(`/forms/${id}`), { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-forms'] });
      setDeleteTarget(null);
      toast.success('Form deleted.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(publicFormUrl(slug))
      .then(() => toast.success('Link copied to clipboard!'))
      .catch(() => toast.error('Could not copy link'));
  };

  if (viewingSubmissions) {
    return <SubmissionsView form={viewingSubmissions} onBack={() => setViewingSubmissions(null)} />;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            Custom Forms
          </h1>
          <p className="text-muted-foreground mt-1">
            Create forms for events, programs, or registrations — publish and share the link.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/applications">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
          <SenderEmailSettings />
          <Button size="sm" className="gap-2" onClick={() => { setEditingForm(null); setBuilderOpen(true); }}>
            <FilePlus2 className="h-4 w-4" /> New Form
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : !forms?.length ? (
        <Card className="text-center py-16">
          <CardContent>
            <Inbox className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No forms yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first custom form — an event application, volunteer signup, or anything else.
            </p>
            <Button onClick={() => { setEditingForm(null); setBuilderOpen(true); }} className="gap-2">
              <FilePlus2 className="h-4 w-4" /> Create a Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => (
            <Card key={form.id} className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg truncate">{form.title}</h3>
                      {form.published ? (
                        <Badge className="bg-green-600 text-white">Live</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </div>
                    {form.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{form.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span>{form.fields.length} field{form.fields.length !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{form.submissionCount ?? 0} submission{(form.submissionCount ?? 0) !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>Created {format(parseISO(form.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    {form.lastSend && (
                      <div className={`mt-2 flex items-start gap-1.5 text-xs rounded-md px-2.5 py-1.5 w-fit max-w-full ${
                        form.lastSend.failed > 0
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-green-50 text-green-800 border border-green-200'
                      }`}>
                        {form.lastSend.failed > 0
                          ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          : <Mail className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                        <span>
                          Last sent {format(parseISO(form.lastSend.sentAt), 'MMM d, yyyy h:mm a')} —{' '}
                          {form.lastSend.sent} sent
                          {form.lastSend.failed > 0 && <>, {form.lastSend.failed} failed</>}
                          {form.lastSend.failed > 0 && form.lastSend.error && (
                            <span className="block text-amber-700">{form.lastSend.error}</span>
                          )}
                        </span>
                      </div>
                    )}
                    {form.published && (
                      <button
                        onClick={() => copyLink(form.slug)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono text-primary bg-primary/5 hover:bg-primary/10 rounded-md px-2.5 py-1.5 transition-colors max-w-full"
                        title="Click to copy"
                      >
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{publicFormUrl(form.slug)}</span>
                        <Copy className="h-3 w-3 shrink-0 opacity-60" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {form.published && (
                      <a href={publicFormUrl(form.slug)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        title="Open form">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setViewingSubmissions(form)}>
                      <Inbox className="h-3.5 w-3.5" /> Submissions
                      {(form.submissionCount ?? 0) > 0 && (
                        <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5">
                          {form.submissionCount}
                        </span>
                      )}
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => { setEditingForm(form); setBuilderOpen(true); }}>
                      Edit
                    </Button>
                    <Button
                      variant={form.published ? 'secondary' : 'default'}
                      size="sm"
                      className="gap-1.5"
                      disabled={togglePublish.isPending}
                      onClick={() => togglePublish.mutate({ id: form.id, published: !form.published })}
                    >
                      {form.published ? (<><EyeOff className="h-3.5 w-3.5" /> Unpublish</>) : (<><Eye className="h-3.5 w-3.5" /> Publish</>)}
                    </Button>
                    <button
                      onClick={() => setDeleteTarget(form)}
                      title="Delete form"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Builder dialog */}
      {builderOpen && (
        <FormBuilderDialog
          form={editingForm}
          onClose={() => { setBuilderOpen(false); setEditingForm(null); }}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete "{deleteTarget?.title}"?</DialogTitle>
            <DialogDescription>
              The form and all {deleteTarget?.submissionCount ?? 0} submission{(deleteTarget?.submissionCount ?? 0) !== 1 ? 's' : ''} will be permanently deleted. The public link will stop working. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteForm.isPending}
              onClick={() => deleteTarget && deleteForm.mutate(deleteTarget.id)}>
              {deleteForm.isPending ? 'Deleting…' : 'Delete Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Form Builder ──────────────────────────────────────── */
function FormBuilderDialog({ form, onClose }: { form: CustomForm | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(form?.title ?? '');
  const [description, setDescription] = useState(form?.description ?? '');
  const [fields, setFields] = useState<FormField[]>(form?.fields ?? []);
  const [theme, setTheme] = useState<FormTheme>(form?.theme ?? {});

  const setThemeValue = (patch: Partial<FormTheme>) => setTheme((t) => ({ ...t, ...patch }));

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await readImageResized(file, 400);
      setThemeValue({ logoDataUrl: dataUrl });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleBannerUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await readImageResized(file, 1600, 0.8);
      if (dataUrl.length > 1_400_000) {
        toast.error('Banner image is too large — try a smaller or simpler image');
        return;
      }
      setThemeValue({ headerImageDataUrl: dataUrl });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = { title, description, fields, theme };
      return form
        ? jsonFetch(api(`/forms/${form.id}`), { method: 'PATCH', body: JSON.stringify(payload) })
        : jsonFetch(api('/forms'), { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-forms'] });
      toast.success(form ? 'Form updated.' : 'Form created! Publish it to get the shareable link.');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addField = () => {
    setFields([...fields, {
      id: `f${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
    }]);
  };

  const updateField = (i: number, patch: Partial<FormField>) => {
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  };

  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));

  const canSave = title.trim().length > 0 && fields.length > 0 &&
    fields.every((f) => f.label.trim().length > 0 &&
      (f.type !== 'select' || (f.options && f.options.filter(o => o.trim()).length >= 2)));

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form ? 'Edit Form' : 'Create New Form'}</DialogTitle>
          <DialogDescription>
            Build your form, then publish it to get a shareable link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-title">Form Title <span className="text-destructive">*</span></Label>
            <Input id="form-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Retreat 2026 — Event Application" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-desc">Description (optional)</Label>
            <Textarea id="form-desc" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Shown at the top of the form…" rows={2} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Form Fields <span className="text-destructive">*</span></Label>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addField}>
                <Plus className="h-3.5 w-3.5" /> Add Field
              </Button>
            </div>

            {fields.length === 0 && (
              <div className="border border-dashed rounded-lg py-8 text-center text-sm text-muted-foreground">
                No fields yet — click "Add Field" to start building.
              </div>
            )}

            {fields.map((field, i) => (
              <div key={field.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-2.5 shrink-0" />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                      placeholder="Field label (e.g. Full Name)"
                    />
                    <Select value={field.type} onValueChange={(v) => updateField(i, { type: v as FormField['type'] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button onClick={() => removeField(i)}
                    className="mt-2 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {field.type === 'select' && (
                  <div className="ml-6 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Options (one per line, min 2)</Label>
                    <Textarea
                      value={(field.options ?? []).join('\n')}
                      onChange={(e) => updateField(i, { options: e.target.value.split('\n') })}
                      placeholder={'Option A\nOption B'}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                )}

                <label className="ml-6 flex items-center gap-2 text-sm cursor-pointer w-fit">
                  <Switch checked={field.required} onCheckedChange={(v) => updateField(i, { required: v })} />
                  Required
                </label>
              </div>
            ))}
          </div>

          {/* ── Appearance & messages ── */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/10">
            <Label className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-primary" /> Customize Appearance
            </Label>

            {/* Banner image (like Google Forms) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Banner image (shown across the top of the form)</Label>
              {theme.headerImageDataUrl ? (
                <div className="relative">
                  <img src={theme.headerImageDataUrl} alt="Banner"
                    className="w-full h-28 rounded-md object-cover border" />
                  <button type="button" onClick={() => setThemeValue({ headerImageDataUrl: null })}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="w-full h-20 rounded-md border border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-xs">Upload a banner (wide images look best)</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { handleBannerUpload(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Logo</Label>
                <div className="flex items-center gap-3">
                  {theme.logoDataUrl ? (
                    <div className="relative">
                      <img src={theme.logoDataUrl} alt="Logo" className="h-14 w-14 rounded-md object-contain border bg-white" />
                      <button type="button" onClick={() => setThemeValue({ logoDataUrl: null })}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="h-14 w-14 rounded-md border border-dashed flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                      <ImagePlus className="h-5 w-5" />
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleLogoUpload(e.target.files?.[0])} />
                    </label>
                  )}
                  <p className="text-xs text-muted-foreground max-w-[200px]">
                    Shown at the top of the public form. Leave empty to use the BWYDC logo.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Main color (buttons & header)</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={theme.primaryColor ?? '#ea580c'}
                    onChange={(e) => setThemeValue({ primaryColor: e.target.value })}
                    className="h-9 w-12 rounded border cursor-pointer bg-transparent" />
                  {theme.primaryColor && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={() => setThemeValue({ primaryColor: null })}>Reset</Button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Page background</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={theme.backgroundColor ?? '#fff7ed'}
                    onChange={(e) => setThemeValue({ backgroundColor: e.target.value })}
                    className="h-9 w-12 rounded border cursor-pointer bg-transparent" />
                  {theme.backgroundColor && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={() => setThemeValue({ backgroundColor: null })}>Reset</Button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Text color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={theme.textColor ?? '#1c1917'}
                    onChange={(e) => setThemeValue({ textColor: e.target.value })}
                    className="h-9 w-12 rounded border cursor-pointer bg-transparent" />
                  {theme.textColor && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={() => setThemeValue({ textColor: null })}>Reset</Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Thank-you message (shown after submission)</Label>
              <Textarea rows={2} value={theme.successMessage ?? ''}
                onChange={(e) => setThemeValue({ successMessage: e.target.value })}
                placeholder="e.g. Thank you for applying! We will contact you before the event." />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSave || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : form ? 'Save Changes' : 'Create Form'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Sender Email Settings ─────────────────────────────── */
function SenderEmailSettings() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');

  const { data } = useQuery<{ senderEmail: string }>({
    queryKey: ['sender-email'],
    queryFn: () => jsonFetch(api('/settings/sender-email')),
  });

  const save = useMutation({
    mutationFn: (senderEmail: string) =>
      jsonFetch(api('/settings/sender-email'), { method: 'PUT', body: JSON.stringify({ senderEmail }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sender-email'] });
      setOpen(false);
      toast.success('Sender email updated.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2"
        onClick={() => { setEmail(data?.senderEmail ?? ''); setOpen(true); }}>
        <Settings2 className="h-4 w-4" /> Sender Email
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sender email</DialogTitle>
            <DialogDescription>
              The "From" address used when emailing applicants.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Before using a custom address:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Go to <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline font-medium">resend.com/domains</a> and add your domain.</li>
              <li>Add the DNS records Resend shows you to your domain registrar.</li>
              <li>Wait for Resend to confirm the domain is verified.</li>
              <li>Enter any address on that domain below and save.</li>
            </ol>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sender-email">Email address</Label>
            <Input id="sender-email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@bwydc.org" />
            <p className="text-xs text-muted-foreground">
              Currently: <span className="font-mono">{data?.senderEmail ?? '…'}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={save.isPending || !email.trim()} onClick={() => save.mutate(email.trim())}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Submissions View ──────────────────────────────────── */
function SubmissionsView({ form, onBack }: { form: CustomForm; onBack: () => void }) {
  const [emailOpen, setEmailOpen] = useState(false);
  const { data, isLoading, isError, error } = useQuery<{
    form: CustomForm;
    submissions: { id: number; data: Record<string, unknown>; submittedAt: string }[];
  }>({
    queryKey: ['form-submissions', form.id],
    queryFn: () => jsonFetch(api(`/forms/${form.id}/submissions`)),
  });

  const fields = data?.form.fields ?? form.fields;
  const submissions = data?.submissions ?? [];
  const emailFieldIds = fields.filter((f) => f.type === 'email').map((f) => f.id);
  const recipientCount = new Set(
    submissions
      .flatMap((s) => emailFieldIds.map((fid) => String(s.data[fid] ?? '').trim().toLowerCase()))
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
  ).size;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <button onClick={onBack} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to forms
          </button>
          <h1 className="text-2xl font-bold tracking-tight">{form.title}</h1>
          <p className="text-muted-foreground text-sm">Submissions</p>
        </div>
        {submissions.length > 0 && (
          <Button className="gap-2" disabled={recipientCount === 0}
            title={recipientCount === 0 ? 'No email addresses collected by this form' : undefined}
            onClick={() => setEmailOpen(true)}>
            <Mail className="h-4 w-4" /> Email Applicants
            {recipientCount > 0 && (
              <span className="rounded-full bg-primary-foreground/20 text-[10px] font-bold px-1.5 py-0.5">
                {recipientCount}
              </span>
            )}
          </Button>
        )}
      </div>

      {isError ? (
        <Card className="text-center py-16 border-destructive/30">
          <CardContent>
            <AlertTriangle className="h-12 w-12 text-destructive/60 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">Could not load submissions</h3>
            <p className="text-muted-foreground text-sm">{(error as Error)?.message ?? 'Please try again.'}</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : submissions.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Inbox className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No submissions yet</h3>
            <p className="text-muted-foreground text-sm">
              Share the form link to start collecting responses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">#</th>
                  {fields.map((f) => (
                    <th key={f.id} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, idx) => (
                  <tr key={s.id} className={`border-b border-border/30 ${idx % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.id}</td>
                    {fields.map((f) => (
                      <td key={f.id} className="px-4 py-2.5 whitespace-nowrap max-w-[240px] truncate">
                        {typeof s.data[f.id] === 'string' && (s.data[f.id] as string).startsWith('data:image/') ? (
                          <a href={s.data[f.id] as string} target="_blank" rel="noopener noreferrer" title="Open full size">
                            <img src={s.data[f.id] as string} alt={f.label}
                              className="h-12 w-12 rounded-md object-cover border" />
                          </a>
                        ) : (
                          formatValue(s.data[f.id])
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {format(parseISO(s.submittedAt), 'MMM d, yyyy h:mm a')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <BulkEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        formId={form.id}
        recipientCount={recipientCount}
      />
    </div>
  );
}

/* ─── Bulk Email Dialog ─────────────────────────────────── */
function BulkEmailDialog({ open, onOpenChange, formId, recipientCount }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  formId: number;
  recipientCount: number;
}) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const { data: sender } = useQuery<{ senderEmail: string }>({
    queryKey: ['sender-email'],
    queryFn: () => jsonFetch(api('/settings/sender-email')),
    enabled: open,
  });

  const send = useMutation({
    mutationFn: () =>
      jsonFetch(api(`/forms/${formId}/email`), {
        method: 'POST',
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      }),
    onSuccess: (res: { sent: number; failed: number }) => {
      queryClient.invalidateQueries({ queryKey: ['custom-forms'] });
      onOpenChange(false);
      setSubject('');
      setMessage('');
      toast.success(
        res.failed > 0
          ? `Sent to ${res.sent} applicant${res.sent !== 1 ? 's' : ''} (${res.failed} failed).`
          : `Email sent to ${res.sent} applicant${res.sent !== 1 ? 's' : ''}!`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Email Applicants
          </DialogTitle>
          <DialogDescription>
            Sends an individual email to each of the {recipientCount} applicant{recipientCount !== 1 ? 's' : ''} — recipients cannot see each other's addresses.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            From: <span className="font-mono">{sender?.senderEmail ?? '…'}</span>
            <span className="ml-1">(change via "Sender Email" on the Forms page)</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-subject">Subject</Label>
            <Input id="bulk-subject" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Your application update" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-message">Message</Label>
            <Textarea id="bulk-message" rows={7} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message to all applicants…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="gap-2" disabled={send.isPending || !subject.trim() || !message.trim()}
            onClick={() => send.mutate()}>
            <Send className="h-4 w-4" />
            {send.isPending ? 'Sending…' : `Send to ${recipientCount}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}
