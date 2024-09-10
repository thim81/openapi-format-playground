// components/rewConfigModal.tsx

import React, {useEffect, useState} from 'react';
import SimpleModal from './SimpleModal';
import MonacoEditorWrapper from "@/components/MonacoEditorWrapper";
import ButtonDownload from "@/components/ButtonDownload";
import Link from "next/link";
import {stringify} from "openapi-format";

interface RewConfigModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  format: 'json' | 'yaml';
  sortSet: string;
  filterSet: string;
  sort: boolean;
  keepComments: boolean;
}

const RewConfigModal: React.FC<RewConfigModalProps> = (
  {
    isOpen,
    onRequestClose,
    format,
    sortSet,
    filterSet,
    sort,
    keepComments
  }
) => {
  const [configFileContent, setConfigFileContent] = useState('');
  const [fileExt, setFileExt] = useState(format === 'json' ? 'json' : 'yaml');

  const sortContent = sort ? sortSet : ''

  const sortOption = !sort ? ` --no-sort` : '';
  const keepCommentsOption = keepComments && format === 'yaml' ? ` --keepComments` : '';
  const configFileName = `oaf-config`;

  const dynamicHeight = sortContent.length && filterSet.length ? `90%` : sortContent.length || filterSet.length ? `72%` : '50%';

  useEffect(() => {
    setFileExt(format === 'json' ? 'json' : 'yaml');
  }, [format]);

  useEffect(() => {
    const generateConfigFileContent = async () => {
      let configInput: { [key: string]: any } = {
        sort: sort ? true : false,
        keepComments: keepComments,
        filterSet: filterSet,
        sortSet: sortSet
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
  }, [sort, keepComments, filterSet, sortSet, format]);

  return (
    <SimpleModal isOpen={isOpen} onRequestClose={onRequestClose} width="80%" height={dynamicHeight}>
      <h2 className="text-xl font-bold mb-4">Configure openapi-format options</h2>
      <p>You can set all options for openapi-format configuration.</p>
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

      <div className="mb-4">
        <h3 className="font-semibold mb-2">Using openapi-format with a Config File</h3>

        <ButtonDownload
          content={configFileContent}
          filename={configFileName}
          format={format}
          label="Download config file"
          className="ml-2 bg-green-500 hover:bg-green-700 text-white text-xs p-1 rounded focus:outline-none"
        />

        <pre className="bg-gray-100 p-2 rounded mb-2">
        <MonacoEditorWrapper value={configFileContent} height="90vh"/>
        </pre>
      </div>
    </SimpleModal>
  );
};

export default RewConfigModal;
