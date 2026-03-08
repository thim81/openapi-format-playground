export function generateJsonPathSuggestions(oa: any): string[] {
  const out = new Set<string>();
  out.add('$.paths');
  out.add('$.info');
  out.add('$.info.title');
  out.add('$.servers');

  if (Array.isArray(oa?.servers)) {
    oa.servers.forEach((_: any, i: number) => {
      out.add(`$.servers[${i}]`);
      out.add(`$.servers[${i}].url`);
      out.add(`$.servers[${i}].description`);
      if (oa.servers[i]?.variables && typeof oa.servers[i].variables === 'object') {
        Object.keys(oa.servers[i].variables).forEach((v) => {
          const vKey = escapeJsonPathKey(v);
          out.add(`$.servers[${i}].variables${vKey}`);
          out.add(`$.servers[${i}].variables${vKey}.default`);
          out.add(`$.servers[${i}].variables${vKey}.enum`);
          out.add(`$.servers[${i}].variables${vKey}.description`);
        });
      }
    });
  }

  if (oa?.paths && typeof oa.paths === 'object') {
    Object.keys(oa.paths).forEach((p) => {
      const key = escapeJsonPathKey(p);
      const base = `$.paths${key}`;
      out.add(base);
      const item = oa.paths[p] || {};
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];
      methods.forEach((m) => {
        if (item[m]) {
          const mBase = `${base}.${m}`;
          out.add(mBase);
          out.add(`${mBase}.summary`);
          out.add(`${mBase}.operationId`);
          out.add(`${mBase}.tags`);
          out.add(`${mBase}.responses`);
          out.add(`${mBase}.parameters`);
          out.add(`${mBase}.requestBody`);
        }
      });
    });
  }

  return Array.from(out);
}

function escapeJsonPathKey(key: string): string {
  return `['${String(key).replace(/'/g, "\\'")}']`;
}

export function scanPathsFromRaw(raw: string): string[] {
  try {
    const lines = raw.split(/\r?\n/);
    const out = new Set<string>();
    let inPaths = false;
    let baseIndent: number | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^(\s*)paths\s*:\s*$/);
      if (m) {
        inPaths = true;
        baseIndent = m[1].length;
        continue;
      }
      if (!inPaths) continue;

      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;
      if (baseIndent != null && indent <= baseIndent && line.trim().length > 0) {
        break;
      }

      const pathKeyMatch = line.match(/^\s*(?:['"])?(\/[^{:\s][^:\"]*)(?:['"])?:\s*$/);
      if (pathKeyMatch) {
        const key = pathKeyMatch[1].trim();
        if (key.startsWith('/')) out.add(`$.paths${escapeJsonPathKey(key)}`);
      }
    }

    return Array.from(out);
  } catch {
    return [];
  }
}
