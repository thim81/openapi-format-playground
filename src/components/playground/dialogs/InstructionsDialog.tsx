import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import MonacoEditor from '../MonacoEditor';
import { DownloadButton } from '../EditorPanel';
import { parseString, stringify } from 'openapi-format';

interface InstructionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  format: 'json' | 'yaml';
  sortSet: string;
  filterSet: string;
  overlaySet?: string;
  generateSet?: string;
  casingSet?: string;
  sort: boolean;
  keepComments: boolean;
  toggleFilter?: boolean;
  toggleGenerate?: boolean;
  toggleCasing?: boolean;
  toggleOverlay?: boolean;
}

const InstructionsDialog: React.FC<InstructionsDialogProps> = ({
  isOpen,
  onClose,
  format,
  sortSet,
  filterSet,
  casingSet,
  generateSet,
  overlaySet,
  sort,
  keepComments,
  toggleFilter,
  toggleGenerate,
  toggleCasing,
  toggleOverlay,
}) => {
  const [activeTab, setActiveTab] = useState('npx');
  const [configFileContent, setConfigFileContent] = useState('');

  const fileExt = format === 'json' ? 'json' : 'yaml';
  const sortContent = sort ? sortSet : '';
  const filterContent = toggleFilter === false ? '' : filterSet;

  const sortFileName = `oaf-sort.${fileExt}`;
  const sortFileOption = sortContent?.length ? ` --sortFile ${sortFileName}` : '';
  const sortFileDocker = sortContent?.length ? ` --sortFile /workspace/${sortFileName}` : '';

  const filterFileName = `oaf-filter.${fileExt}`;
  const filterFileOption = filterContent?.length ? ` --filterFile ${filterFileName}` : '';
  const filterFileDocker = filterContent?.length
    ? ` --filterFile /workspace/${filterFileName}`
    : '';

  const generateFileName = `oaf-generate.${fileExt}`;
  const generateFileOption =
    generateSet?.length && toggleGenerate ? ` --generateFile ${generateFileName}` : '';
  const generateFileDocker =
    generateSet?.length && toggleGenerate ? ` --generateFile /workspace/${generateFileName}` : '';

  const casingFileName = `oaf-casing.${fileExt}`;
  const casingFileOption =
    casingSet?.length && toggleCasing ? ` --casingFile ${casingFileName}` : '';
  const casingFileDocker =
    casingSet?.length && toggleCasing ? ` --casingFile /workspace/${casingFileName}` : '';

  const overlayFileName = `oaf-overlay.${fileExt}`;
  const overlayFileOption =
    overlaySet?.length && toggleOverlay ? ` --overlayFile ${overlayFileName}` : '';
  const overlayFileDocker =
    overlaySet?.length && toggleOverlay ? ` --overlayFile /workspace/${overlayFileName}` : '';

  const noSortOption = !sort ? ' --no-sort' : '';
  const keepCommentsOption = keepComments && format === 'yaml' ? ' --keepComments' : '';

  const npxCommand = `npx openapi-format openapi.${fileExt} -o openapi-formatted.${fileExt}${noSortOption}${keepCommentsOption}${sortFileOption}${filterFileOption}${generateFileOption}${casingFileOption}${overlayFileOption}`;
  const npmCommand = `openapi-format openapi.${fileExt} -o openapi-formatted.${fileExt}${noSortOption}${keepCommentsOption}${sortFileOption}${filterFileOption}${generateFileOption}${casingFileOption}${overlayFileOption}`;
  const dockerCommand = `docker run --rm -v $(pwd):/workspace ghcr.io/thim81/openapi-format /workspace/openapi.${fileExt} -o /workspace/openapi-formatted.${fileExt}${noSortOption}${keepCommentsOption}${sortFileDocker}${filterFileDocker}${generateFileDocker}${casingFileDocker}${overlayFileDocker}`;

  useEffect(() => {
    const buildConfig = async () => {
      let sortOps: any = sortSet;
      let filterOps: any = filterContent;
      let generateOps: any = generateSet;
      let casingOps: any = casingSet;
      let overlayOps: any = overlaySet;

      if (typeof filterContent === 'string' && filterContent.length) {
        try {
          filterOps = await parseString(filterContent);
        } catch {}
      }
      if (typeof sortSet === 'string' && sortSet.length) {
        try {
          sortOps = await parseString(sortSet);
        } catch {}
      }
      if (typeof generateSet === 'string' && generateSet.length) {
        try {
          generateOps = await parseString(generateSet);
        } catch {}
      }
      if (typeof casingSet === 'string' && casingSet.length) {
        try {
          casingOps = await parseString(casingSet);
        } catch {}
      }
      if (typeof overlaySet === 'string' && overlaySet.length) {
        try {
          overlayOps = await parseString(overlaySet);
        } catch {}
      }

      const configInput: Record<string, any> = {
        output: `openapi-formatted.${fileExt}`,
        sort: !!sort,
        keepComments,
        ...(filterContent?.length && { filterSet: filterOps }),
        ...(sortSet?.length && { sortSet: sortOps }),
        ...(overlaySet?.length && toggleOverlay && { overlaySet: overlayOps }),
        ...(generateSet?.length && toggleGenerate && { generateSet: generateOps }),
        ...(casingSet?.length && toggleCasing && { casingSet: casingOps }),
      };

      if (!keepComments || format === 'json') {
        delete configInput.keepComments;
      }

      const result = await stringify(configInput as any, { format });
      setConfigFileContent(result as string);
    };

    void buildConfig();
  }, [
    sort,
    keepComments,
    filterContent,
    sortSet,
    generateSet,
    casingSet,
    overlaySet,
    format,
    toggleGenerate,
    toggleCasing,
    toggleOverlay,
    fileExt,
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const showDownloads = activeTab !== 'config';
  const hasAnyOptionSet = useMemo(
    () =>
      [sortContent, filterContent, generateSet || '', casingSet || '', overlaySet || ''].some(
        (s) => s.length > 0,
      ),
    [sortContent, filterContent, generateSet, casingSet, overlaySet],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='w-[92vw] max-w-[92vw] h-[88vh] max-h-[88vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle>How to Use openapi-format CLI</DialogTitle>
        </DialogHeader>

        <div className='text-sm text-muted-foreground space-y-1 mb-2'>
          <p>You can use your current configuration, by following the steps below.</p>
          <p>
            The online playground provides an initial set of options of OpenAPI-Format, more options
            can be found in the{' '}
            <a
              href='https://github.com/thim81/openapi-format?tab=readme-ov-file#command-line-interface'
              target='_blank'
              rel='noopener noreferrer'
              className='underline text-foreground'
            >
              README
            </a>
            .
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='flex-1 min-h-0 flex flex-col'
        >
          <TabsList className='mb-3 w-fit'>
            <TabsTrigger value='npx'>Using NPX</TabsTrigger>
            <TabsTrigger value='npm'>Using NPM</TabsTrigger>
            <TabsTrigger value='config'>Using Config File</TabsTrigger>
            <TabsTrigger value='docker'>Using Docker</TabsTrigger>
          </TabsList>

          <div className='flex-1 min-h-0 overflow-auto space-y-4 pr-1'>
            <TabsContent value='npx' className='space-y-2 m-0'>
              <h3 className='text-sm font-semibold'>Using openapi-format with NPX</h3>
              <ol className='list-decimal list-inside ml-2 space-y-2 text-sm'>
                <li>Open your terminal or command prompt.</li>
                <li>To format your OpenAPI file, run the following command:</li>
              </ol>
              <div className='relative'>
                <pre className='bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap'>
                  {npxCommand}
                </pre>
                <Button
                  variant='ghost'
                  size='icon'
                  className='absolute top-1 right-1 h-6 w-6'
                  onClick={() => copyToClipboard(npxCommand)}
                >
                  <Copy className='h-3 w-3' />
                </Button>
              </div>
              <ol className='list-decimal list-inside ml-2 text-sm' start={3}>
                <li>
                  Review the command and ensure that the OpenAPI input and output match your local
                  or remote file.
                </li>
              </ol>
            </TabsContent>

            <TabsContent value='npm' className='space-y-2 m-0'>
              <h3 className='text-sm font-semibold'>Using openapi-format with NPM</h3>
              <ol className='list-decimal list-inside ml-2 space-y-2 text-sm'>
                <li>Install the package globally:</li>
              </ol>
              <pre className='bg-muted p-3 rounded-md text-xs font-mono'>
                npm install -g openapi-format
              </pre>
              <ol className='list-decimal list-inside ml-2 space-y-2 text-sm' start={2}>
                <li>Run the following command to format your OpenAPI file:</li>
              </ol>
              <div className='relative'>
                <pre className='bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap'>
                  {npmCommand}
                </pre>
                <Button
                  variant='ghost'
                  size='icon'
                  className='absolute top-1 right-1 h-6 w-6'
                  onClick={() => copyToClipboard(npmCommand)}
                >
                  <Copy className='h-3 w-3' />
                </Button>
              </div>
              <ol className='list-decimal list-inside ml-2 text-sm' start={3}>
                <li>
                  Review the command and ensure that the OpenAPI input and output match your local
                  or remote file.
                </li>
              </ol>
            </TabsContent>

            <TabsContent value='docker' className='space-y-2 m-0'>
              <h3 className='text-sm font-semibold'>Using openapi-format with Docker</h3>
              <ol className='list-decimal list-inside ml-2 space-y-2 text-sm'>
                <li>Pull the Docker image:</li>
              </ol>
              <pre className='bg-muted p-3 rounded-md text-xs font-mono'>
                docker pull ghcr.io/thim81/openapi-format:latest
              </pre>
              <ol className='list-decimal list-inside ml-2 space-y-2 text-sm' start={2}>
                <li>Run the Docker container with the appropriate options:</li>
              </ol>
              <div className='relative'>
                <pre className='bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap'>
                  {dockerCommand}
                </pre>
                <Button
                  variant='ghost'
                  size='icon'
                  className='absolute top-1 right-1 h-6 w-6'
                  onClick={() => copyToClipboard(dockerCommand)}
                >
                  <Copy className='h-3 w-3' />
                </Button>
              </div>
              <ol className='list-decimal list-inside ml-2 text-sm' start={3}>
                <li>
                  Review the command and ensure that the OpenAPI input and output match your local
                  or remote file.
                </li>
              </ol>
            </TabsContent>

            <TabsContent value='config' className='space-y-3 m-0'>
              <h3 className='text-sm font-semibold'>Using openapi-format with a Config File</h3>
              <ol className='list-decimal list-inside ml-2 space-y-2 text-sm'>
                <li>Create or download a config file with the current options:</li>
              </ol>
              <div className='flex items-center gap-2'>
                <span className='text-sm'>Download config file:</span>
                <DownloadButton content={configFileContent} filename='oaf-config' format={format} />
              </div>
              <div className='h-[45vh] border rounded-md overflow-hidden'>
                <MonacoEditor
                  value={configFileContent}
                  language={format}
                  readOnly
                  showLineNumbers={false}
                />
              </div>
              <ol className='list-decimal list-inside ml-2 space-y-2 text-sm' start={2}>
                <li>Run the following command to use the config file:</li>
              </ol>
              <div className='relative'>
                <pre className='bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap'>{`npx openapi-format openapi.${fileExt} --configFile oaf-config.${fileExt}`}</pre>
                <Button
                  variant='ghost'
                  size='icon'
                  className='absolute top-1 right-1 h-6 w-6'
                  onClick={() =>
                    copyToClipboard(
                      `npx openapi-format openapi.${fileExt} --configFile oaf-config.${fileExt}`,
                    )
                  }
                >
                  <Copy className='h-3 w-3' />
                </Button>
              </div>
              <ol className='list-decimal list-inside ml-2 text-sm' start={3}>
                <li>
                  Review the options and ensure that the OpenAPI input and output match your local
                  or remote file.
                </li>
              </ol>
            </TabsContent>

            {showDownloads && hasAnyOptionSet && (
              <div className='space-y-3 pt-2 border-t'>
                <h3 className='text-sm font-semibold'>CLI option files to download</h3>

                {sortContent.length > 0 && sort && (
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm'>Sort Options</span>
                      <DownloadButton content={sortContent} filename='oaf-sort' format={format} />
                    </div>
                    <div className='h-[14vh] border rounded-md overflow-hidden'>
                      <MonacoEditor
                        value={sortContent}
                        language={format}
                        readOnly
                        showLineNumbers={false}
                      />
                    </div>
                  </div>
                )}

                {filterContent.length > 0 && (
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm'>Filter Options</span>
                      <DownloadButton
                        content={filterContent}
                        filename='oaf-filter'
                        format={format}
                      />
                    </div>
                    <div className='h-[14vh] border rounded-md overflow-hidden'>
                      <MonacoEditor
                        value={filterContent}
                        language={format}
                        readOnly
                        showLineNumbers={false}
                      />
                    </div>
                  </div>
                )}

                {generateSet && generateSet.length > 0 && toggleGenerate && (
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm'>Generate Options</span>
                      <DownloadButton
                        content={generateSet}
                        filename='oaf-generate'
                        format={format}
                      />
                    </div>
                    <div className='h-[14vh] border rounded-md overflow-hidden'>
                      <MonacoEditor
                        value={generateSet}
                        language={format}
                        readOnly
                        showLineNumbers={false}
                      />
                    </div>
                  </div>
                )}

                {casingSet && casingSet.length > 0 && toggleCasing && (
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm'>Casing Options</span>
                      <DownloadButton content={casingSet} filename='oaf-casing' format={format} />
                    </div>
                    <div className='h-[14vh] border rounded-md overflow-hidden'>
                      <MonacoEditor
                        value={casingSet}
                        language={format}
                        readOnly
                        showLineNumbers={false}
                      />
                    </div>
                  </div>
                )}

                {overlaySet && overlaySet.length > 0 && toggleOverlay && (
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm'>OpenAPI Overlay Options</span>
                      <DownloadButton content={overlaySet} filename='oaf-overlay' format={format} />
                    </div>
                    <div className='h-[14vh] border rounded-md overflow-hidden'>
                      <MonacoEditor
                        value={overlaySet}
                        language={format}
                        readOnly
                        showLineNumbers={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InstructionsDialog;
