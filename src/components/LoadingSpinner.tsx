import React from "react";

const LoadingSpinner: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    fill="#00FF00"
  >
    <circle
      cx="50"
      cy="50"
      r="35"
      stroke="#00FF00"
      strokeWidth="10"
      fill="none"
      strokeDasharray="164.93361431346415 56.97787143782138"
      transform="rotate(168 50 50)"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        repeatCount="indefinite"
        dur="1s"
        keyTimes="0;1"
        values="0 50 50;360 50 50"
      />
    </circle>
  </svg>
);

export default LoadingSpinner;
