import { ethers } from "ethers";
import { ASSET_PROTOCOL_ADDRESSES } from "../config/assetProtocol";

const ZERO_HASH = ethers.ZeroHash;
const coder = ethers.AbiCoder.defaultAbiCoder();

const METADATA_ABI = ["function createProperty(bytes32 assetId,string key,uint8 valueType,bytes value,string unit) returns (bytes32 propertyId)"];
const OBJECT_ABI = [
  "function registerObject((address creator,address controller,string modelURI,bytes32 modelHash,string modelFormat,bytes32 spectralFingerprint,string spectralAlgorithm,string spectralVersion,string metadataURI,bytes32 metadataHash) request) returns (bytes32 objectId)",
  "event ObjectRegistered(bytes32 indexed objectId,address indexed creator,address indexed controller,bytes32 modelHash,string modelURI,string modelFormat)"
];
const BINDING_ABI = ["function bindObject(bytes32 assetId,bytes32 objectId,uint8 linkType) returns (bytes32 bindingId)"];
const REGISTRY_ABI = ["function getAsset(bytes32 assetId) view returns ((bytes32 assetId,uint8 assetClass,uint8 standard,uint8 scope,uint8 category,uint8 representation,address assetContract,uint256 tokenId,address creator,address controller,string metadataURI,bytes32 metadataHash,uint64 createdAt,uint64 updatedAt,bool active))"];
const ATTESTATION_ABI = ["function createAttestation((bytes32 assetId,bytes32 objectId,uint8 attestationType,string claimURI,bytes32 claimHash,string evidenceURI,bytes32 evidenceHash,uint64 expiresAt) request) returns (bytes32 attestationId)"];
const DOCUMENT_ABI = ["function registerDocument((bytes32 assetId,bytes32 objectId,string documentType,string documentURI,bytes32 documentHash,string mimeType,string issuer,uint64 issuedAt,uint64 expiresAt) request) returns (bytes32 documentId)"];
const PROVENANCE_ABI = ["function recordProvenance(bytes32 assetId,bytes32 eventType,address relatedAddress,string dataURI,bytes32 dataHash) returns (uint256 entryId)"];

function bytes32(value, label, optional = false) {
  const v = String(value || "").trim();
  if (!v && optional) return ZERO_HASH;
  if (!/^0x[0-9a-fA-F]{64}$/.test(v)) throw new Error(`${label} must be a 32-byte 0x-prefixed hash.`);
  return v;
}

function encodeProperty(property) {
  const type = Number(property.valueType);
  const value = property.value;
  if (type === 0 || type === 2 || type === 5) return coder.encode(["string"], [String(value)]);
  if (type === 1) return coder.encode(["int256"], [BigInt(String(value))]);
  if (type === 3) return coder.encode(["bool"], [String(value).toLowerCase() === "true"]);
  if (type === 4) { const timestamp = /^\d+$/.test(String(value)) ? BigInt(value) : BigInt(Math.floor(new Date(value).getTime() / 1000)); return coder.encode(["uint256"], [timestamp]); }
  if (type === 6) return coder.encode(["bytes32"], [bytes32(value, "Property hash")]);
  if (type === 7) { if (!ethers.isAddress(value)) throw new Error(`Property ${property.key} has an invalid address.`); return coder.encode(["address"], [value]); }
  if (type === 8) { if (!ethers.isHexString(value)) throw new Error(`Property ${property.key} must be hex bytes.`); return coder.encode(["bytes"], [value]); }
  throw new Error(`Unsupported property type for ${property.key}.`);
}

