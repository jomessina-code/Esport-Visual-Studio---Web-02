
import React from 'react';

const TypeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 4a1 1 0 0 1 1 1v13h2.5a1 1 0 1 1 0 2h-7a1 1 0 1 1 0-2H11V5a1 1 0 0 1 1-1Z" />
    <path d="M5 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Z" />
  </svg>
);

export default TypeIcon;
