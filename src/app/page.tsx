"use client";

import React, {useEffect, useState} from 'react';
import Playground from '../components/Playground';
import {HeaderBar} from "@/components/HeaderBar";
import useSessionStorage from "@/hooks/useSessionStorage";

const Home: React.FC = () => {

  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const [isMobile, setIsMobile] = useState(false);
  const [dismissedMobileNotice, setDismissedMobileNotice] = useSessionStorage<boolean>('oaf-mobile-dismissed', false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const mobileUa = /Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua);
      setIsMobile(mobileUa);
    } catch {
      setIsMobile(false);
    }
  }, []);

  const handleAction1 = () => {
    // Implement the logic for Action 1
    console.log('Action 1 clicked');
  };

  const handleAction2 = () => {
    // Implement the logic for Action 2
    console.log('Action 2 clicked');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-500 flex flex-col">
      <HeaderBar onAction1={handleAction1} onAction2={handleAction2} />
      {isMobile && !dismissedMobileNotice && (
        <div className="px-4">
          <div className="mt-3 mb-0 flex items-start justify-between rounded-md border border-yellow-300 bg-yellow-100 text-yellow-900 p-3 shadow-sm">
            <div className="text-sm">
              The playground is not optimised for mobile usage.
            </div>
            <button
              aria-label="Dismiss mobile notice"
              className="ml-4 text-yellow-900 hover:text-yellow-700 focus:outline-none"
              onClick={() => setDismissedMobileNotice(true)}
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div className="flex-grow p-4">
        <Playground input={input} setInput={setInput} output={output} setOutput={setOutput} />
      </div>
    </div>
  );
};

export default Home;
