interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', variant = 'full', size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 40, text: 'text-2xl' },
    lg: { icon: 64, text: 'text-4xl' }
  };

  const iconSize = sizes[size].icon;
  const textSize = sizes[size].text;

  const LogoIcon = () => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* Fundo do presente/caixa */}
      <rect x="12" y="24" width="40" height="32" rx="4" fill="url(#gradient1)" />
      
      {/* Laço do presente - horizontal */}
      <rect x="12" y="36" width="40" height="6" fill="url(#gradient2)" />
      
      {/* Laço do presente - vertical */}
      <rect x="29" y="24" width="6" height="32" fill="url(#gradient2)" />
      
      {/* Nó do laço */}
      <circle cx="32" cy="20" r="6" fill="url(#gradient3)" />
      <circle cx="32" cy="20" r="4" fill="white" opacity="0.3" />
      
      {/* Pontos de conexão (representando "nexo") */}
      <circle cx="20" cy="32" r="2" fill="white" opacity="0.8" />
      <circle cx="44" cy="32" r="2" fill="white" opacity="0.8" />
      <circle cx="32" cy="46" r="2" fill="white" opacity="0.8" />
      
      {/* Linhas de conexão sutis */}
      <path d="M20 32 L32 20" stroke="white" strokeWidth="1" opacity="0.4" />
      <path d="M44 32 L32 20" stroke="white" strokeWidth="1" opacity="0.4" />
      
      <defs>
        <linearGradient id="gradient1" x1="12" y1="24" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="gradient2" x1="12" y1="36" x2="52" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="gradient3" x1="26" y1="14" x2="38" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
    </svg>
  );

  const LogoText = () => (
    <div className="flex flex-col leading-none">
      <span className={`font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent ${textSize}`}>
        Nexo Brindes
      </span>
      {size !== 'sm' && (
        <span className="text-xs text-gray-500 mt-0.5 font-medium tracking-wide">
          Sua conexão com presentes únicos
        </span>
      )}
    </div>
  );

  if (variant === 'icon') {
    return <LogoIcon />;
  }

  if (variant === 'text') {
    return <LogoText />;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon />
      <LogoText />
    </div>
  );
}
