
import React from 'react';

const ColorSwatchIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm1.522 1.522a.75.75 0 0 1 1.06 0l.095.094a8.25 8.25 0 0 0-3.322 2.016.75.75 0 0 1-1.06-1.06 9.732 9.732 0 0 1 3.227-1.05zM12 11.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.554 4.298a.75.75 0 0 0-1.058 1.06 8.25 8.25 0 0 1-2.016 3.322.75.75 0 1 0 1.06 1.06 9.733 9.733 0 0 0 1.05-3.227l-.094-.095a.75.75 0 0 0-1.06-1.06z" clipRule="evenodd" />
    </svg>
);

export default ColorSwatchIcon;
