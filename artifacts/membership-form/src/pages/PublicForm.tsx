import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getApiBaseUrl } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle, Send, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import logoPath from '@assets/Retreat_2026__20260808_123924_0000_1786193668114.png';
import type { FormField, FormTheme } from '@/pages/FormsManager';

interface CustomForm {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  fields: FormField[];
  theme?: FormTheme;
}

/** Reads an image file into a resized base64 data URL (longest edge capped). */
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
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export default function PublicForm() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || '';
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: form, isLoading, error } = useQuery<CustomForm>({
    queryKey: ['public-form', slug],
    queryFn: () => jsonFetch(api(`/public/forms/${slug}`)),
    enabled: !!slug,
    retry: 1,
  });

  const submit = useMutation({
    mutationFn: () =>
      jsonFetch(api(`/public/forms/${slug}/submissions`), {
        method: 'POST',
        body: JSON.stringify({ data: values }),
      }),
    onSuccess: () => setSubmitted(true),
    onError: (e: Error) => toast.error(e.message),
  });

  const setValue = (id: string, v: unknown) => setValues((prev) => ({ ...prev, [id]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // client-side required check
    for (const f of form?.fields ?? []) {
      if (f.required) {
        const v = values[f.id];
        if (v === undefined || v === null || v === '' || v === false) {
          toast.error(`"${f.label}" is required.`);
          return;
        }
      }
    }
    submit.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <XCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Form Not Available</h2>
        <p className="text-muted-foreground max-w-md">
          This form does not exist or is no longer accepting responses.
        </p>
      </div>
    );
  }

  const theme = form.theme ?? {};
  const primary = theme.primaryColor || undefined;
  const textColor = theme.textColor || undefined;
  const pageStyle = theme.backgroundColor ? { backgroundColor: theme.backgroundColor } : undefined;

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center" style={pageStyle}>
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-9 w-9 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Thank You!</h2>
        <p className="text-muted-foreground max-w-md whitespace-pre-wrap">
          {theme.successMessage?.trim() ? theme.successMessage : (
            <>Your response to <strong>{form.title}</strong> has been recorded successfully.</>
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      className={theme.backgroundColor ? 'min-h-screen py-10 px-4' : 'min-h-screen bg-gradient-to-b from-primary/5 to-background py-10 px-4'}
      style={pageStyle}
    >
      <div className="max-w-xl mx-auto">
        {/* Org header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img src={theme.logoDataUrl || logoPath} alt="Logo" className="h-16 w-auto max-w-[200px] object-contain mb-3" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Bong County Women & Youth Development Cooperration
          </p>
        </div>

        <Card className="shadow-md overflow-hidden">
          {theme.headerImageDataUrl && (
            <img src={theme.headerImageDataUrl} alt="" className="w-full max-h-56 object-cover" />
          )}
          <CardHeader
            className="border-b bg-primary/5"
            style={primary ? { backgroundColor: `${primary}14`, borderBottomColor: `${primary}40` } : undefined}
          >
            <CardTitle className="text-2xl" style={primary ? { color: primary } : undefined}>{form.title}</CardTitle>
            {form.description && (
              <CardDescription className="text-base mt-1" style={textColor ? { color: textColor } : undefined}>
                {form.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-6" style={textColor ? { color: textColor } : undefined}>
             <p className="mb-5 text-sm text-muted-foreground">
               Questions marked with <span className="font-bold text-destructive">*</span> are required.
             </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              {form.fields.map((field) => (
                <FieldInput
                  key={field.id}
                  field={field}
                  value={values[field.id]}
                  onChange={(v) => setValue(field.id, v)}
                />
              ))}

              <Button type="submit" className="w-full gap-2 h-11 text-base" disabled={submit.isPending}
                style={primary ? { backgroundColor: primary } : undefined}>
                <Send className="h-4 w-4" />
                {submit.isPending ? 'Submitting…' : 'Submit'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by BWYDC · Bong County, Liberia
        </p>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const req = field.required && <span className="text-destructive ml-0.5">*</span>;

  switch (field.type) {
    case 'textarea':
      return (
        <div className="space-y-2">
          <Label>{field.label}{req}</Label>
          <Textarea value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} rows={4} />
        </div>
      );
    case 'select':
      return (
        <div className="space-y-2">
          <Label>{field.label}{req}</Label>
          <Select value={(value as string) ?? ''} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder="Select an option…" /></SelectTrigger>
            <SelectContent>
              {(field.options ?? []).filter((o) => o.trim()).map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case 'checkbox':
      return (
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox checked={!!value} onCheckedChange={(v) => onChange(!!v)} />
          <span className="text-sm font-medium">{field.label}{req}</span>
        </label>
      );
    case 'photo':
      return (
        <div className="space-y-2">
          <Label>{field.label}{req}</Label>
          {typeof value === 'string' && value.startsWith('data:image/') ? (
            <div className="relative w-fit">
              <img src={value} alt="Uploaded" className="h-32 w-32 rounded-lg object-cover border shadow-sm" />
              <button type="button" onClick={() => onChange(undefined)}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-8 cursor-pointer text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
              <Camera className="h-7 w-7" />
              <span className="text-sm font-medium">Tap to upload a photo</span>
              <span className="text-xs">JPG or PNG, up to 3 MB</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    onChange(await readImageResized(file, 1600));
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                }}
              />
            </label>
          )}
        </div>
      );
    default: {
      const inputType =
        field.type === 'email' ? 'email' :
        field.type === 'phone' ? 'tel' :
        field.type === 'number' ? 'number' :
        field.type === 'date' ? 'date' : 'text';
      return (
        <div className="space-y-2">
          <Label>{field.label}{req}</Label>
          <Input type={inputType} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    }
  }
}
