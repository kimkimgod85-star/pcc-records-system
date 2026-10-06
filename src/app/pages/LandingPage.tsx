import React from 'react';
import { Link } from 'react-router';
import {
  FileText, Calendar, Bell, Shield, Clock, CheckCircle,
  ArrowRight, Upload, Search, BadgeCheck, MapPin, Mail, Phone, GraduationCap
} from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { withBase } from '../lib/basePath';

const PCC_BG_URL = withBase('PCC1.jpg');

const features = [
  {
    icon: FileText,
    title: 'Online Record Requests',
    description: 'Submit requests for TOR, Certificate of Enrollment, Diplomas, and more — anytime, anywhere.',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Pick your preferred pickup date and time slot from real-time availability.',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  },
  {
    icon: Search,
    title: 'Real-Time Tracking',
    description: 'Track your request status from submission to completion with live updates.',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  {
    icon: Bell,
    title: 'Instant Notifications',
    description: 'Get notified when your document is approved, ready for pickup, or requires action.',
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  },
  {
    icon: Upload,
    title: 'Online Payments',
    description: 'Pay via GCash or settle at the cashier window — flexible payment options.',
    color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Your data is protected with secure authentication and encrypted connections.',
    color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  },
];

const steps = [
  {
    step: '01',
    title: 'Create an Account',
    description: 'Register using your student ID and email address.',
    icon: GraduationCap,
  },
  {
    step: '02',
    title: 'Submit a Request',
    description: 'Choose the document type and fill out the request form.',
    icon: FileText,
  },
  {
    step: '03',
    title: 'Schedule Pickup',
    description: 'Select a convenient date and time for document pickup.',
    icon: Calendar,
  },
  {
    step: '04',
    title: 'Pay & Claim',
    description: 'Complete payment and claim your document on the scheduled date.',
    icon: CheckCircle,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
      <Header variant="landing" />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${PCC_BG_URL})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-blue-800/85 to-blue-950/90 dark:from-slate-950/95 dark:via-blue-950/85 dark:to-slate-950/95" />

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(600px,130vw)] aspect-square bg-white/5 rounded-full" />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-14 sm:py-28">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 max-w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur rounded-full ring-1 ring-white/20 text-blue-50 text-[0.7rem] min-[380px]:text-xs sm:text-sm font-medium mb-5 sm:mb-6">
              <BadgeCheck className="w-4 h-4 text-sky-300 flex-shrink-0" />
              <span className="leading-snug whitespace-nowrap">Official Records Management System of PCC</span>
            </div>

            <h1 className="text-[1.75rem] min-[380px]:text-3xl sm:text-4xl lg:text-5xl text-white mb-4 sm:mb-6 leading-tight text-balance" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
              Web-Based School Records
              <span className="block text-blue-200 mt-1 sm:mt-0">Request &amp; Scheduling</span>
            </h1>

            <p className="text-[0.95rem] sm:text-lg text-blue-100 mb-8 sm:mb-10 leading-relaxed max-w-md sm:max-w-none text-pretty">
              Request school documents online and schedule pickup easily. No more long queues — manage your academic records from anywhere, anytime.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-xs sm:max-w-none">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-blue-800 rounded-xl hover:bg-blue-800 hover:text-white transition-colors shadow-lg text-base sm:text-lg font-semibold"
              >
                Create an Account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 backdrop-blur text-white border-2 border-white/70 rounded-xl hover:bg-white hover:text-blue-800 transition-colors text-base sm:text-lg font-semibold"
              >
                Login to Account
              </Link>
            </div>
          </div>
        </div>

        <div className="relative h-12 overflow-hidden">
          <svg className="absolute -bottom-px w-full block" viewBox="0 0 1440 48" fill="none" preserveAspectRatio="none">
            <path d="M0 48L1440 48L1440 0C1440 0 1080 48 720 48C360 48 0 0 0 0V48Z" className="fill-white dark:fill-slate-900" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-blue-600 dark:text-blue-400 text-sm font-medium tracking-wide uppercase">System Features</span>
            <h2 className="mt-2 text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Everything You Need in One Platform
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              A complete solution for managing school record requests, scheduling, tracking, and payments.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 bg-gray-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-blue-600 dark:text-blue-400 text-sm font-medium tracking-wide uppercase">How It Works</span>
            <h2 className="mt-2 text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Get Your Documents in 4 Easy Steps
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              A simple, streamlined process to request and receive your academic records.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-blue-200 dark:bg-blue-900 z-0" />
                )}
                <div className="relative z-10 text-center p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-blue-100 dark:text-blue-900/50 absolute top-4 right-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {step.step}
                  </span>
                  <h3 className="text-gray-900 dark:text-white mb-2 text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors shadow-sm text-base sm:text-lg font-semibold"
            >
              Get Started Today
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Document Types */}
      <section className="py-16 sm:py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-blue-600 dark:text-blue-400 text-sm font-medium tracking-wide uppercase">Available Documents</span>
            <h2 className="mt-2 text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Request Any of These Documents
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { title: 'Transcript of Records', icon: '📋', desc: 'Official academic transcript' },
              { title: 'Certificate of Enrollment', icon: '📄', desc: 'Proof of enrollment' },
              { title: 'Diploma Copy', icon: '🎓', desc: 'Certified diploma copy' },
              { title: 'Good Moral Certificate', icon: '⭐', desc: 'Character certificate' },
            ].map((doc, i) => (
              <div key={i} className="p-5 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 text-center hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm transition-all">
                <div className="text-3xl mb-3">{doc.icon}</div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {doc.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{doc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-20 bg-primary dark:bg-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-blue-200 text-sm font-medium tracking-wide uppercase">Contact Information</span>
              <h2 className="mt-2 text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Get in Touch with the Registrar
              </h2>
              <p className="mt-3 text-blue-100">
                For inquiries about your documents or the system, contact the Registrar's Office directly.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  { icon: MapPin, label: 'Rizal Avenue, Tuburan Dist. Pagadian City, Philippines, 7016' },
                  { icon: Mail, label: 'registrar@pcci.ph.education' },
                  { icon: Phone, label: '0918 727 2849' },
                  { icon: Clock, label: 'Mon–Sat: 8:00 AM – 4:00 PM | Sun: Closed' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-blue-200" />
                    </div>
                    <p className="text-blue-100 text-sm mt-1.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
              <h3 className="text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Quick Start
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Already have an account? Login to request your documents. New student? Create an account to get started.
              </p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="flex items-center justify-between w-full px-5 py-3.5 bg-blue-700 hover:bg-white hover:text-blue-800 text-white rounded-xl border border-blue-700 hover:border-blue-800 transition-colors"
                >
                  <span className="text-sm sm:text-base font-semibold">Login to Your Account</span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-between w-full px-5 py-3.5 bg-white dark:bg-slate-800 hover:bg-blue-800 hover:text-white text-gray-900 dark:text-white rounded-xl border border-gray-300 dark:border-slate-600 hover:border-blue-800 transition-colors"
                >
                  <span className="text-sm sm:text-base font-semibold">Create New Account</span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
