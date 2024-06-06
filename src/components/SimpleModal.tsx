// components/SimpleModal.tsx

import React from 'react';

interface SimpleModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}

const SimpleModal: React.FC<SimpleModalProps> = ({ isOpen, onRequestClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded p-4 w-[98%] h-[98%] max-w-screen-2xl relative">
        <button onClick={onRequestClose} className="absolute top-2 right-2 text-black">
          X
        </button>
        <div className="h-full w-full overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SimpleModal;
