import React from 'react';

const EyeIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5C7.25 4.5 3.125 7.625 1.5 12c1.625 4.375 5.75 7.5 10.5 7.5s8.875-3.125 10.5-7.5c-1.625-4.375-5.75-7.5-10.5-7.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3 3 0 100 6 3 3 0 000-6z" />
  </svg>
);

export default EyeIcon;