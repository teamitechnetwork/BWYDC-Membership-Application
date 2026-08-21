import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'wouter';
import { getApiBaseUrl } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  MessagesSquare, Send, ImagePlus, Paperclip, Users, Phone, Video, PhoneOff,
  Mic, MicOff, VideoOff, MonitorUp, MonitorX, Download, XCircle, LogIn,
  Trash2, UserX, X,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
 * Types & helpers
 * ──────────────────────────────────────────────────────────────────────────── */

interface ChatMessage {
  id: number;
  memberId: number;
  memberName: string;
  isAdmin: boolean;
  kind: 'text' | 'image' | 'file';
  content: string;
  fileName: string | null;
  createdAt: string;
}

interface ChatMember {
  id: number;
  name: string;
  isAdmin: boolean;
  isMuted: boolean;
  online: boolean;
}

interface ActiveCall {
  kind: 'audio' | 'video';
  startedBy: number;
  startedAt: string;
}

interface ChatState {
  me: { id: number; name: string; isAdmin: boolean; isMuted: boolean };
  groupName: string;
  activeCall: ActiveCall | null;
  messages: ChatMessage[];
  deletedMessageIds: number[];
  members: ChatMember[];
}

const api = (path: string) => `${getApiBaseUrl()}/api${path}`;

