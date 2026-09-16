import { useParams, Link, useLocation } from 'wouter';
import { 
  useGetApplication, 
  getGetApplicationQueryKey,
  useUpdateApplicationStatus,
  useDeleteApplication,
  getListApplicationsQueryKey,
  getGetApplicationStatsQueryKey
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Check, CheckCircle2, Mail, Phone, Printer, Trash2, X, XCircle, FileText, User, MapPin, CreditCard } from 'lucide-react';
import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeleteMemberDialog } from '@/components/DeleteMemberDialog';

export default function ApplicationDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || '0', 10);
  const queryClient = useQueryClient();
  
  const [, navigate] = useLocation();
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isDenyOpen, setIsDenyOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerPosition, setReviewerPosition] = useState('');

  const { data: application, isLoading, error } = useGetApplication(id, {
    query: {
      enabled: !!id,
      queryKey: getGetApplicationQueryKey(id),
    }
  });

  const updateStatus = useUpdateApplicationStatus();
  const deleteApp = useDeleteApplication();

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = () => {
    deleteApp.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success(`Member record permanently deleted.`);
          queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetApplicationStatsQueryKey() });
          navigate('/applications');
        },
        onError: () => {
          toast.error('Failed to delete member record. Please try again.');
        },
      },
    );
  };

  const handleUpdateStatus = (status: 'approved' | 'denied') => {
    if (!reviewerName.trim() || !reviewerPosition.trim()) {
      toast.error('Reviewer name and position are required.');
      return;
    }

    updateStatus.mutate(
      { 
        id, 
        data: { status, reviewerName, reviewerPosition } 
      },
      {
        onSuccess: (updatedData) => {
          toast.success(`Application ${status} successfully.`);
          
          // Update cache locally to avoid refetch cascade
          queryClient.setQueryData(getGetApplicationQueryKey(id), updatedData);
          
          // Invalidate lists quietly
          queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetApplicationStatsQueryKey() });
          
          setIsApproveOpen(false);
          setIsDenyOpen(false);
        },
        onError: (err) => {
          toast.error((err as unknown as { error?: string }).error || err.message || `Failed to update status.`);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground font-medium">Loading application details...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <Card className="border-destructive/50 bg-destructive/5 text-center py-12">
          <CardHeader>
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive text-2xl">Application Not Found</CardTitle>
            <CardDescription className="text-base mt-2">
              The application you are looking for does not exist or an error occurred.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/applications" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Return to Applications
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"><CheckCircle2 className="w-4 h-4 mr-1"/> Approved</Badge>;
      case 'denied':
        return <Badge variant="destructive" className="px-3 py-1 text-sm"><XCircle className="w-4 h-4 mr-1"/> Denied</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 text-sm">Pending Review</Badge>;
    }
  };

  const ReviewForm = ({ action }: { action: 'approve' | 'deny' }) => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">Your Name</Label>
        <Input 
          id="name" 
          value={reviewerName} 
          onChange={(e) => setReviewerName(e.target.value)} 
          className="col-span-3" 
          placeholder="e.g. John Doe"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="position" className="text-right">Position</Label>
        <Input 
          id="position" 
          value={reviewerPosition} 
          onChange={(e) => setReviewerPosition(e.target.value)} 
          className="col-span-3" 
          placeholder="e.g. Membership Chair"
        />
      </div>
    </div>
  );

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 print:py-0 print:px-0">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Link href="/applications" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/member-id/${id}`}>
            <Button variant="outline" size="sm" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <CreditCard className="w-4 h-4" />
              ID Card
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Print Application
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Document Card */}
      <Card className="border-border shadow-md print:shadow-none print:border-none">
        
        {/* Header Section */}
        <div className="bg-primary/5 p-6 md:p-8 border-b border-border/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:bg-transparent print:border-b-2 print:border-black print:pb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{application.fullName}</h1>
              <div className="print:hidden">{getStatusBadge(application.status)}</div>
            </div>
            <p className="text-muted-foreground flex items-center gap-2 print:text-black">
              <FileText className="w-4 h-4" /> 
              Application #{application.id} • Submitted on {format(parseISO(application.submittedAt), 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex flex-col gap-1 text-sm text-right print:text-left print:mt-4">
            <span className="flex items-center gap-2 md:justify-end text-muted-foreground print:text-black">
              <Phone className="w-4 h-4" /> {application.phoneNumber}
            </span>
            {application.emailAddress && (
              <span className="flex items-center gap-2 md:justify-end text-muted-foreground print:text-black">
                <Mail className="w-4 h-4" /> {application.emailAddress}
              </span>
            )}
            <span className="flex items-center gap-2 md:justify-end text-muted-foreground print:text-black">
              <MapPin className="w-4 h-4" /> {(application as any).county || '—'}, {(application as any).countryState || 'Liberia'}
            </span>
          </div>
        </div>

        <CardContent className="p-0 print:p-0">
          
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Column 1: Personal Profile */}
            <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-border/50 print:border-b-0 print:border-r print:border-black/20">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6 text-primary print:text-black">
                <User className="w-5 h-5" /> Personal Profile
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gender</p>
                    <p className="text-base font-semibold">{application.gender === 'M' ? 'Male' : application.gender === 'F' ? 'Female' : 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p className="text-base font-semibold">{format(parseISO(application.dateOfBirth), 'MMM d, yyyy')} ({application.age} yrs)</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Educational Background</p>
                  <p className="text-base font-semibold">{application.educationalBackground}</p>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Marital Status</p>
                    <p className="text-base font-semibold">{application.maritalStatus}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No. of Children</p>
                    <p className="text-base font-semibold">{application.numberOfChildren ?? 'None specified'}</p>
                  </div>
                </div>

                <Separator />
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Affiliate Group/Organization</p>
                  <p className="text-base font-semibold">{application.affiliateGroup || 'None specified'}</p>
                </div>
              </div>
            </div>

            {/* Column 2: Membership Details */}
            <div className="p-6 md:p-8">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6 text-primary print:text-black">
                <FileText className="w-5 h-5" /> Membership Details
              </h3>
              
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Membership Type</p>
                  <div className="inline-flex px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground font-semibold uppercase tracking-wider text-sm">
                    {application.membershipType}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Interest Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {application.interestCategories.map((cat) => (
                      <Badge key={cat} variant="outline" className="bg-background">
                        Category {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div className="bg-muted/50 p-4 rounded-md border border-border/50">
                  <h4 className="font-semibold text-sm mb-2">Term Agreement</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Resident of:</span> {application.residentOf}</p>
                    {application.onBehalfOf && (
                      <p><span className="text-muted-foreground">On behalf of:</span> {application.onBehalfOf}</p>
                    )}
                    {application.sharesContribution && (
                      <p><span className="text-muted-foreground">Shares Contribution:</span> {application.sharesContribution}</p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">Electronically Signed By</p>
                    <p className="font-serif italic text-lg font-semibold text-primary print:text-black">{application.signatureName}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Review Status Section */}
          <div className="border-t border-border/50 p-6 md:p-8 bg-muted/20">
            <h3 className="text-lg font-semibold mb-4">Official Review Section</h3>
            
            {application.status === 'pending' ? (
              <div className="print:hidden">
                <div className="bg-background border border-border rounded-md p-6">
                  <p className="text-sm text-muted-foreground mb-6">This application is awaiting an official decision. Please review the details above and select an action.</p>
                  
                  <div className="flex gap-4">
                    <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                          <Check className="w-4 h-4" /> Approve Application
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Approve Application</DialogTitle>
                          <DialogDescription>
                            You are about to approve {application.fullName}'s membership. Enter your details to record this decision.
                          </DialogDescription>
                        </DialogHeader>
                        <ReviewForm action="approve" />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsApproveOpen(false)}>Cancel</Button>
                          <Button 
                            className="bg-green-600 hover:bg-green-700 text-white" 
                            onClick={() => handleUpdateStatus('approved')}
                            disabled={updateStatus.isPending}
                          >
                            {updateStatus.isPending ? 'Saving...' : 'Confirm Approval'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isDenyOpen} onOpenChange={setIsDenyOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="gap-2">
                          <X className="w-4 h-4" /> Deny Application
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Deny Application</DialogTitle>
                          <DialogDescription>
                            You are about to deny {application.fullName}'s membership. Enter your details to record this decision.
                          </DialogDescription>
                        </DialogHeader>
                        <ReviewForm action="deny" />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDenyOpen(false)}>Cancel</Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleUpdateStatus('denied')}
                            disabled={updateStatus.isPending}
                          >
                            {updateStatus.isPending ? 'Saving...' : 'Confirm Denial'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-md border ${
                application.status === 'approved' 
                  ? 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-300' 
                  : 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-300'
              }`}>
                <div className="flex items-start gap-3">
                  {application.status === 'approved' ? (
                    <CheckCircle2 className="w-6 h-6 mt-0.5 text-green-600 dark:text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 mt-0.5 text-red-600 dark:text-red-500" />
                  )}
                  <div>
                    <h4 className="font-semibold text-base capitalize">Application {application.status}</h4>
                    <p className="text-sm opacity-90 mt-1">
                      Reviewed by: <strong>{application.reviewerName}</strong> ({application.reviewerPosition})
                    </p>
                    {application.reviewDate && (
                      <p className="text-sm opacity-80 mt-1">
                        Date: {format(parseISO(application.reviewDate), 'MMMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Delete confirmation ── */}
      {application && (
        <DeleteMemberDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          memberName={application.fullName}
          memberId={application.id}
          isPending={deleteApp.isPending}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
