interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', variant = 'full', size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 48, text: 'text-2xl' },
    lg: { icon: 64, text: 'text-4xl' }
  };

  const iconSize = sizes[size].icon;
  const textSize = sizes[size].text;

  const LogoIcon = () => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* Círculo externo com gradiente */}
      <circle cx="50" cy="50" r="45" fill="url(#bgGradient)" />
      
      {/* Letra N estilizada formando uma conexão */}
      <path 
        d="M30 35 L30 65 L42 50 L42 65 M42 35 L54 50 L54 35 M54 65 L66 50 L66 65 L66 35" 
        stroke="white" 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Pontos de conexão (representando "nexo") */}
      <circle cx="30" cy="35" r="4" fill="#FCD34D" />
      <circle cx="54" cy="50" r="4" fill="#FCD34D" />
      <circle cx="66" cy="35" r="4" fill="#FCD34D" />
      
      <defs>
        <linearGradient id="bgGradient" x1="5" y1="5" x2="95" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
    </svg>
  );

  const LogoText = () => (
    <span className={`font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 bg-clip-text text-transparent ${textSize}`}>
      Nexo Brindes
    </span>
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
