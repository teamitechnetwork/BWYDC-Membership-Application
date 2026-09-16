import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiBaseUrl } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  MessagesSquare, Plus, ArrowLeft, Link2, Copy, Trash2, Users, MessageCircle,
  PhoneCall, LogIn,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ChatGroup {
  id: number;
  name: string;
  inviteToken: string;
  memberCount: number;
  messageCount: number;
  activeCall: { kind: 'audio' | 'video' } | null;
  createdAt: string;
}

const api = (path: string) => `${getApiBaseUrl()}/api${path}`;

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

function inviteUrl(token: string): string {
  const base = window.location.origin + (import.meta.env.BASE_URL || '/');
  return `${base.replace(/\/$/, '')}/chat/${token}`;
}

export default function GroupChats() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ChatGroup | null>(null);

  const { data: groups, isLoading } = useQuery<ChatGroup[]>({
    queryKey: ['chat-groups'],
    queryFn: () => jsonFetch(api('/chat/groups')),
  });

  const createGroup = useMutation({
    mutationFn: (name: string) =>
      jsonFetch(api('/chat/groups'), { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
      setCreateOpen(false);
      setNewName('');
      toast.success('Group created! Copy the invite link to add members.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteGroup = useMutation({
    mutationFn: (id: number) => jsonFetch(api(`/chat/groups/${id}`), { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
      setDeleteTarget(null);
      toast.success('Group deleted.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openChat = useMutation({
    mutationFn: (group: ChatGroup) =>
      jsonFetch(api(`/chat/groups/${group.id}/join`), { method: 'POST' }),
    onSuccess: (res: { memberToken: string; inviteToken: string }) => {
      localStorage.setItem(`chat-token-${res.inviteToken}`, res.memberToken);
      navigate(`/chat/${res.inviteToken}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(inviteUrl(token))
      .then(() => toast.success('Invite link copied!'))
      .catch(() => toast.error('Could not copy link'));
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessagesSquare className="h-8 w-8 text-primary" />
            Group Chats
          </h1>
          <p className="text-muted-foreground mt-1">
            Create groups, share invite links, chat with your team, and hold audio/video calls.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/applications">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Group
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : !groups?.length ? (
        <Card className="text-center py-16">
          <CardContent>
            <MessagesSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No groups yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first group chat and share the invite link with your team.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create a Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groups.map((g) => (
            <Card key={g.id} className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg truncate">{g.name}</h3>
                      {g.activeCall && (
                        <Badge className="bg-green-600 text-white gap-1">
                          <PhoneCall className="h-3 w-3" /> Call in progress
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {g.memberCount} member{g.memberCount !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {g.messageCount} message{g.messageCount !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>Created {format(parseISO(g.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    <button
                      onClick={() => copyLink(g.inviteToken)}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono text-primary bg-primary/5 hover:bg-primary/10 rounded-md px-2.5 py-1.5 transition-colors max-w-full"
                      title="Click to copy invite link"
                    >
                      <Link2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{inviteUrl(g.inviteToken)}</span>
                      <Copy className="h-3 w-3 shrink-0 opacity-60" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" className="gap-1.5" disabled={openChat.isPending}
                      onClick={() => openChat.mutate(g)}>
                      <LogIn className="h-3.5 w-3.5" /> Open Chat
                    </Button>
                    <button
                      onClick={() => setDeleteTarget(g)}
                      title="Delete group"
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

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New group chat</DialogTitle>
            <DialogDescription>
              After creating, copy the invite link and share it with your team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input id="group-name" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Retreat 2026 Planning Team"
              onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createGroup.mutate(newName.trim()); }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!newName.trim() || createGroup.isPending}
              onClick={() => createGroup.mutate(newName.trim())}>
              {createGroup.isPending ? 'Creating…' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete "{deleteTarget?.name}"?</DialogTitle>
            <DialogDescription>
              All messages and shared files in this group will be permanently deleted, and the
              invite link will stop working. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteGroup.isPending}
              onClick={() => deleteTarget && deleteGroup.mutate(deleteTarget.id)}>
              {deleteGroup.isPending ? 'Deleting…' : 'Delete Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
