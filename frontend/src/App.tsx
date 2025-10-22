import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Loader from './components/Loader';
import MainLayout from './layouts/MainLayout';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const FinancialStatementsPage = lazy(() => import('./pages/FinancialStatementsPage'));
const RunwayCalculatorPage = lazy(() => import('./pages/RunwayCalculatorPage'));
const FinancialModelingPage = lazy(() => import('./pages/FinancialModelingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const OauthCallbackPage = lazy(() => import('./pages/OauthCallbackPage'));

const App = () => {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/oauth/callback" element={<OauthCallbackPage />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/financial-statements" element={<FinancialStatementsPage />} />
          <Route path="/runway-calculator" element={<RunwayCalculatorPage />} />
          <Route path="/financial-modeling" element={<FinancialModelingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
