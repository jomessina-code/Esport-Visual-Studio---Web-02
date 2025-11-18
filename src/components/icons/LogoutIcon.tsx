import React from 'react';

const LogoutIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5A1.5 1.5 0 0 0 7.5 20.25h8.25a1.5 1.5 0 0 0 1.5-1.5V5.25A1.5 1.5 0 0 0 15.75 3.75H7.5Zm-1.5 0-1.125.75a1.125 1.125 0 0 0 0 1.958l1.125.75v11.25l-1.125.75a1.125 1.125 0 0 0 0 1.958l1.125.75h1.5V3.75h-1.5Z" clipRule="evenodd" />
    <path d="M18.375 12.75a.75.75 0 0 0 0-1.5h-3a.75.75 0 0 0 0 1.5h3Z" />
    <path fillRule="evenodd" d="M17.859 15.203a.75.75 0 0 1 .432.968l-1.125 2.157a.75.75 0 0 1-1.328-.694l1.125-2.157a.75.75 0 0 1 .896-.274ZM15.141 8.797a.75.75 0 0 1 .896.274l1.125 2.157a.75.75 0 0 1-1.328.694l-1.125-2.157a.75.75 0 0 1 .432-.968Z" clipRule="evenodd" />
  </svg>
);

export default LogoutIcon;
