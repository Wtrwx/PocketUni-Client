// des.js
import CryptoJS from 'crypto-js';

// 默认密钥
const defaultKey = 'TG123!@#qazDES*&^956367encode7788TR';

// 加密函数
export const encrypt = (data, key = defaultKey) => {
  const encryptedData = CryptoJS.DES.encrypt(data, CryptoJS.enc.Utf8.parse(key), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encryptedData.toString();
}

// 解密函数
export const decrypt = (data, key = defaultKey) => {
  const decryptedData = CryptoJS.DES.decrypt({
    ciphertext: CryptoJS.enc.Base64.parse(data),
  }, CryptoJS.enc.Utf8.parse(key), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decryptedData.toString(CryptoJS.enc.Utf8);
}