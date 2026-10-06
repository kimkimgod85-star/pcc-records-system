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
        { label: 'Admin Dashboard', href: '/admin' },
        { label: 'Manage Requests', href: '/admin/requests' },
        { label: 'Scheduling', href: '/admin/scheduling' },
        { label: 'Reports', href: '/admin/reports' },
      ]
    : [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Request Records', href: '/request' },
        { label: 'Track Request', href: '/track' },
        { label: 'Schedule Pickup', href: '/schedule' },
      ];

  return (
    <footer className="bg-gray-900 dark:bg-slate-950 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-8 ${isAuthenticated ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src={PCC_LOGO_URL}
                alt="PCC logo"
                className="h-12 w-auto object-contain"
                loading="lazy"
                decoding="async"
              />
              <div>
                <p className="text-white font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Pagadian Capitol Colleges
                </p>
                <p className="text-xs text-gray-400">Records Request & Scheduling System</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              Your trusted partner for seamless academic records management. Request documents online and schedule pickup with ease.
            </p>
            <div className="flex gap-3 mt-4">
              <a
                href="https://www.facebook.com/profile.php?id=100063921040273"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 bg-gray-800 hover:bg-gradient-to-r hover:from-primary hover:via-blue-600 hover:to-blue-800 rounded-lg flex items-center justify-center transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {isAuthenticated && (
            <div>
              <h4 className="text-white font-semibold mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Quick Links</h4>
              <ul className="space-y-2">
                {quickLinks.map(link => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Contact Information</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-400">
                  Rizal Avenue, Tuburan Dist.<br />Pagadian City, Philippines, 7016
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-300 flex-shrink-0" />
                <a href="mailto:registrar@pcci.ph.education" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  registrar@pcci.ph.education
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-blue-300 flex-shrink-0" />
                <a href="tel:+639187272849" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  0918 727 2849
                </a>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400">
                <span className="text-blue-300 font-medium">Office Hours:</span><br />
                Mon–Sat: 8:00 AM – 4:00 PM<br />
                Sun: Closed
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Pagadian Capitol Colleges. All rights reserved.
          </p>
          <p className="text-xs text-gray-500">
            Web-Based School Records Request & Scheduling System
          </p>
        </div>
      </div>
    </footer>
  );
}
