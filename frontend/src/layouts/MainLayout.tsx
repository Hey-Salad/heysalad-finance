import { ReactNode, useState } from 'react';
import Sidebar from '../components/navigation/Sidebar';
import TopBar from '../components/navigation/TopBar';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-offwhite text-slate-800">
      <Sidebar />
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="w-64 bg-white">
            <Sidebar />
          </div>
          <div
            aria-hidden="true"
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col">
        <TopBar onMenuToggle={() => setMobileOpen((open) => !open)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:px-12">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
