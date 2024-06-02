import Link from 'next/link';

interface HeaderBarProps {
  onAction1: () => void;
  onAction2: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onAction1, onAction2 }) => {
  return (
    <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
      <div className="flex items-center space-x-4">
        <div className="text-lg font-semibold">OpenAPI-Format Playground</div>
        <Link href="https://www.npmjs.com/package/openapi-format" passHref>
          <span className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer">
            Guide
          </span>
        </Link>
        <button
          onClick={onAction1}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Format OpenAPI
        </button>
        <button
          onClick={onAction2}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Action 2
        </button>
      </div>
    </div>
  );
};
