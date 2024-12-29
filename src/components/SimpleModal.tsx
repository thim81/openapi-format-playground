// components/SimpleModal.tsx

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

interface SimpleModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  width?: string;
  height?: string;
  zIndex?: number;
}

const SimpleModal: React.FC<SimpleModalProps> = ({ isOpen, onRequestClose, children, width = '98%', height = '98%', zIndex = 50 }) => {
  useEffect(() => {
    console.log(`SimpleModal isOpen: ${isOpen}`);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center"
      style={{ zIndex }}
      onClick={() => {
        console.log('Backdrop clicked');
        onRequestClose();
      }}
    >
      <div
        className="bg-white dark:bg-gray-950 rounded p-4 relative"
        style={{ width, height }}
        onClick={(e) => {
          e.stopPropagation();
          console.log('Modal content clicked');
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // Prevent event from bubbling up
            console.log('Close button clicked');
            onRequestClose();
          }}
          className="absolute top-2 right-2 text-black dark:text-white"
        >
          X
          {/*<svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 p-1.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>*/}
        </button>
        <div className="h-full w-full overflow-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SimpleModal;
