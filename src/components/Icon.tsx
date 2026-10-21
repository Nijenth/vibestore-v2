type IconProps = { name: 'search' | 'bag' | 'menu' | 'close' };

export function Icon({ name }: IconProps) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'search' && <><circle cx="12" cy="12" r="9" /><path d="m19 19 6 6" /></>}
      {name === 'bag' && <><path d="M4.5 9.5h19l1.5 15h-22l1.5-15Z" /><path d="M9 12V7a5 5 0 0 1 10 0v5" /></>}
      {name === 'menu' && <path d="M4 7h20M4 14h20M4 21h20" />}
      {name === 'close' && <path d="m6 6 16 16M22 6 6 22" />}
    </svg>
  );
}
