const { SourceMapConsumer } = require('source-map');
const fs = require('fs');
const map = JSON.parse(fs.readFileSync('dist/assets/index-BkwQmkW5.js.map', 'utf-8'));
const frames = [
  ['Ptt_useListController', 216, 1524],
  ['Xs_DigitList', 266, 16941],
  ['eut_MdmsResourcePage', 278, 12347],
  ['KVe_RestoreScrollPos', 204, 89492],
  ['Bce', 208, 34112],
  ['Ma', 209, 11525],
  ['Tct', 266, 84153],
  ['NKe', 209, 6645],
  ['vKe', 209, 663],
  ['Ke_App', 209, 8323],
];
(async () => {
  const c = await new SourceMapConsumer(map);
  for (const [name, line, col] of frames) {
    const p = c.originalPositionFor({line, column: col});
    console.log([name, p.source, p.line + ':' + p.column, p.name || ''].join('\t'));
  }
  c.destroy();
})();
