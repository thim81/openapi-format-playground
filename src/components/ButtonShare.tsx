// components/ButtonShare.tsx
import React from 'react';
import {Base64} from "js-base64";
import { gzip } from 'pako'

interface ButtonShareProps {
  data: string;
  config: {
    sort: boolean;
    filterOptions: string;
    sortOptions: string;
    isFilterOptionsCollapsed: boolean;
    isSortOptionsCollapsed: boolean;
    outputLanguage: 'json' | 'yaml';
  };
}

const ButtonShare: React.FC<ButtonShareProps> = ({data, config }) => {
  const handleShare = async () => {
    // Encode
    const url = new URL(globalThis.location.href)
    const encodedInput = Base64.fromUint8Array(gzip(data))
    const encodedConfig = Base64.fromUint8Array(gzip(JSON.stringify(config || {})))

    url.searchParams.set('config', encodedConfig)
    url.searchParams.set('input', encodedInput)

    const shareUrl = url.toString()
    console.log('shareUrl', shareUrl)

    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', shareUrl)
      await navigator.clipboard.writeText(shareUrl)
    }
  }

  return (
    <button onClick={handleShare} className="bg-green-500 hover:bg-green-700 text-white font-medium text-sm py-1 px-4 rounded">
      Share
    </button>
  );
};

export default ButtonShare;
