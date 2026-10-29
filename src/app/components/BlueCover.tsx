import type { CSSProperties, ReactNode } from 'react';

export function BlueCover({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl text-white bg-gradient-to-br from-[#071a45] via-[#123a8a] to-[#3b82f6] ${className}`}>
      <div className="pcc-bubble pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" style={{ '--bubble-x': '18px', '--bubble-y': '-22px', '--bubble-time': '11s' } as CSSProperties} />
      <div className="pcc-bubble pointer-events-none absolute right-24 top-6 h-14 w-14 rounded-full bg-sky-200/25" style={{ '--bubble-x': '-12px', '--bubble-y': '16px', '--bubble-time': '8s', '--bubble-delay': '-2s', '--bubble-scale': '1.15' } as CSSProperties} />
      <div className="pcc-bubble pointer-events-none absolute right-8 bottom-3 h-8 w-8 rounded-full bg-white/20" style={{ '--bubble-x': '8px', '--bubble-y': '-12px', '--bubble-time': '7s', '--bubble-delay': '-4s' } as CSSProperties} />
      <div className="pcc-bubble pointer-events-none absolute left-1/3 -bottom-10 h-32 w-32 rounded-full bg-sky-300/20" style={{ '--bubble-x': '-16px', '--bubble-y': '-20px', '--bubble-time': '13s', '--bubble-delay': '-1s' } as CSSProperties} />
      <div className="pcc-bubble pointer-events-none absolute -left-8 bottom-2 h-20 w-20 rounded-full bg-white/10" style={{ '--bubble-x': '14px', '--bubble-y': '-10px', '--bubble-time': '9s', '--bubble-delay': '-3s' } as CSSProperties} />
      <div className="relative">{children}</div>
    </div>
  );
}
