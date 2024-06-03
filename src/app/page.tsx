"use client";

import React, {useState} from 'react';
import OpenApiPlayground from '../components/OpenApiPlayground';
import {HeaderBar} from "@/components/HeaderBar";

const Home: React.FC = () => {

  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const handleAction1 = () => {
    // Implement the logic for Action 1
    console.log('Action 1 clicked');
  };

  const handleAction2 = () => {
    // Implement the logic for Action 2
    console.log('Action 2 clicked');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <HeaderBar onAction1={handleAction1} onAction2={handleAction2} />
      <div className="p-4">
        <OpenApiPlayground input={input} setInput={setInput} output={output} setOutput={setOutput} />
      </div>
    </div>
  );
};

export default Home;