export async function createAssetProperties({ signer, assetId, properties = [], onProgress }) {
  const contract = new ethers.Contract(ASSET_PROTOCOL_ADDRESSES.METADATA_REGISTRY, METADATA_ABI, signer);
  const results = [];
  for (let i = 0; i < properties.length; i += 1) {
    const p = properties[i];
    onProgress?.(`Writing property ${i + 1}/${properties.length}: ${p.label || p.key}`);
    const tx = await contract.createProperty(assetId, String(p.key).trim(), Number(p.valueType), encodeProperty(p), String(p.unit || "").trim(), { gasLimit: 650_000n });
    const receipt = await tx.wait();
    results.push({ key: p.key, transactionHash: receipt.hash || tx.hash });
  }
  return results;
}

export async function registerAssetObject({ signer, account, admin, form }) {
  if (!form.physicalEnabled || !form.modelEnabled) return null;
  const modelURI = String(form.modelURI || "").trim();
  if (!modelURI) throw new Error("Model URI is required to register a Numen Object record.");
  const modelHash = bytes32(form.modelHash, "Model hash");
  const fingerprint = bytes32(form.shapeFingerprint, "Shape fingerprint", true);
  const objectMetadata = { name: String(form.objectName || "").trim(), externalObjectId: String(form.externalObjectId || "").trim(), description: String(form.objectDescription || "").trim() };
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(objectMetadata)));
  const contract = new ethers.Contract(ASSET_PROTOCOL_ADDRESSES.OBJECT_REGISTRY, OBJECT_ABI, signer);
  const request = { creator: account, controller: admin, modelURI, modelHash, modelFormat: String(form.modelFormat || "").trim(), spectralFingerprint: fingerprint, spectralAlgorithm: "", spectralVersion: "", metadataURI: "", metadataHash };
  const tx = await contract.registerObject(request, { gasLimit: 1_200_000n });
  const receipt = await tx.wait();
  let objectId = null;
  for (const log of receipt.logs || []) { try { const parsed = contract.interface.parseLog(log); if (parsed?.name === "ObjectRegistered") { objectId = parsed.args.objectId; break; } } catch { /* ignore */ } }
  if (!objectId) throw new Error("Object registration succeeded but ObjectRegistered was not found.");
  return { objectId, transactionHash: receipt.hash || tx.hash };
}

export async function bindAssetObject({ signer, assetId, objectId, linkType = 1 }) {
  const contract = new ethers.Contract(ASSET_PROTOCOL_ADDRESSES.OBJECT_BINDING, BINDING_ABI, signer);
  const tx = await contract.bindObject(assetId, objectId, linkType, { gasLimit: 900_000n });
  const receipt = await tx.wait();
  return { transactionHash: receipt.hash || tx.hash };
}

export async function getAssetRecord({ provider, assetId }) {
  const contract = new ethers.Contract(ASSET_PROTOCOL_ADDRESSES.ASSET_REGISTRY, REGISTRY_ABI, provider);
  return contract.getAsset(assetId);
}

export async function createAttestation({ signer, request }) {
  const contract = new ethers.Contract(ASSET_PROTOCOL_ADDRESSES.ATTESTATION_REGISTRY, ATTESTATION_ABI, signer);
  const tx = await contract.createAttestation(request, { gasLimit: 900_000n }); return (await tx.wait()).hash || tx.hash;
}
export async function registerDocument({ signer, request }) {
  const contract = new ethers.Contract(ASSET_PROTOCOL_ADDRESSES.DOCUMENT_REGISTRY, DOCUMENT_ABI, signer);
  const tx = await contract.registerDocument(request, { gasLimit: 900_000n }); return (await tx.wait()).hash || tx.hash;
}
export async function recordProvenance({ signer, assetId, eventType, relatedAddress = ethers.ZeroAddress, dataURI = "", dataHash = ZERO_HASH }) {
  const contract = new ethers.Contract(ASSET_PROTOCOL_ADDRESSES.PROVENANCE_REGISTRY, PROVENANCE_ABI, signer);
  const tx = await contract.recordProvenance(assetId, eventType, relatedAddress, dataURI, dataHash, { gasLimit: 700_000n }); return (await tx.wait()).hash || tx.hash;
}