async function memberFetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(api(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Member-Token': token,
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body;
}

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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    // Free public TURN relay (Open Relay) — lets audio/video flow when a
    // direct peer-to-peer connection is blocked (mobile data, strict NATs).
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────────────────────── */

export default function ChatRoom() {
  const { token: inviteToken } = useParams<{ token: string }>();
  const storageKey = `chat-token-${inviteToken}`;
  const [memberToken, setMemberToken] = useState<string | null>(() => localStorage.getItem(storageKey));

  if (!memberToken) {
    return <JoinScreen inviteToken={inviteToken!} onJoined={(t) => {
      localStorage.setItem(storageKey, t);
      setMemberToken(t);
    }} />;
  }
  return <Room memberToken={memberToken} onTokenInvalid={() => {
    localStorage.removeItem(storageKey);
    setMemberToken(null);
  }} />;
}

/* ── Join screen ─────────────────────────────────────────────────────────── */

function JoinScreen({ inviteToken, onJoined }: { inviteToken: string; onJoined: (t: string) => void }) {
  const [info, setInfo] = useState<{ name: string; memberCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch(api(`/public/chat/info/${inviteToken}`))
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'This invite link is not valid');
        setInfo(body);
      })
      .catch((e: Error) => setError(e.message));
  }, [inviteToken]);

  const join = async () => {
    if (!name.trim()) return;
    setJoining(true);
    try {
      const res = await fetch(api(`/public/chat/join/${inviteToken}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not join');
      onJoined(body.memberToken);
    } catch (e) {
      toast.error((e as Error).message);
      setJoining(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <XCircle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-bold">Invite link not valid</h2>
        <p className="text-muted-foreground text-sm max-w-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background px-4">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="text-center">
          <MessagesSquare className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle className="text-xl">{info ? info.name : 'Loading…'}</CardTitle>
          {info && (
            <p className="text-sm text-muted-foreground">
              You've been invited to join this BWYDC group chat
              {info.memberCount > 0 && <> · {info.memberCount} member{info.memberCount !== 1 ? 's' : ''}</>}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Enter your name" value={name} maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') join(); }} />
          <Button className="w-full gap-2" disabled={!name.trim() || joining || !info} onClick={join}>
            <LogIn className="h-4 w-4" /> {joining ? 'Joining…' : 'Join Group'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Chat room ───────────────────────────────────────────────────────────── */

function Room({ memberToken, onTokenInvalid }: { memberToken: string; onTokenInvalid: () => void }) {
  const [state, setState] = useState<ChatState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [inCall, setInCall] = useState(false);
  const lastMsgId = useRef(0);
  const firstMsgId = useRef(0); // oldest cached message — deletion sync range
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const poll = useCallback(async () => {
    try {
      const s: ChatState = await memberFetch(
        memberToken,
        `/public/chat/state?after=${lastMsgId.current}&min=${firstMsgId.current}`,
      );
      const deleted = new Set(s.deletedMessageIds ?? []);
      if (s.messages.length || deleted.size) {
        if (s.messages.length) {
          lastMsgId.current = s.messages[s.messages.length - 1].id;
          if (!firstMsgId.current) firstMsgId.current = s.messages[0].id;
        }
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...s.messages.filter((m) => !seen.has(m.id))]
            .filter((m) => !deleted.has(m.id));
        });
      }
      setState(s);
    } catch (e) {
      if ((e as { status?: number }).status === 401) onTokenInvalid();
    }
  }, [memberToken, onTokenInvalid]);

  useEffect(() => {
    poll();
    pollTimer.current = setInterval(poll, 2500);
    return () => clearInterval(pollTimer.current);
  }, [poll]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  // When the call ends (activeCall gone), reset local call participation so
  // a future call starts from a clean state.
  const activeCallKey = state?.activeCall ? state.activeCall.startedAt : null;
  useEffect(() => {
    if (!activeCallKey) setInCall(false);
  }, [activeCallKey]);

  const sendMessage = async (kind: 'text' | 'image' | 'file', content: string, fileName?: string) => {
    setSending(true);
    try {
      await memberFetch(memberToken, '/public/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ kind, content, ...(fileName ? { fileName } : {}) }),
      });
      await poll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const sendText = () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    sendMessage('text', t);
  };

  const sendImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      sendMessage('image', await readImageResized(file, 1600));
    } catch (e) { toast.error((e as Error).message); }
  };

  const sendFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Files can be up to 5 MB'); return; }
    try {
      sendMessage('file', await readFileAsDataUrl(file), file.name);
    } catch (e) { toast.error((e as Error).message); }
  };

  const deleteMessage = async (id: number) => {
    try {
      await memberFetch(memberToken, `/public/chat/messages/${id}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (e) { toast.error((e as Error).message); }
  };

  const setMemberMuted = async (id: number, muted: boolean) => {
    try {
      await memberFetch(memberToken, `/public/chat/members/${id}/mute`, {
        method: 'POST', body: JSON.stringify({ muted }),
      });
      toast.success(muted ? 'Member muted' : 'Member unmuted');
      await poll();
    } catch (e) { toast.error((e as Error).message); }
  };

  const removeMember = async (id: number, name: string) => {
    if (!window.confirm(`Remove ${name} from this group? Their messages will also be removed.`)) return;
    try {
      await memberFetch(memberToken, `/public/chat/members/${id}`, { method: 'DELETE' });
      toast.success(`${name} was removed`);
      await poll();
    } catch (e) { toast.error((e as Error).message); }
  };

  const startCall = async (kind: 'audio' | 'video') => {
    try {
      await memberFetch(memberToken, '/public/chat/call/start', {
        method: 'POST', body: JSON.stringify({ kind }),
      });
      // The call banner appears; the admin joins through it like everyone
      // else so media + signaling are set up through the one join path.
      await poll();
    } catch (e) { toast.error((e as Error).message); }
  };

  const endCallForAll = async () => {
    try {
      await memberFetch(memberToken, '/public/chat/call/end', { method: 'POST' });
      setInCall(false);
      await poll();
    } catch (e) { toast.error((e as Error).message); }
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const onlineCount = state.members.filter((m) => m.online).length;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-primary/5 px-4 py-3 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h1 className="font-bold truncate flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-primary shrink-0" /> {state.groupName}
          </h1>
          <p className="text-xs text-muted-foreground">
            {state.members.length} member{state.members.length !== 1 ? 's' : ''} · {onlineCount} online
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {state.me.isAdmin && !state.activeCall && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => startCall('audio')} title="Start audio call">
                <Phone className="h-4 w-4" /> <span className="hidden sm:inline">Audio</span>
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => startCall('video')} title="Start video call">
                <Video className="h-4 w-4" /> <span className="hidden sm:inline">Video</span>
              </Button>
            </>
          )}
          <Button size="sm" variant={showMembers ? 'secondary' : 'ghost'} onClick={() => setShowMembers((v) => !v)} title="Members">
            <Users className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Active call banner / panel */}
      {state.activeCall && (
        <CallPanel
          memberToken={memberToken}
          me={state.me}
          call={state.activeCall}
          members={state.members}
          joined={inCall}
          onJoin={() => setInCall(true)}
          onLeave={() => setInCall(false)}
          onEndForAll={endCallForAll}
        />
      )}

      <div className="flex-1 flex min-h-0 relative">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-10">
                No messages yet — say hello!
              </p>
            )}
            {messages.map((m) => {
              const mine = m.memberId === state.me.id;
              const canDelete = mine || state.me.isAdmin;
              return (
                <div key={m.id} className={`group flex items-center gap-1.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                  {canDelete && mine && (
                    <button onClick={() => deleteMessage(m.id)} title="Delete message"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div className={`max-w-[80%] sm:max-w-[65%] rounded-2xl px-3.5 py-2 ${mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                    {!mine && (
                      <div className="text-[11px] font-semibold mb-0.5 opacity-80">
                        {m.memberName}{m.isAdmin && <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0 align-middle">Admin</Badge>}
                      </div>
                    )}
                    {m.kind === 'text' && <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}
                    {m.kind === 'image' && (
                      <a href={m.content} target="_blank" rel="noopener noreferrer">
                        <img src={m.content} alt="Shared" className="rounded-lg max-h-64 max-w-full" />
                      </a>
                    )}
                    {m.kind === 'file' && (
                      <a href={m.content} download={m.fileName ?? 'file'}
                        className={`flex items-center gap-2 text-sm underline underline-offset-2 ${mine ? '' : 'text-primary'}`}>
                        <Download className="h-4 w-4 shrink-0" /> {m.fileName ?? 'Download file'}
                      </a>
                    )}
                    <p className={`text-[10px] mt-1 ${mine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {timeOf(m.createdAt)}
                    </p>
                  </div>
                  {canDelete && !mine && (
                    <button onClick={() => deleteMessage(m.id)} title="Delete message (admin)"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Composer */}
          {state.me.isMuted ? (
            <div className="border-t px-3 py-3 text-center text-sm text-muted-foreground shrink-0">
              <MicOff className="h-4 w-4 inline mr-1.5 align-text-bottom" />
              You have been muted by the admin and cannot send messages.
            </div>
          ) : (
          <div className="border-t px-3 py-2.5 flex items-center gap-1.5 shrink-0">
            <label className="h-9 w-9 rounded-md flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Send image">
              <ImagePlus className="h-5 w-5" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { sendImage(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <label className="h-9 w-9 rounded-md flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Send file">
              <Paperclip className="h-5 w-5" />
              <input type="file" className="hidden" onChange={(e) => { sendFile(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <Input className="flex-1" placeholder="Type a message…" value={text} maxLength={5000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }} />
            <Button size="icon" disabled={!text.trim() || sending} onClick={sendText}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          )}
        </div>

        {/* Members sidebar (overlay on mobile) */}
        {showMembers && (
          <aside className="w-64 border-l overflow-y-auto shrink-0 bg-background max-sm:absolute max-sm:inset-y-0 max-sm:right-0 max-sm:z-30 max-sm:shadow-xl">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Members</p>
              <button className="sm:hidden text-muted-foreground" onClick={() => setShowMembers(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            {state.members.map((m) => (
              <div key={m.id} className="px-4 py-2 flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 rounded-full shrink-0 ${m.online ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                <span className="truncate">{m.name}</span>
                {m.isAdmin && <Badge variant="secondary" className="text-[9px] px-1 py-0">Admin</Badge>}
                {m.isMuted && <Badge variant="outline" className="text-[9px] px-1 py-0">Muted</Badge>}
                {state.me.isAdmin && !m.isAdmin && (
                  <span className="ml-auto flex items-center gap-1 shrink-0">
                    <button title={m.isMuted ? 'Unmute member' : 'Mute member'}
                      onClick={() => setMemberMuted(m.id, !m.isMuted)}
                      className={`p-1 rounded hover:bg-muted ${m.isMuted ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {m.isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </button>
                    <button title="Remove member" onClick={() => removeMember(m.id, m.name)}
                      className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-destructive">
                      <UserX className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Call panel — WebRTC mesh with polling-based signaling
 * ──────────────────────────────────────────────────────────────────────────── */

interface Signal {
  id: number;
  fromMember: number;
  toMember: number | null;
  type: 'call-join' | 'call-leave' | 'offer' | 'answer' | 'ice';
  payload: unknown;
}

function CallPanel({
  memberToken, me, call, members, joined, onJoin, onLeave, onEndForAll,
}: {
  memberToken: string;
  me: { id: number; name: string; isAdmin: boolean };
  call: ActiveCall;
  members: ChatMember[];
  joined: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onEndForAll: () => void;
}) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(new Map());
  const [remoteBump, setRemoteBump] = useState(0); // re-render when tracks change inside a stream

  const localStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<number, RTCPeerConnection>>(new Map());
  // Perfect-negotiation state per peer.
  const makingOffer = useRef<Map<number, boolean>>(new Map());
  const signalCursor = useRef(0);
  const signalTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  // ICE candidates that arrive before the peer's remote description is set.
  const pendingIce = useRef<Map<number, RTCIceCandidateInit[]>>(new Map());
  const memberNames = useRef<Map<number, string>>(new Map());
  members.forEach((m) => memberNames.current.set(m.id, m.name));

  const canShareScreen =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    'getDisplayMedia' in navigator.mediaDevices;

  const sendSignal = useCallback(
    (toMember: number | null, type: Signal['type'], payload?: unknown) =>
      memberFetch(memberToken, '/public/chat/signals', {
        method: 'POST',
        body: JSON.stringify({ toMember, type, payload: payload ?? null }),
      }).catch(() => { /* transient signaling errors are retried by renegotiation */ }),
    [memberToken],
  );

  const closePeer = useCallback((peerId: number) => {
    peers.current.get(peerId)?.close();
    peers.current.delete(peerId);
    makingOffer.current.delete(peerId);
    pendingIce.current.delete(peerId);
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  const createPeer = useCallback((peerId: number): RTCPeerConnection => {
    const existing = peers.current.get(peerId);
    if (existing) return existing;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peers.current.set(peerId, pc);

    const stream = localStream.current;
    if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    // If we were already sharing our screen when this peer joined, make sure
    // the screen (not the camera) is what they receive.
    const screenTrack = screenStream.current?.getVideoTracks()[0];
    if (screenTrack && screenStream.current) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(screenTrack);
      else pc.addTrack(screenTrack, screenStream.current);
    }

    // Renegotiate whenever tracks are added/changed (camera on, screen share…).
    pc.onnegotiationneeded = async () => {
      try {
        makingOffer.current.set(peerId, true);
        await pc.setLocalDescription();
        sendSignal(peerId, 'offer', pc.localDescription);
      } catch { /* renegotiation retried on next change */ }
      finally { makingOffer.current.set(peerId, false); }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(peerId, 'ice', e.candidate.toJSON());
    };
    pc.ontrack = (e) => {
      const remote = e.streams[0] ?? new MediaStream([e.track]);
      setRemoteStreams((prev) => new Map(prev).set(peerId, remote));
      setRemoteBump((n) => n + 1);
      e.track.onmute = () => setRemoteBump((n) => n + 1);
      e.track.onunmute = () => setRemoteBump((n) => n + 1);
      e.track.onended = () => setRemoteBump((n) => n + 1);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') closePeer(peerId);
    };
    return pc;
  }, [sendSignal, closePeer]);

  const flushPendingIce = useCallback(async (peerId: number, pc: RTCPeerConnection) => {
    const queued = pendingIce.current.get(peerId);
    if (!queued) return;
    pendingIce.current.delete(peerId);
    for (const c of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
  }, []);

  const handleSignal = useCallback(async (s: Signal) => {
    try {
      if (s.type === 'call-join') {
        // A newcomer announced themselves: create a connection to them. Our
        // tracks are added in createPeer, which triggers negotiationneeded and
        // sends them an offer. Glare is resolved by the polite-peer rule below.
        createPeer(s.fromMember);
        return;
      }
      if (s.type === 'call-leave') { closePeer(s.fromMember); return; }
      if (s.type === 'offer') {
        const pc = createPeer(s.fromMember);
        // Perfect negotiation: the higher member id is the "polite" peer and
        // rolls back its own offer on collision; the impolite peer ignores.
        const polite = me.id > s.fromMember;
        const collision =
          makingOffer.current.get(s.fromMember) || pc.signalingState !== 'stable';
        if (!polite && collision) return;
        await pc.setRemoteDescription(s.payload as RTCSessionDescriptionInit);
        await flushPendingIce(s.fromMember, pc);
        await pc.setLocalDescription();
        sendSignal(s.fromMember, 'answer', pc.localDescription);
        return;
      }
      if (s.type === 'answer') {
        const pc = peers.current.get(s.fromMember);
        if (!pc || pc.signalingState !== 'have-local-offer') return;
        await pc.setRemoteDescription(s.payload as RTCSessionDescriptionInit);
        await flushPendingIce(s.fromMember, pc);
        return;
      }
      if (s.type === 'ice') {
        const pc = peers.current.get(s.fromMember);
        const candidate = s.payload as RTCIceCandidateInit;
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        } else {
          // Buffer until the offer/answer for this peer has been applied.
          const queued = pendingIce.current.get(s.fromMember) ?? [];
          queued.push(candidate);
          pendingIce.current.set(s.fromMember, queued);
        }
      }
    } catch {
      // Ignore malformed/late signals; connections re-establish on next join.
    }
  }, [me.id, createPeer, closePeer, sendSignal, flushPendingIce]);

  const AUDIO_CONSTRAINTS = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

  const joinCall = async () => {
    let stream: MediaStream | null = null;
    let withVideo = call.kind === 'video';
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: withVideo ? { facingMode: 'user' } : false,
      });
    } catch {
      if (withVideo) {
        // No camera (or camera blocked) — fall back to audio only.
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
          withVideo = false;
          toast.info('Joined without camera — you can turn it on later if available.');
        } catch { /* handled below */ }
      }
    }
    if (!stream) {
      toast.error('Could not access your microphone. Please allow access and try again.');
      return;
    }
    localStream.current = stream;
    setMicOn(true);
    setCamOn(withVideo);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    // Advance the signal cursor past history, then announce ourselves.
    try {
      const res = await memberFetch(memberToken, '/public/chat/signals?after=0');
      const sigs: Signal[] = res.signals ?? [];
      signalCursor.current = sigs.length ? sigs[sigs.length - 1].id : 0;
    } catch { signalCursor.current = 0; }

    await sendSignal(null, 'call-join');
    signalTimer.current = setInterval(async () => {
      try {
        const res = await memberFetch(memberToken, `/public/chat/signals?after=${signalCursor.current}`);
        for (const s of (res.signals ?? []) as Signal[]) {
          signalCursor.current = Math.max(signalCursor.current, s.id);
          await handleSignal(s);
        }
      } catch { /* transient poll error */ }
    }, 1500);
    onJoin();
  };

  const cleanup = useCallback(() => {
    clearInterval(signalTimer.current);
    peers.current.forEach((pc) => pc.close());
    peers.current.clear();
    makingOffer.current.clear();
    pendingIce.current.clear();
    setRemoteStreams(new Map());
    localStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    screenStream.current = null;
    setSharing(false);
    setCamOn(false);
  }, []);

  const leaveCall = () => {
    sendSignal(null, 'call-leave');
    cleanup();
    onLeave();
  };

  // If the admin ends the call while we're in it, tear down.
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // (Re)attach the local preview whenever the self-video element mounts or the
  // active local stream changes (join, camera toggle, screen share).
  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    const src = screenStream.current ?? localStream.current;
    if (src && el.srcObject !== src) {
      el.srcObject = src;
      el.play().catch(() => {});
    }
  }, [joined, camOn, sharing]);

  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };

  /** Camera works in both audio and video calls: if we have no camera track
   *  yet, request one and send it to every peer (renegotiation kicks in). */
  const toggleCam = async () => {
    const stream = localStream.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
      return;
    }
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      const camTrack = camStream.getVideoTracks()[0];
      stream.addTrack(camTrack);
      peers.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(camTrack);
        else pc.addTrack(camTrack, stream);
      });
      if (localVideoRef.current && !screenStream.current) localVideoRef.current.srcObject = stream;
      setCamOn(true);
    } catch {
      toast.error('Could not access your camera. Please allow camera access and try again.');
    }
  };

  const replaceVideoTrack = (track: MediaStreamTrack | null, stream: MediaStream | null) => {
    peers.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(track);
      } else if (track && stream) {
        pc.addTrack(track, stream); // triggers renegotiation
      }
    });
  };

  const startScreenShare = async () => {
    if (!canShareScreen) {
      toast.error('Screen sharing is not supported on this device/browser. It works on desktop Chrome, Edge, Firefox and Safari.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStream.current = stream;
      const track = stream.getVideoTracks()[0];
      replaceVideoTrack(track, stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setSharing(true);
      track.onended = () => stopScreenShare();
    } catch { /* user cancelled */ }
  };

  const stopScreenShare = () => {
    screenStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current = null;
    const cam = localStream.current?.getVideoTracks()[0] ?? null;
    replaceVideoTrack(cam && cam.enabled ? cam : null, localStream.current);
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;
    setSharing(false);
  };

  /* ── Render ── */

  if (!joined) {
    return (
      <div className="bg-green-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <p className="text-sm font-medium flex items-center gap-2">
          {call.kind === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
          {call.kind === 'video' ? 'Video' : 'Audio'} call in progress
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={joinCall}>
            <Phone className="h-3.5 w-3.5" /> Join Call
          </Button>
          {me.isAdmin && (
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={onEndForAll}>
              <PhoneOff className="h-3.5 w-3.5" /> End
            </Button>
          )}
        </div>
      </div>
    );
  }

  const participants = [...remoteStreams.entries()];
  void remoteBump; // consumed so track changes re-render the tiles

  return (
    <div className="bg-zinc-900 text-white shrink-0">
      {/* Video grid / audio avatars */}
      <div className={`p-3 grid gap-2 ${participants.length === 0 ? 'grid-cols-1' : participants.length < 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {/* Self tile */}
        <div className="relative rounded-lg overflow-hidden bg-zinc-800 aspect-video flex items-center justify-center">
          {(camOn || sharing) ? (
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <AvatarTile name={me.name} />
          )}
          <span className="absolute bottom-1.5 left-2 text-[11px] bg-black/50 rounded px-1.5 py-0.5">
            You{sharing ? ' (sharing)' : ''}
          </span>
        </div>
        {participants.map(([peerId, stream]) => (
          <RemoteTile key={peerId} stream={stream} name={memberNames.current.get(peerId) ?? 'Member'} />
        ))}
        {participants.length === 0 && (
          <p className="text-xs text-zinc-400 self-center px-2">Waiting for others to join the call…</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 pb-3 flex-wrap px-3">
        <Button size="sm" variant={micOn ? 'secondary' : 'destructive'} className="gap-1.5" onClick={toggleMic}>
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />} {micOn ? 'Mute' : 'Unmute'}
        </Button>
        <Button size="sm" variant={camOn ? 'secondary' : 'outline'} className={`gap-1.5 ${camOn ? '' : 'text-zinc-900 bg-white'}`}
          disabled={sharing} title={sharing ? 'Stop sharing to use the camera' : undefined} onClick={toggleCam}>
          {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />} Camera
        </Button>
        {me.isAdmin && canShareScreen && (
          <Button size="sm" variant={sharing ? 'destructive' : 'secondary'} className="gap-1.5"
            onClick={sharing ? stopScreenShare : startScreenShare}>
            {sharing ? <MonitorX className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
            {sharing ? 'Stop Sharing' : 'Share Screen'}
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1.5 text-zinc-900 bg-white" onClick={leaveCall}>
          <PhoneOff className="h-4 w-4" /> Leave
        </Button>
        {me.isAdmin && (
          <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => { cleanup(); onEndForAll(); }}>
            <PhoneOff className="h-4 w-4" /> End for All
          </Button>
        )}
      </div>
    </div>
  );
}

function AvatarTile({ name }: { name: string }) {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-lg font-bold">
      {initials || '?'}
    </div>
  );
}

function RemoteTile({ stream, name }: { stream: MediaStream; name: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(
    () => stream.getVideoTracks().some((t) => t.readyState === 'live' && !t.muted),
  );

  useEffect(() => {
    const update = () =>
      setHasVideo(stream.getVideoTracks().some((t) => t.readyState === 'live' && !t.muted));
    update();
    const tracks = stream.getTracks();
    tracks.forEach((t) => {
      t.addEventListener('mute', update);
      t.addEventListener('unmute', update);
      t.addEventListener('ended', update);
    });
    stream.addEventListener('addtrack', update);
    stream.addEventListener('removetrack', update);
    return () => {
      tracks.forEach((t) => {
        t.removeEventListener('mute', update);
        t.removeEventListener('unmute', update);
        t.removeEventListener('ended', update);
      });
      stream.removeEventListener('addtrack', update);
      stream.removeEventListener('removetrack', update);
    };
  }, [stream]);

  // Attach the stream and make sure playback (audio!) actually starts.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    el.play().catch(() => { /* browser will start playback on next interaction */ });
  }, [stream, hasVideo]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-zinc-800 aspect-video flex items-center justify-center">
      {/* One persistent element carries the audio; it is hidden when there is no video */}
      <video ref={ref} autoPlay playsInline
        className={hasVideo ? 'w-full h-full object-cover' : 'hidden'} />
      {!hasVideo && <AvatarTile name={name} />}
      <span className="absolute bottom-1.5 left-2 text-[11px] bg-black/50 rounded px-1.5 py-0.5">{name}</span>
    </div>
  );
}
