import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { DemoProvider, useDemo } from '@/state/store';
import { ThemeProvider } from '@/state/theme';
import { isRoleKey } from '@/data/roles';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { Pipeline } from '@/pages/Pipeline';
import { Workflow } from '@/pages/Workflow';
import { Agents } from '@/pages/Agents';
import { Submission } from '@/pages/Submission';
import { Suppliers } from '@/pages/Suppliers';
import { Library } from '@/pages/Library';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';
import { Guard } from '@/pages/Restricted';
import { IntakeList, IntakeReview } from '@/pages/Intake';

function DashboardRoute() {
  const { role } = useParams();
  const { state, setRole } = useDemo();
  useEffect(() => {
    if (isRoleKey(role) && role !== state.role) setRole(role);
  }, [role, state.role, setRole]);
  if (!isRoleKey(role)) return <Navigate to={`/dashboard/${state.role}`} replace />;
  return <Dashboard role={role} />;
}

function Home() {
  const { state } = useDemo();
  return <Navigate to={`/dashboard/${state.role}`} replace />;
}

export function App() {
  return (
    <ThemeProvider>
      <DemoProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Home />} />
              <Route path="dashboard/:role" element={<DashboardRoute />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="workflow" element={<Workflow />} />
              <Route path="agents" element={<Guard page="agents"><Agents /></Guard>} />
              <Route path="submission" element={<Guard page="submission"><Submission /></Guard>} />
              <Route path="suppliers" element={<Guard page="suppliers"><Suppliers /></Guard>} />
              <Route path="library" element={<Guard page="library"><Library /></Guard>} />
              <Route path="intake" element={<Guard page="intake"><IntakeList /></Guard>} />
              <Route path="intake/:id" element={<Guard page="intake"><IntakeReview /></Guard>} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DemoProvider>
    </ThemeProvider>
  );
}
