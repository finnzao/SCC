'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  FiHome, FiPlus, FiSettings, FiGrid, FiMenu, FiX, FiClock, FiBookOpen,
  FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';
import ErrorBoundary from '@/components/ErrorBoundary';

type MenuItem = { label: string; path: string; icon: typeof FiHome };

// titulo=null: itens gerais, sem cabecalho de secao
const menuGroups: Array<{ titulo: string | null; items: MenuItem[] }> = [
  {
    titulo: null,
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: FiHome },
      { label: 'Cadastrar', path: '/dashboard/registrar', icon: FiPlus },
    ],
  },
  {
    titulo: 'Pessoas Monitoradas',
    items: [
      { label: 'Geral', path: '/dashboard/geral', icon: FiGrid },
      { label: 'Histórico', path: '/dashboard/historicoComparecimento', icon: FiClock },
    ],
  },
  {
    titulo: 'Execução de Pena',
    items: [
      { label: 'Execuções', path: '/dashboard/execucoes', icon: FiBookOpen },
    ],
  },
];

const configItem: MenuItem = { label: 'Configurações', path: '/dashboard/configuracoes', icon: FiSettings };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  const isActivePath = (path: string) =>
    path === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(path);

  const desktopLink = ({ label, path, icon: Icon }: MenuItem) => (
    <Link
      key={path}
      href={path}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-4 px-4 py-3 text-sm font-medium transition-colors duration-150',
        'hover:bg-primary',
        isActivePath(path) ? 'bg-primary text-white' : 'text-white/70',
        collapsed && 'justify-center px-0'
      )}
    >
      <Icon className="min-w-[20px] text-lg" />
      {!collapsed && <span className="whitespace-nowrap">{label}</span>}
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-background text-text-base">
      <aside className={cn(
        'hidden md:flex flex-col bg-primary-dark text-white transition-all duration-200',
        'fixed left-0 top-0 h-full z-30',
        collapsed ? 'w-20' : 'w-64'
      )}>
        <div className={cn(
          'flex items-center h-16 border-b border-border flex-shrink-0',
          collapsed ? 'justify-center' : 'justify-between px-4'
        )}>
          {!collapsed && <span className="text-lg font-bold">SCC</span>}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-2 rounded-lg hover:bg-primary transition-colors text-white/70 hover:text-white"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <FiChevronsRight size={18} /> : <FiChevronsLeft size={18} />}
          </button>
        </div>

        <nav className="mt-4 space-y-1 flex-1 overflow-y-auto">
          {menuGroups.map((grupo, gi) => (
            <div key={gi} className={grupo.titulo ? 'border-t border-white/10 mt-2 pt-1' : ''}>
              {grupo.titulo && !collapsed && (
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40 whitespace-nowrap">
                  {grupo.titulo}
                </p>
              )}
              {grupo.items.map(desktopLink)}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 py-2 flex-shrink-0">
          {desktopLink(configItem)}
        </div>
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
          "fixed left-0 top-0 h-full w-64 bg-primary-dark text-white z-40 md:hidden flex flex-col",
          "transform transition-transform duration-200 ease-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-bold">Sistema de Controle</h2>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-primary transition-colors"
            aria-label="Fechar menu"
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="mt-4 space-y-1 px-2 flex-1 overflow-y-auto">
          {menuGroups.map((grupo, gi) => (
            <div key={gi} className={grupo.titulo ? 'border-t border-white/10 mt-2 pt-1' : ''}>
              {grupo.titulo && (
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {grupo.titulo}
                </p>
              )}
              {grupo.items.map(({ label, path, icon: Icon }) => (
                <Link
                  key={path}
                  href={path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium',
                    'transition-colors duration-150',
                    'hover:bg-primary',
                    isActivePath(path) ? 'bg-primary text-white' : 'text-white/70'
                  )}
                >
                  <Icon className="text-lg" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-2 flex-shrink-0">
          <Link
            href={configItem.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
              'flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium',
              'transition-colors duration-150 hover:bg-primary',
              isActivePath(configItem.path) ? 'bg-primary text-white' : 'text-white/70'
            )}
          >
            <FiSettings className="text-lg" />
            <span>{configItem.label}</span>
          </Link>
          <p className="text-xs text-white/60 px-4 pt-2">2024 TJBA</p>
        </div>
      </aside>

      <main className={cn(
        "flex-1 transition-all duration-200",
        "pt-16 md:pt-0",
        collapsed ? "md:ml-20" : "md:ml-64",
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
