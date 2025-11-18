import React from 'react';

const SwitchContainerIcon: React.FC<{ className?: string, direction?: 'out' | 'in' }> = ({ className = "w-4 h-4", direction = 'out' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    {direction === 'out' ? (
      <>
        {/* Icon for moving an element OUT of a container */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
      </>
    ) : (
      <>
        {/* Icon for moving an element INTO a container */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V8.25M15 12 12 15m0 0L9 12m3 3V3" />
      </>
    )}
  </svg>
);

export default SwitchContainerIcon;
