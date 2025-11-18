import React from 'react';

const MinimizeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75 9 9m0 0H4.5M9 9V4.5m11.25 11.25L15 15m0 0h4.5m-4.5 0v4.5m-6.75-6.75L9 15m0 0H4.5M9 15v4.5M3.75 20.25 9 15M20.25 3.75 15 9m0 0h4.5M15 9V4.5" />
  </svg>
);

export default MinimizeIcon;
