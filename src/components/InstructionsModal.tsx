// components/InstructionsModal.tsx

import React, {useEffect, useState} from 'react';
import SimpleModal from './SimpleModal';
import MonacoEditorWrapper from "@/components/MonacoEditorWrapper";
import ButtonDownload from "@/components/ButtonDownload";
import Link from "next/link";
import {parseString, stringify} from "openapi-format";

interface InstructionsModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  format: 'json' | 'yaml';
  sortSet: string;
  filterSet: string;
  overlaySet?: string;
  generateSet?: string;
  casingSet?: string;
  sort: boolean;
  keepComments: boolean;
  toggleGenerate?: boolean;
  toggleCasing?: boolean;
}

const InstructionsModal: React.FC<InstructionsModalProps> = (
  {
    isOpen,
    onRequestClose,
    format,
    sortSet,
    filterSet,
    casingSet,
    generateSet,
    overlaySet,
    sort,
    keepComments,
    toggleGenerate,
    toggleCasing,
  }
) => {
  const [activeTab, setActiveTab] = useState('npx');
  const [configFileContent, setConfigFileContent] = useState('');
  const [fileExt, setFileExt] = useState(format === 'json' ? 'json' : 'yaml');

  const sortContent = sort ? sortSet : ''

  const sortFileName = `oaf-sort.${fileExt}`;
  const sortFileOption = sortContent?.length ? ` --sortFile ${sortFileName}` : '';
  const sortFileDocker = sortContent?.length ? ` --sortFile /workspace/${sortFileName}` : '';
  const filterFileName = `oaf-filter.${fileExt}`;
  const filterFileOption = filterSet?.length ? ` --filterFile ${filterFileName}` : '';
  const filterFileDocker = filterSet?.length ? ` --filterFile /workspace/${filterFileName}` : '';
  const generateFileName = `oaf-generate.${fileExt}`;
  const generateFileOption = generateSet?.length && toggleGenerate ? ` --generateFile ${generateFileName}` : '';
  const generateFileDocker = generateSet?.length && toggleGenerate ? ` --generateFile /workspace/${generateFileName}` : '';
  const casingFileName = `oaf-casing.${fileExt}`;
  const casingFileOption = casingSet?.length && toggleCasing ? ` --generateFile ${casingFileName}` : '';
  const casingFileDocker = casingSet?.length && toggleCasing ? ` --generateFile /workspace/${casingFileName}` : '';

  const sortOption = !sort ? ` --no-sort` : '';
  const keepCommentsOption = keepComments && format === 'yaml' ? ` --keepComments` : '';
  const configFileName = `oaf-config`;

  const activeSetsCount = [sortContent ?? '', filterSet ?? '', casingSet ?? '', generateSet ?? ''].filter(set => set.length > 0).length;
  // const dynamicHeight = activeSetsCount > 2 ? '98%' : activeSetsCount === 2 ? '80%' : '60%';
  // Set dynamic height based on active tab
  const getDynamicHeight = () => {
    switch (activeTab) {
      case 'npx':
      case 'npm':
      case 'docker':
        return activeSetsCount > 2 ? '98%' : activeSetsCount === 2 ? '82%' : '40%';
      case 'configFile':
        return '70%';
      default:
        return '60%';
    }
  };

  const dynamicHeight = getDynamicHeight();

  useEffect(() => {
    setFileExt(format === 'json' ? 'json' : 'yaml');
  }, [format]);

  useEffect(() => {
    const generateConfigFileContent = async () => {
      let sortOps = sortSet;
      let filterOps = filterSet;
      let generateOps = generateSet;
      let casingOps = casingSet;
      let overlayOps = overlaySet;

      if (typeof filterSet === 'string') {
        filterOps = await parseString(filterSet) as any;
      }
      if (typeof sortSet === 'string') {
        sortOps = await parseString(sortSet) as any;
      }
      if (typeof generateSet === 'string' && generateSet.length) {
        generateOps = await parseString(generateSet) as any;
      }
      if (typeof casingSet === 'string' && casingSet?.length) {
        casingOps = await parseString(casingSet) as any;
      }
      if (typeof overlaySet === 'string' && overlaySet?.length) {
        overlayOps = await parseString(overlaySet) as any;
      }

      let configInput: { [key: string]: any } = {
        output: `openapi-formatted.${fileExt}`,
        sort: sort ? true : false,
        keepComments: keepComments,
        // filterFile: filterFileName ? filterFileName : undefined,
        // sortFile: sortFileName ? sortFileName : undefined,
        ...(filterSet?.length && {filterSet: filterOps}),
        ...(sortSet?.length && {sortSet: sortOps}),
        ...(overlaySet?.length && {overlaySet: overlayOps}),
        ...(generateSet?.length && toggleGenerate && {generateSet: generateOps}),
        ...(casingSet?.length && toggleCasing && {casingSet: casingOps}),
      };

      if (!keepComments || format === 'json') {
        delete configInput.keepComments;
      }

      // Delete undefined keys
      Object.keys(configInput).forEach(key => {
        if (configInput[key] === undefined) {
          delete configInput[key];
        }
      });

      const configContent = await stringify(configInput, {format: format});
      setConfigFileContent(configContent);
    };

    generateConfigFileContent();
  }, [sort, keepComments, filterSet, sortSet, generateSet, casingSet, overlaySet, format, toggleGenerate, toggleCasing]);

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="80%" height={dynamicHeight}>
      <h2 className="text-xl font-bold mb-4">How to Use openapi-format CLI</h2>
      <p>You can use your current configuration, by following the steps below.</p>
      <p>The online playground provides an initial set of options of OpenAPI-Format, more options can be found
        in the <Link href="https://github.com/thim81/openapi-format?tab=readme-ov-file#command-line-interfacet"
                     passHref
                     target="_blank">
          <span
            className="bg-gray-300 text-gray-800 font-medium text-xs py-1 px-2 rounded-md cursor-pointer hover:bg-gray-400">
            readme
          </span>
        </Link>.
      </p>
      <div className="border-b mb-4">
        <nav className="flex space-x-4">
          <button
            className={`py-2 px-4 ${activeTab === 'npx' ? 'border-b-2 border-indigo-500' : ''}`}
            onClick={() => setActiveTab('npx')}
          >
            Using NPX
          </button>
          <button
            className={`py-2 px-4 ${activeTab === 'npm' ? 'border-b-2 border-indigo-500' : ''}`}
            onClick={() => setActiveTab('npm')}
          >
            Using NPM install & run command
          </button>
          <button
            className={`py-2 px-4 ${activeTab === 'configFile' ? 'border-b-2 border-indigo-500' : ''}`}
            onClick={() => setActiveTab('configFile')}
          >
            Using Config File
          </button>
          <button
            className={`py-2 px-4 ${activeTab === 'docker' ? 'border-b-2 border-indigo-500' : ''}`}
            onClick={() => setActiveTab('docker')}
          >
            Using Docker
          </button>
        </nav>
      </div>

      {activeTab === 'npx' && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Using openapi-format with NPX</h3>
          <ol className="list-decimal list-inside ml-4">
            <li>Open your terminal or command prompt.</li>
            <li>To format your OpenAPI file, run the following command:</li>
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 border rounded mb-2 break-words whitespace-pre-wrap">
              <code>
                {`npx openapi-format openapi.${fileExt} -o openapi-formatted.${fileExt}${sortOption}${keepCommentsOption}${sortFileOption}${filterFileOption}${generateFileOption}${casingFileOption}`}
              </code>
            </pre>
            <li>Review the command and ensure that the OpenAPI input & output, match your local or remote file.
              The sort and filter options can be downloaded as files below.
            </li>
          </ol>
        </div>
      )}

      {activeTab === 'npm' && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Using openapi-format with NPM</h3>
          <ol className="list-decimal list-inside ml-4">
            <li>Install the package globally:</li>
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 border rounded mb-2">
              <code>
                npm install -g openapi-format
              </code>
            </pre>
            <li>Run the following command to format your OpenAPI file:</li>
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 border rounded mb-2 break-words whitespace-pre-wrap">
              <code>
                {`openapi-format openapi.${fileExt} -o openapi-formatted.${fileExt}${sortOption}${keepCommentsOption}${sortFileOption}${filterFileOption}${generateFileOption}${casingFileOption}`}
              </code>
            </pre>
            <li>Review the command and ensure that the OpenAPI input & output, match your local or remote file.
              The sort and filter options can be downloaded as files below.
            </li>
          </ol>
        </div>
      )}

      {activeTab === 'docker' && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Using openapi-format with Docker</h3>
          <ol className="list-decimal list-inside ml-4">
            <li>Pull the Docker image:</li>
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 border rounded mb-2 break-words whitespace-pre-wrap">
              <code>
                docker pull ghcr.io/thim81/openapi-format:latest
              </code>
            </pre>
            <li>Run the Docker container with the appropriate options:</li>
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 border rounded mb-2 break-words whitespace-pre-wrap">
              <code>
                {`docker run --rm -v $(pwd):/workspace ghcr.io/thim81/openapi-format /workspace/openapi.${fileExt} -o /workspace/openapi-formatted.${fileExt}${sortOption}${keepCommentsOption}${sortFileDocker}${filterFileDocker}${generateFileDocker}${casingFileDocker}`}
              </code>
            </pre>
            <li>Review the command and ensure that the OpenAPI input & output, match your local or remote file.
              The sort and filter options can be downloaded as files below.
            </li>
          </ol>
        </div>
      )}
      {activeTab === 'configFile' && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Using openapi-format with a Config File</h3>
          <ol className="list-decimal list-inside ml-4">
            <li>Create or Download a config file (e.g., openapi-config.{fileExt}) with the following content:
              <ButtonDownload
                content={configFileContent}
                filename={configFileName}
                format={format}
                label="Download config file"
                className="ml-2 bg-green-500 hover:bg-green-700 text-white text-xs p-1 rounded focus:outline-none"
              />
            </li>
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 border rounded mb-2">
            <MonacoEditorWrapper value={configFileContent} height="28vh" trimNewline={true}/>
            </pre>
            <li>To format your OpenAPI file using the config file, run the following command:</li>
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 border rounded mb-2 break-words whitespace-pre-wrap">
              <code>
                {`npx openapi-format openapi.${fileExt} --configFile oaf-config.${fileExt}`}
              </code>
            </pre>
            <li>Review the options and ensure that the OpenAPI input & output, match your local or remote file.</li>
          </ol>
        </div>
      )}
      {(filterSet.length > 0) || (sortContent.length > 0 && sort) && activeTab !== 'configFile' && (
        <h2 className="text-xl font-bold mb-4">OpenAPI-format CLI options to download</h2>
      )}
      {(sortContent.length > 0 && sort && activeTab !== 'configFile') && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Sort Options:</h3>
            <ButtonDownload
              content={sortContent}
              filename="oaf-sort"
              format={format}
              label="Download sort"
              className="ml-2 bg-green-500 hover:bg-green-700 text-white text-xs p-1 rounded focus:outline-none"
            />
          </div>
          <pre className="bg-gray-100 p-2 border rounded mb-2">
          <MonacoEditorWrapper value={sortSet} height="20vh" trimNewline={true}/>
          </pre>
        </div>
      )}
      {filterSet.length > 0  && activeTab !== 'configFile' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Filter Options:</h3>
            <ButtonDownload
              content={filterSet}
              filename="oaf-filter"
              format={format}
              label="Download filter"
              className="ml-2 bg-green-500 hover:bg-green-700 text-white text-xs p-1 rounded focus:outline-none"
            />
          </div>
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 border rounded mb-2">
          <MonacoEditorWrapper value={filterSet} height="20vh" trimNewline={true}/>
          </pre>
        </div>
      )}
      {generateSet && generateSet?.length > 0 && toggleGenerate && activeTab !== 'configFile' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Generate Options:</h3>
            <ButtonDownload
              content={generateSet}
              filename="oaf-generate"
              format={format}
              label="Download generate"
              className="ml-2 bg-green-500 hover:bg-green-700 text-white text-xs p-1 rounded focus:outline-none"
            />
          </div>
          <pre className="bg-gray-100 p-2 border rounded mb-2">
          <MonacoEditorWrapper value={generateSet} height="6vh" trimNewline={true}/>
          </pre>
        </div>
      )}
      {casingSet && casingSet?.length > 0 && toggleCasing && activeTab !== 'configFile' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Casing Options:</h3>
            <ButtonDownload
              content={casingSet}
              filename="oaf-casing"
              format={format}
              label="Download casing"
              className="ml-2 bg-green-500 hover:bg-green-700 text-white text-xs p-1 rounded focus:outline-none"
            />
          </div>
          <pre className="bg-gray-100 p-2 border rounded mb-2">
          <MonacoEditorWrapper value={casingSet} height="20vh" trimNewline={true}/>
          </pre>
        </div>
      )}
    </SimpleModal>
  );
};

export default InstructionsModal;
