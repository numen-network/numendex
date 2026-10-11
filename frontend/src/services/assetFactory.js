import { ethers } from "ethers";
import { ASSET_PROTOCOL_ADDRESSES } from "../config/assetProtocol";
import { NUMEN_NETWORK } from "../config/network";

const ZERO_ADDRESS = ethers.ZeroAddress;
const ZERO_HASH = ethers.ZeroHash;
const SUPPLY_MODELS = { fixed: 1, capped: 2, uncapped: 3 };

const COMMON_EVENT_INPUTS = [
  { name: "asset", type: "address", indexed: true },
  { name: "assetId", type: "bytes32", indexed: true },
  { name: "creator", type: "address", indexed: true },
  { name: "admin", type: "address", indexed: false },
  { name: "registry", type: "address", indexed: false },
];

const FUNGIBLE_COMPONENTS = [
  ["name", "string"], ["symbol", "string"], ["decimals", "uint8"],
  ["initialSupply", "uint256"], ["maxSupply", "uint256"], ["supplyModel", "uint8"],
  ["mintable", "bool"], ["burnable", "bool"], ["pausable", "bool"],
  ["permitEnabled", "bool"], ["votesEnabled", "bool"], ["objectBindingEnabled", "bool"],
  ["category", "uint8"], ["representation", "uint8"], ["metadataURI", "string"],
  ["metadataHash", "bytes32"], ["creator", "address"], ["admin", "address"],
  ["initialRecipient", "address"], ["mintAuthority", "address"], ["pauseAuthority", "address"],
  ["metadataAuthority", "address"], ["registry", "address"],
].map(([name, type]) => ({ name, type }));

const ERC721_COMPONENTS = [
  ["name", "string"], ["symbol", "string"], ["maxSupply", "uint256"],
  ["mintable", "bool"], ["burnable", "bool"], ["pausable", "bool"], ["objectBindingEnabled", "bool"],
  ["category", "uint8"], ["representation", "uint8"], ["metadataURI", "string"],
  ["metadataHash", "bytes32"], ["baseURI", "string"], ["creator", "address"], ["admin", "address"],
  ["mintAuthority", "address"], ["pauseAuthority", "address"], ["metadataAuthority", "address"], ["registry", "address"],
].map(([name, type]) => ({ name, type }));

const ERC1155_COMPONENTS = [
  ["baseURI", "string"], ["mintable", "bool"], ["burnable", "bool"], ["pausable", "bool"],
  ["objectBindingEnabled", "bool"], ["category", "uint8"], ["representation", "uint8"],
  ["metadataURI", "string"], ["metadataHash", "bytes32"], ["creator", "address"], ["admin", "address"],
  ["mintAuthority", "address"], ["pauseAuthority", "address"], ["metadataAuthority", "address"], ["registry", "address"],
].map(([name, type]) => ({ name, type }));

function factoryAbi(functionName, eventName, components) {
  return [
    { type: "function", name: functionName, stateMutability: "nonpayable", inputs: [{ name: "config", type: "tuple", components }], outputs: [{ name: "asset", type: "address" }, { name: "assetId", type: "bytes32" }] },
    { type: "event", name: eventName, anonymous: false, inputs: COMMON_EVENT_INPUTS },
  ];
}

const FACTORIES = {
  fungible: { address: ASSET_PROTOCOL_ADDRESSES.FUNGIBLE_FACTORY, fn: "createFungibleAsset", event: "FungibleAssetCreated", abi: factoryAbi("createFungibleAsset", "FungibleAssetCreated", FUNGIBLE_COMPONENTS), gasLimit: 8_000_000n },
  erc721: { address: ASSET_PROTOCOL_ADDRESSES.ERC721_FACTORY, fn: "createERC721Asset", event: "ERC721AssetCreated", abi: factoryAbi("createERC721Asset", "ERC721AssetCreated", ERC721_COMPONENTS), gasLimit: 8_000_000n },
  erc1155: { address: ASSET_PROTOCOL_ADDRESSES.ERC1155_FACTORY, fn: "createERC1155Asset", event: "ERC1155AssetCreated", abi: factoryAbi("createERC1155Asset", "ERC1155AssetCreated", ERC1155_COMPONENTS), gasLimit: 8_000_000n },
};

function address(value, label) {
  if (!ethers.isAddress(String(value || "").trim())) throw new Error(`${label} is not a valid address.`);
  return ethers.getAddress(String(value).trim());
}

function integer(value, label, max = null) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || (max !== null && n > max)) throw new Error(`${label} is invalid.`);
  return n;
}

function metadataHash(form) {
  const payload = {
    name: String(form.name || "").trim(), symbol: String(form.symbol || "").trim().toUpperCase(),
    description: String(form.description || "").trim(), category: Number(form.category ?? 0),
    customCategory: String(form.customCategory || "").trim(), representation: Number(form.representation ?? 0),
    customRepresentation: String(form.customRepresentation || "").trim(), metadataURI: String(form.metadataURI || "").trim(),
    properties: Array.isArray(form.properties) ? form.properties : [],
  };
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(payload)));
}

