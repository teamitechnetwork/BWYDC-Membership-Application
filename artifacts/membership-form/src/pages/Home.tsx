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
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  Upload,
} from 'lucide-react';
import { LIBERIA_COUNTIES, LIBERIA_DISTRICTS } from '@/lib/liberia';
import logoPath from '@assets/Retreat_2026__20260808_123924_0000_1786193668114.png';
import sendwaveLogoPath from '@assets/payment-sendwave.png';
import momoLogoPath from '@assets/payment-momo-mtn.png';
import orangeMoneyLogoPath from '@assets/payment-orange-money.png';

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
  'Preparing your membership experience',
  'Loading your application',
  'Almost ready',
];

const WELCOME_SEEN_KEY = 'bwydc-membership-welcome-seen';
const LOADING_DURATION_MS = 2800;

function hasSeenWelcome(): boolean {
  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function markWelcomeAsSeen(): void {
  try {
    window.localStorage.setItem(WELCOME_SEEN_KEY, 'true');
  } catch {
    // Continue normally if browser storage is unavailable.
  }
}

export default function Home() {
  const [entryStage, setEntryStage] = useState<'loading' | 'welcome' | 'form'>('loading');
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const createApplication = useCreateApplication();

  useEffect(() => {
    if (entryStage !== 'loading') return;

    const messageTimer = window.setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % LOADING_MESSAGES.length);
    }, 900);
    const stageTimer = window.setTimeout(() => {
      setEntryStage(hasSeenWelcome() ? 'form' : 'welcome');
    }, LOADING_DURATION_MS);

    return () => {
      window.clearInterval(messageTimer);
      window.clearTimeout(stageTimer);
    };
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

  const handleCancel = () => {
    form.reset();
    setPhotoFile(null);
    setEntryStage('form');
  };

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
              <div className="relative mt-10 flex h-40 w-40 items-center justify-center rounded-full bg-background shadow-[0_0_0_8px_rgba(249,115,22,0.12),0_18px_50px_rgba(0,0,0,0.12)]">
                <svg
                  className="absolute inset-2 h-36 w-36 animate-spin"
                  style={{ animationDuration: '2.4s' }}
                  viewBox="0 0 120 120"
                  role="img"
                  aria-label="Loading application"
                >
                  <circle cx="60" cy="60" r="53" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="5" />
                  <circle
                    cx="60"
                    cy="60"
                    r="53"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeLinecap="round"
                    strokeWidth="5"
                    strokeDasharray="190 145"
                  />
                </svg>
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/80 bg-background shadow-inner shadow-primary/20">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-primary shadow-[0_0_18px_rgba(249,115,22,0.9)]" />
                </div>
              </div>
              <p className="mt-7 min-h-6 text-sm font-semibold text-muted-foreground" aria-live="polite">
                {LOADING_MESSAGES[loadingMessageIndex]}
              </p>
            </>
          ) : (
            <div className="mt-10 animate-in fade-in slide-in-from-bottom-3 duration-500">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">BWYDC Membership</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Welcome, let’s get started
              </h1>
              <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-muted-foreground">
                A few thoughtful questions help us connect you with the right membership experience.
              </p>
              <Button
                type="button"
                size="lg"
                className="mt-8 h-12 rounded-full px-7 text-base font-semibold shadow-lg shadow-primary/20"
                onClick={() => {
                  markWelcomeAsSeen();
                  setEntryStage('form');
                }}
              >
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">Takes about 5 minutes · Your information stays private</p>
            </div>
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
    <div className="min-h-full bg-white">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-8 border-b border-border/70 pb-8 text-center">
        <p className="mb-4 inline-flex bg-[#ff7900] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-sm sm:text-xs">
          BWYDC · Membership application
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Join BWYDC and grow with your community
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Tell us about yourself and how you would like to take part in the Bong County Women and Youth Development Cooperation.
        </p>
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          <span className="text-destructive">*</span> Questions marked with * are required.
        </p>
        <div className="mx-auto mt-6 h-1 w-14 bg-primary" aria-hidden="true" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="reference-form space-y-10">

          {/* SECTION 1: Contact Details */}
          <Card className="overflow-visible rounded-none border-0 bg-transparent shadow-none">
            <CardHeader className="border-b border-border/70 px-0 py-0 pb-3">
              <CardTitle className="text-lg font-bold">Contact details</CardTitle>
              <CardDescription className="mt-1 text-sm">Your primary contact and location information.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-5 gap-y-4 px-0 py-6 sm:grid-cols-2">
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
          <Card className="overflow-visible rounded-none border-0 bg-transparent shadow-none">
            <CardHeader className="border-b border-border/70 px-0 py-0 pb-3">
              <CardTitle className="text-lg font-bold">Personal profile</CardTitle>
              <CardDescription className="mt-1 text-sm">A few details about your background.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-5 gap-y-4 px-0 py-6 sm:grid-cols-2">
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

              <div className="space-y-0 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
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
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
            <Card className="overflow-visible rounded-none border-0 bg-transparent shadow-none">
              <CardHeader className="border-b border-border/70 px-0 py-0 pb-3">
                <CardTitle className="text-lg font-bold">Membership type</CardTitle>
                <CardDescription className="mt-1 text-sm">Choose the option that best fits you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-0 py-6">
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
                           <FormItem className="flex cursor-pointer items-start space-x-3 space-y-0 rounded-none border border-border/70 bg-white p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
                            <FormControl>
                              <RadioGroupItem value="individual" className="mt-1" />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="font-semibold cursor-pointer">Individual / Regular</FormLabel>
                              <FormDescription>$20 LD registration fee</FormDescription>
                            </div>
                          </FormItem>
                           <FormItem className="flex cursor-pointer items-start space-x-3 space-y-0 rounded-none border border-border/70 bg-white p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
                            <FormControl>
                              <RadioGroupItem value="group" className="mt-1" />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="font-semibold cursor-pointer">Group / Regular</FormLabel>
                              <FormDescription>For organizations and collectives</FormDescription>
                            </div>
                          </FormItem>
                           <FormItem className="flex cursor-pointer items-start space-x-3 space-y-0 rounded-none border border-border/70 bg-white p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
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

            <Card className="overflow-visible rounded-none border-0 bg-transparent shadow-none">
              <CardHeader className="border-b border-border/70 px-0 py-0 pb-3">
                <CardTitle className="text-lg font-bold">Your interests</CardTitle>
                <CardDescription className="mt-1 text-sm">Select every area you’d like to explore.</CardDescription>
              </CardHeader>
              <CardContent className="px-0 py-6">
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
                                  className="flex cursor-pointer flex-row items-start space-x-3 space-y-0 rounded-none border border-transparent p-2 transition-colors hover:border-primary/20 hover:bg-primary/[0.03]"
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
          <Card className="overflow-visible rounded-none border-0 bg-transparent shadow-none">
            <CardHeader className="border-b border-border/70 px-0 py-0 pb-3">
              <CardTitle className="text-lg font-bold">Review & finish</CardTitle>
              <CardDescription className="mt-1 text-sm">One last review, then you’re ready to submit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-0 py-6">
              <div className="border border-black bg-black p-4 text-base leading-7 text-white">
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

              <div className="space-y-6 border-t border-border pt-6">
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 border border-border/70 bg-white p-3">
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
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
          </Card>
          <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleCancel}
              disabled={createApplication.isPending}
              className="rounded-none border-black bg-black px-7 text-white hover:bg-zinc-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={createApplication.isPending}
              className="gap-2 rounded-none px-7 shadow-md shadow-primary/15"
            >
              {createApplication.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  Submit application
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <footer className="mt-12 overflow-hidden rounded-xl bg-zinc-950 px-4 py-5 text-white shadow-lg sm:px-6 sm:py-6">
            <div className="text-center">
              <p className="text-sm font-bold text-white sm:text-base">Registration fee payment methods</p>
              <p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-white/65 sm:text-sm">
                Use any of these trusted payment methods when paying your registration fee.
              </p>
            </div>
            <div className="mt-4 grid w-full grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
              <div className="flex h-16 min-w-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-[#ffeb00] p-2 shadow-sm transition-shadow hover:shadow-md sm:h-20 sm:p-3">
                <img
                  src={sendwaveLogoPath}
                  alt="Sendwave"
                  className="max-h-10 w-auto max-w-[88%] object-contain sm:max-h-12"
                />
              </div>
              <div className="flex h-16 min-w-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-[#ffc20e] p-2 shadow-sm transition-shadow hover:shadow-md sm:h-20 sm:p-3">
                <img
                  src={momoLogoPath}
                  alt="MoMo from MTN"
                  className="max-h-10 w-auto max-w-[88%] object-contain sm:max-h-12"
                />
              </div>
              <div className="flex h-16 min-w-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-[#ff7900] p-2 shadow-sm transition-shadow hover:shadow-md sm:h-20 sm:p-3">
                <img
                  src={orangeMoneyLogoPath}
                  alt="Orange Money"
                  className="max-h-10 w-auto max-w-[92%] object-contain sm:max-h-12"
                />
              </div>
            </div>
          </footer>
        </form>
      </Form>
    </div>
    </div>
  );
}
