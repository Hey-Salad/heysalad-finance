import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Loader from './components/Loader';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const FinancialStatementsPage = lazy(() => import('./pages/FinancialStatementsPage'));
const RunwayCalculatorPage = lazy(() => import('./pages/RunwayCalculatorPage'));
const FinancialModelingPage = lazy(() => import('./pages/FinancialModelingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

const App = () => {
  return (
    <MainLayout>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/financial-statements" element={<FinancialStatementsPage />} />
          <Route path="/runway-calculator" element={<RunwayCalculatorPage />} />
          <Route path="/financial-modeling" element={<FinancialModelingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
};

export default App;
