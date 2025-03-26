const fs = require('fs');
const csv = require('csv-parser');

module.exports = function() {
  return new Promise((resolve) => {
    const results = [];
    fs.createReadStream('data/ssqhistory.csv')
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      });
  });
};