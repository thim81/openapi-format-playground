// components/SimpleModal.tsx

import React from 'react';

interface SimpleModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  width?: string;
  height?: string;
}

const SimpleModal: React.FC<SimpleModalProps> = ({ isOpen, onRequestClose, children, width = '98%', height = '98%' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-950 rounded p-4 relative" style={{ width, height }}>
        <button onClick={onRequestClose} className="absolute top-2 right-2 text-black dark:text-white">
          X
          {/*<svg*/}
          {/*  xmlns="http://www.w3.org/2000/svg"*/}
          {/*  className="h-8 w-8 p-1.5"*/}
          {/*  fill="none"*/}
          {/*  viewBox="0 0 24 24"*/}
          {/*  stroke="currentColor"*/}
          {/*>*/}
          {/*  <path*/}
          {/*    strokeLinecap="round"*/}
          {/*    strokeLinejoin="round"*/}
          {/*    strokeWidth={2}*/}
          {/*    d="M6 18L18 6M6 6l12 12"*/}
          {/*  />*/}
          {/*</svg>*/}
        </button>
        <div className="h-full w-full overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SimpleModal;
