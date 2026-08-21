import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/Home';
import ApplicationsList from '@/pages/ApplicationsList';
import ApplicationDetail from '@/pages/ApplicationDetail';
import MemberIDCard from '@/pages/MemberIDCard';
import FormsManager from '@/pages/FormsManager';
import PublicForm from '@/pages/PublicForm';
import GroupChats from '@/pages/GroupChats';
import ChatRoom from '@/pages/ChatRoom';
import Login, { isAdminAuthenticated } from '@/pages/Login';
import { Shell } from '@/components/layout/Shell';
import {
  Route,
  Switch,
  useLocation,
  Redirect,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isAdminAuthenticated()) {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Login — no shell */}
        <Route path="/login" component={Login} />

        {/* Member ID card — public, no shell nav */}
        <Route path="/member-id/:id" component={MemberIDCard} />

        {/* Public custom form — no shell nav */}
        <Route path="/f/:slug" component={PublicForm} />

        {/* Group chat room — public via invite link, no shell nav */}
        <Route path="/chat/:token" component={ChatRoom} />

        {/* All other routes — inside Shell */}
        <Route>
          <Shell>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/applications" component={() => <AdminRoute component={ApplicationsList} />} />
              <Route path="/applications/:id" component={() => <AdminRoute component={ApplicationDetail} />} />
              <Route path="/forms" component={() => <AdminRoute component={FormsManager} />} />
              <Route path="/groups" component={() => <AdminRoute component={GroupChats} />} />
              <Route component={NotFound} />
            </Switch>
          </Shell>
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
