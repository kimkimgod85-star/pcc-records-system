export function ProfileAvatar({
  name,
  url,
  className = 'w-9 h-9',
  fit = 'cover',
}: {
  name: string;
  url?: string | null;
  className?: string;
  fit?: 'cover' | 'contain';
}) {
  const initial = (name.trim().charAt(0) || '?').toUpperCase();
  return (
    <span className={`${className} rounded-full overflow-hidden bg-blue-600 text-white inline-flex items-center justify-center flex-shrink-0`}>
      {url ? (
        <img src={url} alt="" className={`w-full h-full ${fit === 'contain' ? 'object-contain p-1 bg-white' : 'object-cover'}`} />
      ) : (
        <span className="text-[0.7em] font-semibold leading-none">{initial}</span>
      )}
    </span>
  );
}
