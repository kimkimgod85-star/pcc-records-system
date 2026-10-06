import { Link, useLocation } from 'react-router';
import { Home, FileText, CreditCard, Calendar, TrendingUp } from 'lucide-react';

export function MobileNav() {
  const location = useLocation();

  const tabs = [
    { label: 'Home', icon: Home, href: '/dashboard' },
    { label: 'Request', icon: FileText, href: '/request' },
    { label: 'Pay', icon: CreditCard, href: '/payment' },
    { label: 'Schedule', icon: Calendar, href: '/schedule' },
    { label: 'Track', icon: TrendingUp, href: '/track' },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-gray-200 dark:border-slate-700 safe-area-pb">
      <div className="flex items-stretch h-16">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            to={tab.href}
            className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive(tab.href)
                ? 'text-primary'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {isActive(tab.href) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
            <tab.icon className="w-5 h-5" />
            <span className="text-[12px] font-medium truncate">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
