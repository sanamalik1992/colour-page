export function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Photo frame */}
      <rect
        x="15"
        y="15"
        width="45"
        height="45"
        rx="4"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      
      {/* Mountain/landscape inside */}
      <path
        d="M20 50 L30 35 L40 45 L55 30 L55 55 L20 55 Z"
        fill="#86EFAC"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Sun */}
      <circle cx="45" cy="25" r="4" fill="#FBBF24" />
      
      {/* Magic wand */}
      <path
        d="M65 85 L85 65"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      
      {/* Wand star */}
      <path
        d="M85 65 L87 58 L92 60 L85 55 L83 48 L78 53 L71 51 L76 56 L74 63 L79 58 L85 65 Z"
        fill="#FBBF24"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* Sparkles */}
      <circle cx="70" cy="50" r="2" fill="#22D3EE" />
      <circle cx="90" cy="45" r="2" fill="#FBBF24" />
      <circle cx="75" cy="75" r="2" fill="#FBBF24" />
    </svg>
  )
}