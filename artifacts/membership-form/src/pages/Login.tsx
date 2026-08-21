import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle } from 'lucide-react';
import logoPath from "@assets/Retreat_2026__20260808_123924_0000_1786193668114.png";
import { getApiBaseUrl } from '@workspace/api-client-react';

/** Mark the session as authenticated in localStorage (client-side route guard). */
export function setAdminAuth() {
  localStorage.setItem('bwydc_admin_auth', '1');
}

/** Clear the client-side auth flag. */
export function clearAdminAuth() {
  localStorage.removeItem('bwydc_admin_auth');
}

/** Quick client-side check — the real authority is the server session cookie. */
export function isAdminAuthenticated() {
  return localStorage.getItem('bwydc_admin_auth') === '1';
}

export default function Login() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        setAdminAuth();
        navigate('/applications');
      } else {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? 'Invalid username or password. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={logoPath} alt="BWYDC Logo" className="h-16 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Bong County Women and Youth Development Cooperration</p>
          </div>
        </div>

        <Card className="border-border/60 shadow-md">
          <CardHeader className="pb-4">
            <div className="mx-auto w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-center text-lg">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your admin credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full font-semibold"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          This portal is for authorised administrators only.
        </p>
      </div>
    </div>
  );
}
