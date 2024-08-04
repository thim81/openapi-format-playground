// components/InstructionsModal.tsx

import React, { useState } from 'react';
import SimpleModal from './SimpleModal';
import MonacoEditorWrapper from "@/components/MonacoEditorWrapper";
import ButtonDownload from "@/components/ButtonDownload";
import Link from "next/link";

interface InstructionsModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  format: 'json' | 'yaml';
  sortSet: string;
  filterSet: string;
  sort: boolean;
}

const InstructionsModal: React.FC<InstructionsModalProps> = (
  {
    isOpen,
    onRequestClose,
    format,
    sortSet,
    filterSet,
    sort
  }
) => {
  const [activeTab, setActiveTab] = useState('npx');

  const sortContent = sort ? sortSet : ''

  const fileExtension = format === 'json' ? 'json' : 'yaml';
  const sortFileName = `openapi-sort.${fileExtension}`;
  const sortFileOption = sortContent.length ? ` --sortFile ${sortFileName}` : '';
  const filterFileName = `openapi-filter.${fileExtension}`;
  const filterFileOption = filterSet.length ? ` --filterFile ${filterFileName}` : '';
  const sortOption = !sort ? ` --no-sort` : '';

  const dynamicHeight = sortContent.length && filterSet.length ? `90%` : sortContent.length || filterSet.length ? `72%` : '50%';

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="80%" height={dynamicHeight}>
      <h2 className="text-xl font-bold mb-4">How to Use openapi-format CLI</h2>
      <p>You can use your current configuration, by following the steps below.</p>
      <p>The online playground provides a limited set of options of OpenAPI-Format, more options can be found
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
            <pre className="bg-gray-100 p-2 rounded mb-2">
              <code>
                {`npx openapi-format openapi.yaml -o openapi-sorted.yaml${sortOption}${sortFileOption}${filterFileOption}`}
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
            <pre className="bg-gray-100 p-2 rounded mb-2">
              <code>
                npm install -g openapi-format
              </code>
            </pre>
            <li>Run the following command to format your OpenAPI file:</li>
            <pre className="bg-gray-100 p-2 rounded mb-2">
              <code>
                {`openapi-format openapi.yaml -o openapi-sorted.yaml${sortOption}${sortFileOption}${filterFileOption}`}
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
            <pre className="bg-gray-100 p-2 rounded mb-2">
              <code>
                docker pull ghcr.io/google/openapi-format:latest
              </code>
            </pre>
            <li>Run the Docker container with the appropriate options:</li>
            <pre className="bg-gray-100 p-2 rounded mb-2">
              <code>
                {`docker run --rm -v $(pwd):/ ghcr.io/google/openapi-format openapi.yaml -o openapi-sorted.yaml${sortOption}${sortFileOption}${filterFileOption}`}
              </code>
            </pre>
            <li>Review the command and ensure that the OpenAPI input & output, match your local or remote file.
              The sort and filter options can be downloaded as files below.
            </li>
          </ol>
        </div>
      )}
      {(filterSet.length > 0)|| (sortContent.length > 0 && sort) && (
      <h2 className="text-xl font-bold mb-4">OpenAPI-format CLI options to download</h2>
      )}
      {(sortContent.length > 0 && sort) && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Sort Options:</h3>
            <ButtonDownload
              content={sortContent}
              filename="openapi-sort"
              format={format}
              label="Download sort"
              className="ml-2 bg-green-500 hover:bg-green-700 text-white text-xs p-1 rounded focus:outline-none"
            />
          </div>
          <MonacoEditorWrapper value={sortSet} height="20vh"/>
        </div>
      )}
      {filterSet.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Filter Options:</h3>
            <ButtonDownload
              content={filterSet}
              filename="openapi-filter"
              format={format}
              label="Download filter"
              className="ml-2 bg-green-500 hover:bg-green-700 text-white text-xs p-1 rounded focus:outline-none"
            />
          </div>
          <MonacoEditorWrapper value={filterSet} height="20vh"/>
        </div>
      )}
    </SimpleModal>
  );
};

export default InstructionsModal;
