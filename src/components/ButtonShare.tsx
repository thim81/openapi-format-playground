// components/ButtonShare.tsx
import React from 'react';
import {Base64} from "js-base64";
import { gzip } from 'pako'
import {generateShareUrl} from "@/utils";
import {PlaygroundConfig} from "@/components/Playground";

interface ButtonShareProps {
  openapi?: string;
  config?: PlaygroundConfig
}

const ButtonShare: React.FC<ButtonShareProps> = ({openapi, config }) => {
  const handleShare = async () => {
    try {
      const origin = window?.location?.origin || 'https://openapi-format-playground.vercel.app/';
      const shareUrl = generateShareUrl(origin, openapi, config);

      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', shareUrl);
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  return (
    <button onClick={handleShare} className="bg-green-500 hover:bg-green-700 text-white font-medium text-sm py-1 px-4 rounded">
      Share
    </button>
  );
};

export default ButtonShare;