async function context(account) {
  if (!window.ethereum) throw new Error("No browser wallet was detected.");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== Number(NUMEN_NETWORK.chainId)) throw new Error("Switch your wallet to Numen Network.");
  const signer = await provider.getSigner();
  const signerAddress = address(await signer.getAddress(), "Connected wallet");
  const creator = address(account, "Creator");
  if (signerAddress.toLowerCase() !== creator.toLowerCase()) throw new Error("The connected wallet does not match the asset creator.");
  return { provider, signer, creator };
}

function authorities(form, creator) {
  const admin = address(form.adminAddress || creator, "Administrator");
  const metadataAuthority = address(form.metadataAuthority || creator, "Metadata authority");
  const mintAuthority = form.mintEnabled ? address(form.mintAuthority || creator, "Mint authority") : ZERO_ADDRESS;
  const pauseAuthority = form.pauseEnabled ? address(form.pauseAuthority || creator, "Pause authority") : ZERO_ADDRESS;
  return { admin, metadataAuthority, mintAuthority, pauseAuthority };
}

function common(form, creator) {
  const a = authorities(form, creator);
  return {
    mintable: Boolean(form.mintEnabled), burnable: Boolean(form.burnEnabled), pausable: Boolean(form.pauseEnabled),
    objectBindingEnabled: Boolean(form.objectBindingEnabled), category: integer(form.category ?? 0, "Category", 22),
    representation: integer(form.representation ?? 0, "Representation", 12), metadataURI: String(form.metadataURI || "").trim(),
    metadataHash: metadataHash(form), creator, ...a, registry: address(ASSET_PROTOCOL_ADDRESSES.ASSET_REGISTRY, "Asset Registry"),
  };
}

function fungibleConfig(form, creator) {
  const decimals = integer(form.decimals, "Decimals", 18);
  const initialSupply = ethers.parseUnits(String(form.initialSupply || ""), decimals);
  if (initialSupply <= 0n) throw new Error("Initial supply must be greater than zero.");
  const model = String(form.supplyModel || "");
  const supplyModel = SUPPLY_MODELS[model];
  if (!supplyModel) throw new Error("Invalid supply model.");
  let maxSupply = 0n;
  let mintable = Boolean(form.mintEnabled);
  if (model === "fixed") { maxSupply = initialSupply; mintable = false; }
  if (model === "capped") { maxSupply = ethers.parseUnits(String(form.maxSupply || ""), decimals); if (maxSupply < initialSupply) throw new Error("Maximum supply cannot be lower than initial supply."); mintable = true; }
  if (model === "uncapped") mintable = true;
  const c = common({ ...form, mintEnabled: mintable }, creator);
  return { name: String(form.name || "").trim(), symbol: String(form.symbol || "").trim().toUpperCase(), decimals, initialSupply, maxSupply, supplyModel, ...c, permitEnabled: Boolean(form.permitEnabled), votesEnabled: Boolean(form.votesEnabled), initialRecipient: address(form.initialRecipient || creator, "Initial recipient") };
}

function erc721Config(form, creator) {
  const c = common(form, creator);
  const rawMax = String(form.maxSupply || "").trim();
  const maxSupply = rawMax ? BigInt(rawMax) : 0n;
  return { name: String(form.name || "").trim(), symbol: String(form.symbol || "").trim().toUpperCase(), maxSupply, ...c, baseURI: String(form.baseURI || "").trim() };
}

function erc1155Config(form, creator) {
  const c = common(form, creator);
  return { baseURI: String(form.baseURI || "").trim(), ...c };
}

function parseCreated(contract, receipt, eventName) {
  for (const log of receipt.logs || []) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === eventName) return parsed;
    } catch { /* another contract's log */ }
  }
  throw new Error(`${eventName} event was not found in the successful transaction.`);
}

export async function createAssetContract({ form, account }) {
  const { signer, creator } = await context(account);
  const kind = form.assetClass === "fungible" ? "fungible" : form.nftStandard;
  const spec = FACTORIES[kind];
  if (!spec) throw new Error("Unsupported asset standard.");
  const config = kind === "fungible" ? fungibleConfig(form, creator) : kind === "erc721" ? erc721Config(form, creator) : erc1155Config(form, creator);
  const contract = new ethers.Contract(address(spec.address, "Factory"), spec.abi, signer);
  const tx = await contract[spec.fn](config, { gasLimit: spec.gasLimit });
  const receipt = await tx.wait();
  if (!receipt || Number(receipt.status) !== 1) throw new Error("Asset creation transaction failed.");
  const event = parseCreated(contract, receipt, spec.event);
  return { standard: kind, assetAddress: ethers.getAddress(event.args.asset), assetId: event.args.assetId, creator: ethers.getAddress(event.args.creator), admin: ethers.getAddress(event.args.admin), registry: ethers.getAddress(event.args.registry), transactionHash: receipt.hash || tx.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed, config };
}

export const createFungibleAsset = createAssetContract;
export default { createAssetContract, createFungibleAsset };
