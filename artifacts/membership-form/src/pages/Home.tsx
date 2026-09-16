import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateApplication, getApiBaseUrl } from '@workspace/api-client-react';
import { toast } from 'sonner';
import { useEffect, useState, useRef } from 'react';
import { differenceInYears } from 'date-fns';
import { Loader2, CheckCircle2, Upload, CreditCard } from 'lucide-react';
import { LIBERIA_COUNTIES, LIBERIA_DISTRICTS } from '@/lib/liberia';
import logoPath from '@assets/Retreat_2026__20260808_123924_0000_1786193668114.png';

const formSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  county: z.string().min(2, 'County is required'),
  countryState: z.string().min(2, 'Country/State is required'),
  district: z.string().optional(),
  occupation: z.string().optional(),
  town: z.string().optional(),
  phoneNumber: z.string().min(6, 'Phone number is required'),
  emailAddress: z.string().email('Invalid email address').optional().or(z.literal('')),
  gender: z.enum(['M', 'F']).optional(),
  emergencyContactName: z.string().min(2, 'Emergency contact name is required'),
  emergencyContactPhone: z.string().min(6, 'Emergency contact phone is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  age: z.number().min(1, 'Age must be calculated from date of birth'),
  educationalBackground: z.string().min(2, 'Educational background is required'),
  maritalStatus: z.string().min(2, 'Marital status is required'),
  numberOfChildren: z.coerce.number().min(0).optional(),
  affiliateGroup: z.string().optional(),
  membershipType: z.enum(['individual', 'group', 'associate'], {
    required_error: 'Please select a membership type',
  }),
  interestCategories: z.array(z.enum(['A', 'AB', 'AC', 'AD', 'AE'])).min(1, 'Select at least one interest category'),
  onBehalfOf: z.string().optional(),
  residentOf: z.string().min(2, 'Resident location is required'),
  signatureName: z.string().min(2, 'Please type your name as a signature'),
  sharesContribution: z.string().optional(),
  newsletterSubscribe: z.boolean().optional(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms to apply',
  }),
}).superRefine((data, ctx) => {
  if (data.countryState === 'Liberia' && !data.district?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['district'],
      message: 'District is required for Liberia',
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

const EDUCATION_OPTIONS = [
  'Primary School',
  'Secondary / High School',
  'Vocational / Technical',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD / Doctorate',
  'None of the Above',
];

const LOADING_MESSAGES = [
  'Loading Application data',
  'Loading the best feature for you',
];

export default function Home() {
  const [entryStage, setEntryStage] = useState<'loading' | 'welcome' | 'form'>('loading');
  const [countdown, setCountdown] = useState(10);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const createApplication = useCreateApplication();

  useEffect(() => {
    if (entryStage !== 'loading') return;

    const countdownTimer = window.setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    const stageTimer = window.setTimeout(() => setEntryStage('welcome'), 10000);

    return () => {
      window.clearInterval(countdownTimer);
      window.clearTimeout(stageTimer);
    };
  }, [entryStage]);

  useEffect(() => {
    if (entryStage !== 'welcome') return;

    const timer = window.setTimeout(() => setEntryStage('form'), 1800);
    return () => window.clearTimeout(timer);
  }, [entryStage]);

  useEffect(() => {
    if (entryStage === 'form') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [entryStage]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      county: '',
      countryState: 'Liberia',
      district: '',
      occupation: '',
      town: '',
      phoneNumber: '',
      emailAddress: '',
      gender: undefined,
      emergencyContactName: '',
      emergencyContactPhone: '',
      dateOfBirth: '',
      age: 0,
      educationalBackground: '',
      maritalStatus: '',
      numberOfChildren: 0,
      affiliateGroup: '',
      membershipType: undefined,
      interestCategories: [],
      onBehalfOf: '',
      residentOf: '',
      signatureName: '',
      sharesContribution: '',
      newsletterSubscribe: false,
      agreeToTerms: false,
    },
  });

  /** Convert a File to a base64 data URL */
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /** Upload passport photo to the API after application is created.
   *  Requires the single-use upload token returned by POST /membership-applications. */
  const uploadPhoto = async (applicationId: number, file: File, uploadToken: string) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      const base = getApiBaseUrl();
      await fetch(`${base}/api/membership-applications/${applicationId}/photo`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Photo-Token': uploadToken,
        },
        body: JSON.stringify({ photoUrl: dataUrl }),
      });
    } catch {
      // Photo upload is best-effort — don't block success flow
      console.warn('Photo upload failed silently');
    }
  };

  const onSubmit = (data: FormValues) => {
    const { agreeToTerms, newsletterSubscribe, ...apiData } = data;

    const finalData = {
      ...apiData,
      emailAddress: apiData.emailAddress || undefined,
      affiliateGroup: apiData.affiliateGroup || undefined,
      onBehalfOf: apiData.onBehalfOf || undefined,
      sharesContribution: apiData.sharesContribution || undefined,
      town: apiData.town || undefined,
      numberOfChildren: apiData.numberOfChildren === 0 ? undefined : apiData.numberOfChildren,
      newsletterSubscribe: newsletterSubscribe ?? false,
    };

    createApplication.mutate(
      { data: finalData },
      {
        onSuccess: async (result) => {
          // Upload photo in the background if one was selected.
          // The server returns a single-use photoUploadToken alongside the application.
          const uploadToken = (result as typeof result & { photoUploadToken?: string }).photoUploadToken;
          if (photoFile && uploadToken) {
            await uploadPhoto(result.id, photoFile, uploadToken);
          }
          setSuccessId(result.id);
          toast.success('Application submitted successfully!');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        onError: (error) => {
          const msg = (error as unknown as { error?: string }).error || error.message || 'Failed to submit application. Please try again.';
          toast.error(msg);
        },
      }
    );
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    form.setValue('dateOfBirth', dob);
    if (dob) {
      try {
        const date = new Date(dob);
        const calculatedAge = differenceInYears(new Date(), date);
        if (!isNaN(calculatedAge)) {
          form.setValue('age', calculatedAge > 0 ? calculatedAge : 0, { shouldValidate: true });
        }
      } catch {
        // ignore invalid dates
      }
    }
  };

  if (entryStage !== 'form') {
    const circumference = 2 * Math.PI * 54;

    return (
      <main className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-5 text-foreground">
        <div className="absolute inset-x-0 top-0 h-2 bg-primary" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

        <section className="relative flex w-full max-w-md flex-col items-center justify-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-2 shadow-lg ring-1 ring-primary/15">
            <img src={logoPath} alt="BWYDC logo" className="h-full w-full rounded-xl object-contain" />
          </div>

          {entryStage === 'loading' ? (
            <>
              <div className="relative mt-10 flex h-36 w-36 items-center justify-center">
                <svg className="absolute h-full w-full animate-spin" viewBox="0 0 120 120" role="img" aria-label="Loading application">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--primary) / 0.14)" strokeWidth="7" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeLinecap="round"
                    strokeWidth="7"
                    strokeDasharray={`${circumference * 0.72} ${circumference * 0.28}`}
                  />
                </svg>
                <span className="text-4xl font-bold tabular-nums text-primary">{countdown}</span>
              </div>
              <p className="mt-7 min-h-6 text-sm font-semibold text-muted-foreground" aria-live="polite">
                {LOADING_MESSAGES[Math.floor((10 - countdown) / 3) % LOADING_MESSAGES.length]}
              </p>
            </>
          ) : (
            <h1 className="mt-10 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Welcome to BWYDC Membership
            </h1>
          )}
        </section>
      </main>
    );
  }

  if (successId) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4 flex items-center justify-center flex-1">
        <Card className="w-full border-primary/20 shadow-lg text-center py-12">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl text-primary font-bold">Application Received</CardTitle>
            <CardDescription className="text-lg mt-2">
              Thank you for applying to the Bong County Women and Youth Development Cooperration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your application has been submitted and is currently <span className="font-semibold text-foreground">pending review</span>.
            </p>
            <div className="bg-muted rounded-lg p-6 max-w-sm mx-auto inline-block border border-border/50">
              <p className="text-sm text-muted-foreground mb-1">Your Application Reference ID</p>
              <p className="text-3xl font-mono font-bold tracking-widest text-foreground">#{successId}</p>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-4">
              Please save this reference number. Our team will contact you regarding the next steps in the membership process.
            </p>
          </CardContent>
          <CardFooter className="justify-center flex-wrap gap-3 pt-8">
            <Button onClick={() => setSuccessId(null)} variant="outline">
              Submit Another Application
            </Button>
            <Link href={`/member-id/${successId}`}>
              <Button variant="secondary" className="gap-2">
                <CreditCard className="w-4 h-4" />
                View Digital ID Card
              </Button>
            </Link>
            <Link href={`/applications/${successId}`} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
              View Application Status
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">Membership Application</h1>
           <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Join the Bong County Women and Youth Development Cooperration. Together we build stronger communities.
        </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Questions marked with <span className="font-bold text-destructive">*</span> are required.
          </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          {/* SECTION 1: Contact Details */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 w-full bg-primary" />
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
              <CardDescription>Your primary contact and location information.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 077 123 4567" type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="your.email@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countryState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country / State <span className="text-destructive">*</span></FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('county', '');
                        form.setValue('district', '');
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country or state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Liberia">Liberia</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Ghana">Ghana</SelectItem>
                        <SelectItem value="Nigeria">Nigeria</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="county"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Residence County <span className="text-destructive">*</span></FormLabel>
                    {form.watch('countryState') === 'Liberia' ? (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('district', '');
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your county" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LIBERIA_COUNTIES.map((county) => (
                            <SelectItem key={county} value={county}>{county}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input placeholder="Enter your county or state" {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      District {form.watch('countryState') === 'Liberia' && <span className="text-destructive">*</span>}
                      {form.watch('countryState') !== 'Liberia' && <span className="text-muted-foreground text-xs"> (Optional)</span>}
                    </FormLabel>
                    {form.watch('countryState') === 'Liberia' ? (
                      <Select value={field.value} onValueChange={field.onChange} disabled={!form.watch('county')}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={form.watch('county') ? 'Select your district' : 'Select a county first'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(LIBERIA_DISTRICTS[form.watch('county')] ?? []).map((district) => (
                            <SelectItem key={district} value={district}>{district}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input placeholder="Enter your district" {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="town"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Town <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Gbarnga" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Emergency Contact */}
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Full name of contact person" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Phone <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 077 987 6543" type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* SECTION 2: Personal Profile */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 w-full bg-primary" />
            <CardHeader>
              <CardTitle>Personal Profile</CardTitle>
              <CardDescription>Tell us a little more about yourself.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Gender <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="M" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Male</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="F" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Female</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-0 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleDobChange(e);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input type="number" readOnly className="bg-muted" {...field} />
                      </FormControl>
                      <FormDescription>Auto-calculated</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="educationalBackground"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Educational Background <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EDUCATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occupation <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Teacher, Farmer, Business owner" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberOfChildren"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Children <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="affiliateGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affiliate Group/Org <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter organization name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Passport Photo */}
              <div className="md:col-span-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Passport Photo <span className="text-muted-foreground text-xs">(Optional)</span>
                  </label>
                  <div
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-md p-6 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {photoFile ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={URL.createObjectURL(photoFile)}
                          alt="Preview"
                          className="h-16 w-16 object-cover rounded-md border border-border"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{photoFile.name}</p>
                          <button
                            type="button"
                            className="text-xs text-destructive hover:underline mt-1"
                            onClick={(e) => { e.stopPropagation(); setPhotoFile(null); }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-7 w-7 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                          Click to upload a passport-size photo
                        </p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or WEBP. You may also submit your photo later when visiting the office.
                  </p>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3 & 4: Membership Type & Interests */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="h-2 w-full bg-primary" />
              <CardHeader>
                <CardTitle>Membership Type</CardTitle>
                <CardDescription>Select your desired membership category.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="membershipType"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-3"
                        >
                          <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm cursor-pointer hover:bg-muted/50 transition-colors">
                            <FormControl>
                              <RadioGroupItem value="individual" className="mt-1" />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="font-semibold cursor-pointer">Individual / Regular</FormLabel>
                              <FormDescription>$20 LD registration fee</FormDescription>
                            </div>
                          </FormItem>
                          <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm cursor-pointer hover:bg-muted/50 transition-colors">
                            <FormControl>
                              <RadioGroupItem value="group" className="mt-1" />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="font-semibold cursor-pointer">Group / Regular</FormLabel>
                              <FormDescription>For organizations and collectives</FormDescription>
                            </div>
                          </FormItem>
                          <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm cursor-pointer hover:bg-muted/50 transition-colors">
                            <FormControl>
                              <RadioGroupItem value="associate" className="mt-1" />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="font-semibold cursor-pointer">Associate Membership</FormLabel>
                              <FormDescription>For supporting partners</FormDescription>
                            </div>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="h-2 w-full bg-primary" />
              <CardHeader>
                <CardTitle>Interest Categories</CardTitle>
                <CardDescription>Select all areas that apply.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="interestCategories"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormMessage />
                      </div>
                      <div className="space-y-3">
                        {[
                          { id: 'A', label: 'Loans' },
                          { id: 'AB', label: 'Group Participation & Development' },
                          { id: 'AC', label: 'Personal Development and Training' },
                          { id: 'AD', label: 'Volunteerism' },
                          { id: 'AE', label: 'General Benefits' },
                        ].map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="interestCategories"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id as any)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, item.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== item.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer leading-tight">
                                    <span className="font-medium text-muted-foreground mr-2">{item.id}:</span>
                                    {item.label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* SECTION 5: Agreement */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 w-full bg-primary" />
            <CardHeader>
              <CardTitle>Term Agreement</CardTitle>
              <CardDescription>Please review and sign to complete your application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-6 rounded-md text-sm leading-relaxed border border-border/50 italic font-serif">
                "I hereby agree to be a member of the Bong County Women and Youth Cooperation (BWYDC). I have completed the Introductory meeting prescribed for prospective members, and I understand the purpose and/or objectives of this cooperation. I agree to: comply with the Cooperation's Guiding Principles and By-Laws; attend meetings, conferences and/or seminars; and participate in the planned savings program."
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="onBehalfOf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>On behalf of <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Name of organization or person" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="residentOf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resident of <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Your town/city of residence" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sharesContribution"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Shares Contribution <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Planned contribution details" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 border-t border-border space-y-6">
                <FormField
                  control={form.control}
                  name="signatureName"
                  render={({ field }) => (
                    <FormItem className="max-w-md">
                      <FormLabel>Signature (Type full name) <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Type your full name to sign" className="font-serif italic text-lg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Newsletter */}
                <FormField
                  control={form.control}
                  name="newsletterSubscribe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-secondary/30 p-4 rounded-md border border-border/40">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="font-semibold cursor-pointer">
                          Subscribe to our newsletter
                        </FormLabel>
                        <FormDescription>
                          By subscribing to our newsletter, you agree to receive regular updates about our work.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agreeToTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-primary/5 p-4 rounded-md border border-primary/20">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="font-semibold cursor-pointer">
                          I agree to the terms stated above
                        </FormLabel>
                        <FormDescription>
                          By checking this box and submitting this form, you confirm that all information provided is accurate and you agree to the membership terms.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-6 flex justify-end border-t border-border/50">
              <Button
                type="submit"
                size="lg"
                disabled={createApplication.isPending}
                className="w-full md:w-auto px-8 py-6 text-lg font-bold shadow-md hover:shadow-lg transition-all"
              >
                {createApplication.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </CardFooter>
          </Card>

        </form>
      </Form>
    </div>
  );
}
