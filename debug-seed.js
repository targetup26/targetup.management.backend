const fs = require('fs');
const util = require('util');
const logFile = fs.createWriteStream('seed_debug.log', { flags: 'w' });
const logStdout = process.stdout;
const logStderr = process.stderr;

console.log = function () {
    logFile.write(util.format.apply(null, arguments) + '\n');
    logStdout.write(util.format.apply(null, arguments) + '\n');
};
console.error = function () {
    logFile.write(util.format.apply(null, arguments) + '\n');
    logStderr.write(util.format.apply(null, arguments) + '\n');
};

try {
    require('./seed.js');
} catch (err) {
    console.error(err);
}
