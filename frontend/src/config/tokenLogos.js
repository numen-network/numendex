import { TOKEN_ADDRESSES } from "./network";

export const DEFAULT_TOKEN_LOGO = "/tokens/default-token.svg";

const LOCAL_TOKEN_LOGOS = Object.freeze({
  [TOKEN_ADDRESSES.NUMN.toLowerCase()]: "/tokens/numn.png",
  [TOKEN_ADDRESSES.NDEX.toLowerCase()]: "/tokens/ndex.png",

  // Wrapped WTMR
  "0xa1795b3c6f74866c7def1df390f9e2e403dca2e9": "/tokens/wWTMR.svg",
});

export function getLocalTokenLogo(address) {
  const key = String(address || "").toLowerCase();
  return LOCAL_TOKEN_LOGOS[key] || DEFAULT_TOKEN_LOGO;
}

export function isOfficialTokenLogo(address) {
  const key = String(address || "").toLowerCase();
  return Boolean(LOCAL_TOKEN_LOGOS[key]);
}

export default LOCAL_TOKEN_LOGOS;