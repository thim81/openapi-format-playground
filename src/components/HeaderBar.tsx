import Link from 'next/link';
import Image from 'next/image';
import openapiFormatIcon from '../../public/openapi-format-icon.svg';
import githubIcon from '../../public/github-icon.svg';
import npmIcon from '../../public/npm-icon.svg';

interface HeaderBarProps {
  onOpenMcp: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({onOpenMcp}) => {
  return (
    <div className="bg-white dark:bg-gray-800 py-2 px-4 flex justify-between items-center border-b-4" style={{borderBottomColor: '#509f60'}}>
      <Link href="/" passHref>
        <div className="flex items-center space-x-4">
          <Image src={openapiFormatIcon} alt="OpenAPI Format" width={32} height={32}/>
          <div className="text-lg font-semibold">OpenAPI-Format Playground</div>
        </div>
      </Link>
      <div className="flex items-center space-x-4">
        <button
          onClick={onOpenMcp}
          className="hidden lg:inline-block bg-green-500 text-white font-medium text-xs py-1 px-2 rounded-md cursor-pointer hover:bg-green-600"
        >
          MCP Server
        </button>
        <Link href="https://github.com/thim81/openapi-format?tab=readme-ov-file#installation" passHref target="_blank">
          <span
            className="hidden lg:inline-block bg-gray-300 text-gray-800 font-medium text-xs py-1 px-2 rounded-md cursor-pointer hover:bg-gray-400">
            Installation
          </span>
        </Link>
        <Link href="https://github.com/thim81/openapi-format?tab=readme-ov-file#command-line-interface" passHref
              target="_blank">
          <span
            className="hidden lg:inline-block bg-gray-300 text-gray-800 font-medium text-xs py-1 px-2 rounded-md cursor-pointer hover:bg-gray-400">
            CLI Usage
          </span>
        </Link>
        <Link href="https://www.npmjs.com/package/openapi-format" passHref target="_blank">
          <Image src={npmIcon} alt="NPM" width={32} height={32} className="grayscale hover:grayscale-0 cursor-pointer"/>
        </Link>
        <Link href="https://github.com/thim81/openapi-format" passHref target="_blank">
          <Image src={githubIcon} alt="GitHub" width={32} height={32}
                 className="grayscale hover:grayscale-0 cursor-pointer"/>
        </Link>
      </div>
    </div>
  );
};
