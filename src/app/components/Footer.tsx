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
    : isAuthenticated
      ? [
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Request Records', href: '/request' },
          { label: 'Messages', href: '/messages' },
          { label: 'Track Request', href: '/track' },
          { label: 'Schedule Pickup', href: '/schedule' },
          { label: 'How to Use', href: '/welcome' },
        ]
      : [
          { label: 'Home', href: '/' },
          { label: 'Login', href: '/login' },
          { label: 'Create account', href: '/register' },
          { label: 'Terms and Privacy', href: '/terms' },
        ];

  return (
    <footer className="relative mt-auto overflow-hidden text-blue-100 bg-[#07111f]">
      <div className="pcc-footer-shift pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <img src={PCC_LOGO_URL} alt="PCC logo" className="h-12 w-auto object-contain bg-white rounded-xl p-1" />
              <div>
                <p className="text-white font-semibold leading-snug" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Pagadian Capitol Colleges
                </p>
                <p className="text-xs text-blue-200 mt-0.5">Records request and pickup</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-blue-100/90 max-w-xs">
              Request a school record, pay by GCash or in person, message the office, and book a pickup date.
            </p>
            <a
              href="https://www.facebook.com/profile.php?id=100063921040273"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white hover:text-blue-100"
            >
              <span className="w-8 h-8 rounded-full bg-white/15 inline-flex items-center justify-center">
                <Facebook className="w-4 h-4" />
              </span>
              PCC on Facebook
            </a>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Quick links</h2>
            <ul className="mt-3 grid grid-cols-1 gap-1">
              {quickLinks.map(link => (
                <li key={link.href}>
                  <Link to={link.href} className="inline-flex h-8 items-center text-sm text-blue-100 transition-all duration-200 hover:text-white hover:translate-x-1">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Registrar’s Office</h2>
            <ul className="mt-3 space-y-3 text-sm text-blue-100">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-sky-200" />
                <span>Rizal Avenue, Tuburan District, Pagadian City 7016</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 flex-shrink-0 text-sky-200" />
                <a href="mailto:registrar@pcci.ph.education" className="hover:text-white break-all">registrar@pcci.ph.education</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 flex-shrink-0 text-sky-200" />
                <a href="tel:+639187272849" className="hover:text-white">0918 727 2849</a>
              </li>
            </ul>
            <p className="mt-4 text-sm text-blue-100/90 leading-relaxed">
              Monday to Saturday, 8:00 AM – 4:00 PM. Closed on Sunday.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-blue-200">
          <p>© {new Date().getFullYear()} Pagadian Capitol Colleges</p>
          <Link to="/terms" className="hover:text-white">Terms and Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
