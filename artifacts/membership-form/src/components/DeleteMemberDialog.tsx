import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberId: number;
  isPending: boolean;
  onConfirm: () => void;
}

/**
 * Destructive confirmation dialog for permanently deleting a member record.
 * Requires the admin to type the member's EXACT full name to enable deletion.
 */
export function DeleteMemberDialog({
  open, onOpenChange, memberName, memberId, isPending, onConfirm,
}: Props) {
  const [typed, setTyped] = useState('');

  // Clear the input whenever the dialog opens/closes
  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const confirmed = typed === memberName;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isPending) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-destructive text-lg">Delete Member Record</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Member #{String(memberId).padStart(5, '0')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Red warning banner */}
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm text-destructive leading-relaxed space-y-1">
            <p className="font-semibold">This action is permanent and cannot be undone.</p>
            <p>
              All data for <span className="font-bold">{memberName}</span> will be
              permanently erased from BWYDC records — including their personal details,
              status history, and passport photo.
            </p>
          </div>
        </div>

        {/* Name confirmation */}
        <div className="space-y-2">
          <Label htmlFor="confirm-name" className="text-sm font-medium">
            Type the member's full name to confirm:
            <span className="ml-1 font-mono font-bold text-foreground">
              {memberName}
            </span>
          </Label>
          <Input
            id="confirm-name"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type full name exactly…"
            disabled={isPending}
            className={`font-mono ${
              typed.length > 0
                ? confirmed
                  ? 'border-green-500 focus-visible:ring-green-500'
                  : 'border-destructive/50 focus-visible:ring-destructive/50'
                : ''
            }`}
            autoComplete="off"
            spellCheck={false}
          />
          {typed.length > 0 && !confirmed && (
            <p className="text-xs text-destructive">Name does not match — check capitalisation and spelling.</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmed || isPending}
            onClick={onConfirm}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isPending ? 'Deleting…' : 'Permanently Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
