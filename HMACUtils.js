const crypto = require('crypto');

class HMACUtils {
    static CipherKey = "";
    static KeyDefId = "77756";
    static uuid = "";
    static session = 0;
    static GetSecretKey() {
        let cipherKey = HMACUtils.CipherKey;
        let string = cipherKey.toString();

        if (string == null || string === "") {
            let keyDefId = HMACUtils.KeyDefId;
            let stringWithDefID = GlobalChartData.GetStringWithDefID(keyDefId, "");
            let obscuredString = stringWithDefID.toString();
            HMACUtils.CipherKey = obscuredString;
        }

        let cipherKey2 = HMACUtils.CipherKey;
        return cipherKey2.toString();
    }

    static GetHMAC(msg) {
        let val_1 = HMACUtils.GetDataSalt();
        let val_2 = msg + val_1;
        let val_3 = HMACUtils.GetSecretKey();
        let val_4 = val_3 + HMACUtils.GetSecretSalt();

        let val_9 = Buffer.from(val_4, 'utf8');
        let val_10 = crypto.createHmac('sha256', val_9);

        let val_11 = Buffer.from(val_2, 'utf8');
        let val_12 = val_10.update(val_11).digest('base64');

        return val_12;
    }

    static GetHMACWithParams(inParams, inCmd) {
        let stringBuilder = '';
        let string = inParams.join("");
        stringBuilder += string;
        let string2 = stringBuilder.toString();
        let hmac = HMACUtils.GetHMAC(string2);
        return hmac;
    }
    
    static GetDataSalt() {
        let UUID = this.uuid;
        return UUID;
    }

    static GetSecretSalt() {
        let sessionID = this.session;
        let string = sessionID.toString();
        return string;
    }
}
module.exports = HMACUtils;
