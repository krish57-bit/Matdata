export function MatdataIcon({ className = "", size = 36 }) {
  return (
    <svg 
      className={className} 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="48" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="4" />
      {/* Abstract finger/vote symbol */}
      <path d="M40 70 V40 A10 10 0 0 1 60 40 V70" stroke="var(--ink)" strokeWidth="8" strokeLinecap="round" />
      {/* Indelible ink mark / Data node */}
      <circle cx="50" cy="30" r="8" fill="var(--saffron)" />
      <path d="M50 30 V45" stroke="var(--saffron)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function MatdataLogo({ className = "", size = 120 }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <MatdataIcon size={size / 3} />
      <span style={{ fontSize: `${size / 4}px` }} className="font-serif font-bold tracking-tight text-[var(--accent)] dark:text-white">
        MAT<span className="text-[var(--saffron)]">DATA</span>
      </span>
    </div>
  );
}
