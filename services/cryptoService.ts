import CryptoJS from 'https://esm.sh/crypto-js';

// In a real app, the key is derived from the Master Password and never stored.
// For this persistent demo, we will simulate a session key.
let sessionKey: string | null = null;

export const setSessionKey = (key: string) => {
  sessionKey = key;
};

export const encryptData = (data: string): string => {
  if (!sessionKey) throw new Error("Vault locked");
  return CryptoJS.AES.encrypt(data, sessionKey).toString();
};

export const decryptData = (ciphertext: string): string => {
  if (!sessionKey) throw new Error("Vault locked");
  const bytes = CryptoJS.AES.decrypt(ciphertext, sessionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};