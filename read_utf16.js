const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(__dirname, 'crime-analytics-dashboard', 'build_error.log');
  const outPath = path.join(__dirname, 'crime-analytics-dashboard', 'build_error_utf8.txt');
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf16le');
    fs.writeFileSync(outPath, content, 'utf8');
    console.log('Successfully converted build_error.log to UTF-8.');
  } else {
    console.log('build_error.log does not exist.');
  }
} catch (err) {
  console.error('Error during conversion:', err);
}
