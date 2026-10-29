import type { ReactNode } from 'react';

export function BlueCover({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl text-white bg-gradient-to-br from-[#071a45] via-[#123a8a] to-[#3b82f6] ${className}`}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute right-24 top-6 h-14 w-14 rounded-full bg-sky-200/25" />
      <div className="pointer-events-none absolute right-8 bottom-3 h-8 w-8 rounded-full bg-white/20" />
      <div className="pointer-events-none absolute left-1/3 -bottom-10 h-32 w-32 rounded-full bg-sky-300/20" />
      <div className="pointer-events-none absolute -left-8 bottom-2 h-20 w-20 rounded-full bg-white/10" />
      <div className="relative">{children}</div>
    </div>
  );
}
