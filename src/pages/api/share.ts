import { NextApiRequest, NextApiResponse } from 'next';
import {generateShareUrl} from "@/utils";


export default function share(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { openapi, config } = req.body;
  if (!openapi || !config) {
    res.status(422).json({ message: 'Missing openapi or config' });
    return;
  }

  try {
    const shareUrl = generateShareUrl(req.headers.origin as string, openapi, config);
    res.status(200).json({ shareUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate share url';
    res.status(500).json({ message: 'Internal server error', error: message });
  }
}
