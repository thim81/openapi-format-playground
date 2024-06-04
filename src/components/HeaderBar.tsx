import Link from 'next/link';
import Image from 'next/image';
import openapiFormatIcon from '/public/openapi-format-icon.svg';
import githubIcon from '/public/github-icon.svg';
import npmIcon from '/public/npm-icon.svg';

interface HeaderBarProps {
  onAction1: () => void;
  onAction2: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({onAction1, onAction2}) => {
  return (
    <div className="bg-white p-4 flex justify-between items-center border-b-4" style={{borderBottomColor: '#509f60'}}>
      <Link href="/" passHref>
        <div className="flex items-center space-x-4">
          <Image src={openapiFormatIcon} alt="OpenAPI Format" width={32} height={32}/>
          <div className="text-lg font-semibold">OpenAPI-Format Playground</div>
        </div>
      </Link>
      <div className="flex items-center space-x-4">
        <Link href="https://github.com/thim81/openapi-format?tab=readme-ov-file#installation" passHref target="_blank">
          <span
            className="bg-gray-300 text-gray-800 font-medium text-xs py-1 px-2 rounded-md cursor-pointer hover:bg-gray-400">
            Installation
          </span>
        </Link>
        <Link href="https://github.com/thim81/openapi-format?tab=readme-ov-file#command-line-interfacet" passHref
              target="_blank">
          <span
            className="bg-gray-300 text-gray-800 font-medium text-xs py-1 px-2 rounded-md cursor-pointer hover:bg-gray-400">
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
