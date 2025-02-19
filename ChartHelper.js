const fetch = require('node-fetch');
const fs = require('fs');
const HMACUtils = require("./HMACUtils");
const sqlite3 = require('sqlite3').verbose();
class ChartHelper {
  static downloadDatabase(value) {
    return new Promise(async (resolve) => {
      // Fetch the shared hash text file
      const hashUrl = `https://game-assets.animaljam.com/${value}/charts/charts_shared_hash.txt`;
      const hashResponse = await fetch(hashUrl);
      const hashText = await hashResponse.text();

      // Construct the database URL using the retrieved hash value
      const dbUrl = `https://game-assets.animaljam.com/${value}/charts/charts_shared.${hashText}.db`;

      // Fetch the database file
      const dbResponse = await fetch(dbUrl);
      const dbBuffer = await dbResponse.buffer();

      // Save the database file
      const dbFilePath = `charts_shared_${value}.db`;
      fs.writeFileSync(dbFilePath, dbBuffer);

      console.log(`Database downloaded and saved as ${dbFilePath}`);
      return resolve(dbFilePath);
    })
  }
  static GetHMACSecretKey(dbPath) {
    return new Promise((resolve, reject) => {
      const encryptedDefID = xorEncrypt(
        true,
        HMACUtils.KeyDefId,
        "key_id"
      );
      const db = new sqlite3.Database(dbPath);
  
      db.serialize(() => {
        const query = `SELECT data FROM GlobalChart WHERE defId = '${encryptedDefID}'`;
        db.all(query, (err, rows) => {
          if (err) {
            console.error('Error executing query:', err.message);
            return reject(null);
          }
          //console.log(rows)
          if (rows.length === 0) {
            console.log('No data found for the given defId.');
            return reject(null);
          }
  
          const decryptedData = xorDecrypt(true, rows[0].data, "key_" + HMACUtils.KeyDefId);
          console.log('Decrypted data:', decryptedData.split(",")[5].replace(/\\/g, ""));
          return resolve(decryptedData.split(",")[5].replace(/\\/g, ""));
        });
      });
  
      db.close((err) => {
        if (err) {
          console.error('Error closing database connection:', err.message);
        } else {
          console.log('Successfully Decrypted Db!');
        }
      });
    })
  }
}
function xorEncryptOrDecrypt(inText, inKey) {
  let stringBuilder = '';
  for (let i = 0; i < inText.length; i++) {
    stringBuilder += String.fromCharCode(
      inText.charCodeAt(i) ^ inKey.charCodeAt(i % inKey.length)
    );
  }
  return stringBuilder;
}

function xorDecrypt(inUseEncryption, inBase64Text, inKey) {
  if (!inUseEncryption) {
    return inBase64Text;
  }
  const bytes = Buffer.from(inBase64Text, 'base64');
  return xorEncryptOrDecrypt(bytes.toString('utf8'), inKey);
}

function xorEncrypt(inUseEncryption, inText, inKey) {
  if (!inUseEncryption) {
    return inText;
  }
  const encryptedText = xorEncryptOrDecrypt(inText, inKey);
  return Buffer.from(encryptedText, 'utf8').toString('base64');
}
module.exports = ChartHelper;
