const fs = require('fs');
const utils = fs.readFileSync('src/features/network/graphUtils.js', 'utf8')
  .replace(/export /g, '')
  .replace(/import .*/g, '');
const code = \
  \
  const data = JSON.parse(fs.readFileSync('testData.json', 'utf8'));
  const cases = data.CaseMaster.filter(c => c.CaseMasterID === '801' || c.ROWID === '56064000000177002');
  const res = buildNetworkData(cases, data.Accused, data.Victim, data.District, data.Unit);
  console.log('Nodes:', res.nodes.filter(n => n.type === 'criminal').length);
  console.log('Edges to Criminal:', res.edges.filter(e => String(e.source).startsWith('accused_') || String(e.target).startsWith('accused_')).length);
\;
fs.writeFileSync('test_run.js', code);
