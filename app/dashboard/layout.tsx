'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { FiHome, FiPlus, FiSettings, FiGrid, FiMenu, FiX, FiClock } from 'react-icons/fi';
import ErrorBoundary from '@/components/ErrorBoundary';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: FiHome },
  { label: 'Cadastrar', path: '/dashboard/registrar', icon: FiPlus },
  { label: 'Geral', path: '/dashboard/geral', icon: FiGrid },
  { label: 'Histórico', path: '/dashboard/historicoComparecimento', icon: FiClock },
  { label: 'Configurações', path: '/dashboard/configuracoes', icon: FiSettings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="flex min-h-screen bg-background text-text-base">
      <aside className={cn(
        "hidden md:block w-20 hover:w-64 bg-primary-dark text-white transition-all duration-200 overflow-hidden group",
        "fixed left-0 top-0 h-full z-30"
      )}>
        <div className="flex items-center justify-center h-16 text-lg font-bold border-b border-border">
          <span>SCC</span>
        </div>
        <nav className="mt-4 space-y-1">
          {menuItems.map(({ label, path, icon: Icon }) => {
            const isActive =
              path === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(path);

            return (
              <Link
                key={path}
                href={path}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 text-sm font-medium transition-colors duration-150',
                  'hover:bg-primary',
                  isActive ? 'bg-primary text-white' : 'text-white/70',
                  'group-hover:justify-start'
                )}
              >
                <Icon className="min-w-[20px] text-lg" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-primary-dark text-white z-40 shadow-lg">
        <div className="flex items-center justify-between h-full px-4">
          <h1 className="text-lg font-bold">SCC</h1>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-primary transition-colors"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </header>

      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-30 transition-opacity duration-200 md:hidden",
            isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-primary-dark text-white z-40 md:hidden",
          "transform transition-transform duration-200 ease-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <h2 className="text-lg font-bold">Sistema de Controle</h2>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-primary transition-colors"
            aria-label="Fechar menu"
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="mt-4 space-y-1 px-2">
          {menuItems.map(({ label, path, icon: Icon }) => {
            const isActive =
              path === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(path);

            return (
              <Link
                key={path}
                href={path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium',
                  'transition-colors duration-150',
                  'hover:bg-primary',
                  isActive ? 'bg-primary text-white' : 'text-white/70'
                )}
              >
                <Icon className="text-lg" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <p className="text-xs text-white/60">2024 TJBA</p>
        </div>
      </aside>

      <main className={cn(
        "flex-1 transition-all duration-200",
        "pt-16 md:pt-0",
        "md:ml-20",
        "p-4 md:p-6",
        "overflow-auto"
      )}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
