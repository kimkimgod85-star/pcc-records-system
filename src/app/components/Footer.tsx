import { Link } from 'react-router';
import { MapPin, Mail, Phone, Facebook } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { withBase } from '../lib/basePath';

const PCC_LOGO_URL = withBase('PCC%20LOGO.png');

export function Footer() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const quickLinks = isAdmin
    ? [
        { label: 'Dashboard', href: '/admin' },
        { label: 'Manage Requests', href: '/admin/requests' },
        { label: 'Messages', href: '/admin/messages' },
        { label: 'Payments', href: '/admin/payments' },
        { label: 'Scheduling', href: '/admin/scheduling' },
        { label: 'Guide', href: '/admin/welcome' },
      ]
    : [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Request Records', href: '/request' },
        { label: 'Messages', href: '/messages' },
        { label: 'Track Request', href: '/track' },
        { label: 'Schedule Pickup', href: '/schedule' },
        { label: 'How to Use', href: '/welcome' },
      ];

  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`grid gap-4 items-stretch ${isAuthenticated ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          <section className="h-full min-h-[16rem] rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 flex flex-col">
            <div className="flex items-center gap-3">
              <img src={PCC_LOGO_URL} alt="PCC logo" className="h-12 w-auto object-contain flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Pagadian Capitol Colleges
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Registrar records and pickup</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Request a school record, pay by GCash or in person, message the Registrar’s Office, and book a pickup date.
            </p>
            <a
              href="https://www.facebook.com/profile.php?id=100063921040273"
              target="_blank"
              rel="noreferrer"
              aria-label="PCC on Facebook"
              className="mt-auto pt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300"
            >
              <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/40 inline-flex items-center justify-center">
                <Facebook className="w-4 h-4" />
              </span>
              PCC on Facebook
            </a>
          </section>

          {isAuthenticated && (
            <section className="h-full min-h-[16rem] rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 flex flex-col">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Quick links
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-1">
                {quickLinks.map(link => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="flex items-center h-9 px-2 -mx-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="h-full min-h-[16rem] rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 flex flex-col">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Registrar’s Office
            </h2>
            <ul className="mt-3 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-2.5 min-h-10">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Rizal Avenue, Tuburan District, Pagadian City 7016</span>
              </li>
              <li className="flex items-center gap-2.5 min-h-10">
                <Mail className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <a href="mailto:registrar@pcci.ph.education" className="hover:text-blue-700 dark:hover:text-blue-300 break-all">
                  registrar@pcci.ph.education
                </a>
              </li>
              <li className="flex items-center gap-2.5 min-h-10">
                <Phone className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <a href="tel:+639187272849" className="hover:text-blue-700 dark:hover:text-blue-300">0918 727 2849</a>
              </li>
            </ul>
            <p className="mt-auto pt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              <span className="font-semibold text-gray-900 dark:text-white">Office hours. </span>
              Monday to Saturday, 8:00 AM – 4:00 PM. Closed on Sunday.
            </p>
          </section>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <p>© {new Date().getFullYear()} Pagadian Capitol Colleges</p>
          <Link to="/terms" className="hover:text-blue-700 dark:hover:text-blue-300">
            Terms and Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
