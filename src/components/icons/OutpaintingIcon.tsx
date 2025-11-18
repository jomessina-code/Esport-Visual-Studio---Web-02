import React from 'react';

const OutpaintingIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5h-9a.75.75 0 0 0-.75.75v7.5c0 .414.336.75.75.75h9a.75.75 0 0 0 .75-.75v-7.5a.75.75 0 0 0-.75-.75Z" />
  </svg>
);

export default OutpaintingIcon;