const browserFsStub = new Proxy(
  {},
  {
    get(_target, prop) {
      throw new Error(`Cannot use fs.${String(prop)} in the browser bundle.`);
    },
  }
);

module.exports = typeof window === 'undefined' ? require('node:fs') : browserFsStub;
