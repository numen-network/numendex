const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// ============================================================
// NUMEN ASSET PROTOCOL
// RESUME-SAFE MAINNET DEPLOYMENT
//
// Recovery:
// - Existing first 3 deployments are preserved.
// - Deployment state is persisted after every success.
// - Explicit nonce management is used.
// - 501 Gwei gas price is used to avoid reproducing the
//   previously cached nonce-16 transaction.
// ============================================================

const NUMEN_MAINNET_CHAIN_ID = 32026n;

// Numen RPC normally reports 500 Gwei.
// We intentionally use 501 Gwei so the transaction signed with
// nonce 16 has a different hash from the previously cached tx.
const DEPLOY_GAS_PRICE =
  hre.ethers.parseUnits("501", "gwei");

// ============================================================
// KNOWN EXISTING MAINNET CONTRACTS
// ============================================================

const EXISTING = {
  NumenAssetRegistry:
    "0x3F77cA1b0B15296dcD81299e57d341f81DF57236",

  NumenObjectRegistry:
    "0x98957364daF6F78930487be8F7717Ce84462BdBb",

  NumenMetadataRegistry:
    "0xFd4a3d0c6f2Ed3017c44EC082D469DE7f4ee092B",
};

// ============================================================
// DEPLOYMENT STATE FILE
// ============================================================

const deploymentDirectory =
  path.join(
    __dirname,
    "..",
    "deployments"
  );

const outputFile =
  path.join(
    deploymentDirectory,
    "numen-mainnet-assets.json"
  );

// ============================================================
// FILE HELPERS
// ============================================================

function ensureDeploymentDirectory() {
  if (
    !fs.existsSync(
      deploymentDirectory
    )
  ) {
    fs.mkdirSync(
      deploymentDirectory,
      {
        recursive: true,
      }
    );
  }
}

function loadDeploymentData() {
  ensureDeploymentDirectory();

  if (
    !fs.existsSync(
      outputFile
    )
  ) {
    return null;
  }

  try {
    const raw =
      fs.readFileSync(
        outputFile,
        "utf8"
      );

    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Could not read ${outputFile}: ${error.message}`
    );
  }
}

function saveDeploymentData({
  networkName,
  chainId,
  deployerAddress,
  contracts,
}) {
  ensureDeploymentDirectory();

  const deploymentData = {
    protocol:
      "Numen Asset Protocol",

    deploymentType:
      "mainnet",

    network: {
      name:
        networkName,

      chainId:
        chainId.toString(),
    },

    deployer:
      deployerAddress,

    gasPriceWei:
      DEPLOY_GAS_PRICE.toString(),

    gasPriceGwei:
      hre.ethers.formatUnits(
        DEPLOY_GAS_PRICE,
        "gwei"
      ),

    updatedAt:
      new Date().toISOString(),

    contracts,
  };

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      deploymentData,
      null,
      2
    )
  );

  console.log(
    `Saved deployment state: ${outputFile}`
  );
}

// ============================================================
// CHAIN HELPERS
// ============================================================

async function hasCode(address) {
  if (
    !address ||
    !hre.ethers.isAddress(address)
  ) {
    return false;
  }

  const code =
    await hre.ethers.provider.getCode(
      address
    );

  return (
    code &&
    code !== "0x"
  );
}

async function verifyContract(
  name,
  address
) {
  if (
    !address ||
    !hre.ethers.isAddress(address)
  ) {
    throw new Error(
      `${name} has invalid address: ${address}`
    );
  }

  const code =
    await hre.ethers.provider.getCode(
      address
    );

  if (
    !code ||
    code === "0x"
  ) {
    throw new Error(
      `${name} has no deployed bytecode at ${address}`
    );
  }

  console.log(
    `OK ${name}: ${address}`
  );
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const network =
    await hre.ethers.provider.getNetwork();

  const chainId =
    network.chainId;

  const networkName =
    hre.network.name;

  const [deployer] =
    await hre.ethers.getSigners();

  const deployerAddress =
    await deployer.getAddress();

  const balance =
    await hre.ethers.provider.getBalance(
      deployerAddress
    );

  // ============================================================
  // NETWORK SAFETY
  // ============================================================

  console.log(
    "\n========================================"
  );

  console.log(
    "NUMEN ASSET PROTOCOL"
  );

  console.log(
    "RESUME-SAFE MAINNET DEPLOYMENT"
  );

  console.log(
    "========================================"
  );

  console.log(
    "Network:",
    networkName
  );

  console.log(
    "Chain ID:",
    chainId.toString()
  );

  console.log(
    "Deployer:",
    deployerAddress
  );

  console.log(
    "Balance:",
    hre.ethers.formatEther(
      balance
    ),
    "NUMN"
  );

  console.log(
    "Deployment gas price:",
    hre.ethers.formatUnits(
      DEPLOY_GAS_PRICE,
      "gwei"
    ),
    "Gwei"
  );

  if (
    chainId !==
    NUMEN_MAINNET_CHAIN_ID
  ) {
    throw new Error(
      [
        "Wrong network.",
        "Expected Numen Mainnet chainId 32026.",
        `Received chainId ${chainId.toString()}.`,
      ].join("\n")
    );
  }

  if (
    balance === 0n
  ) {
    throw new Error(
      "Deployer has zero NUMN balance."
    );
  }

  // ============================================================
  // LOAD SAVED STATE
  // ============================================================

  const saved =
    loadDeploymentData();

  const contracts = {
    ...(saved?.contracts || {}),
  };

  // The first three addresses are known-good mainnet deployments.
  // Always force these exact addresses.
  contracts.NumenAssetRegistry =
    EXISTING.NumenAssetRegistry;

  contracts.NumenObjectRegistry =
    EXISTING.NumenObjectRegistry;

  contracts.NumenMetadataRegistry =
    EXISTING.NumenMetadataRegistry;

  // ============================================================
  // VERIFY FIRST THREE
  // ============================================================

  console.log(
    "\n========================================"
  );

  console.log(
    "VERIFYING EXISTING DEPLOYMENTS"
  );

  console.log(
    "========================================"
  );

  await verifyContract(
    "NumenAssetRegistry",
    contracts.NumenAssetRegistry
  );

  await verifyContract(
    "NumenObjectRegistry",
    contracts.NumenObjectRegistry
  );

  await verifyContract(
    "NumenMetadataRegistry",
    contracts.NumenMetadataRegistry
  );

  // ============================================================
  // VERIFY METADATA REGISTRY DEPENDENCY
  // ============================================================

  const metadataRegistry =
    await hre.ethers.getContractAt(
      "NumenMetadataRegistry",
      contracts.NumenMetadataRegistry
    );

  const metadataAssetRegistry =
    await metadataRegistry.assetRegistry();

  if (
    metadataAssetRegistry.toLowerCase() !==
    contracts.NumenAssetRegistry.toLowerCase()
  ) {
    throw new Error(
      [
        "NumenMetadataRegistry dependency mismatch.",
        `Expected: ${contracts.NumenAssetRegistry}`,
        `Received: ${metadataAssetRegistry}`,
      ].join("\n")
    );
  }

  console.log(
    "OK NumenMetadataRegistry -> NumenAssetRegistry"
  );

  // ============================================================
  // NONCE STATE
  // ============================================================

  const latestNonce =
    await hre.ethers.provider.getTransactionCount(
      deployerAddress,
      "latest"
    );

  const pendingNonce =
    await hre.ethers.provider.getTransactionCount(
      deployerAddress,
      "pending"
    );

  console.log(
    "\nLatest nonce:",
    latestNonce
  );

  console.log(
    "Pending nonce:",
    pendingNonce
  );

  if (
    pendingNonce !== latestNonce
  ) {
    throw new Error(
      [
        "There is already a pending transaction.",
        `Latest nonce: ${latestNonce}`,
        `Pending nonce: ${pendingNonce}`,
        "Deployment stopped to avoid a nonce collision.",
      ].join("\n")
    );
  }

  let nextNonce =
    pendingNonce;

  console.log(
    "Starting deployment nonce:",
    nextNonce
  );

  // ============================================================
  // INITIAL STATE SAVE
  // ============================================================

  saveDeploymentData({
    networkName,
    chainId,
    deployerAddress,
    contracts,
  });

  // ============================================================
  // RESUME-SAFE DEPLOYMENT
  // ============================================================

  async function deployOrResume(
    name,
    args = []
  ) {
    const savedAddress =
      contracts[name];

    if (
      savedAddress &&
      await hasCode(
        savedAddress
      )
    ) {
      console.log(
        "\n----------------------------------------"
      );

      console.log(
        `Skipping ${name}`
      );

      console.log(
        "Already deployed:",
        savedAddress
      );

      console.log(
        "----------------------------------------"
      );

      return await hre.ethers.getContractAt(
        name,
        savedAddress
      );
    }

    console.log(
      "\n----------------------------------------"
    );

    console.log(
      `Deploying ${name}`
    );

    console.log(
      "Nonce:",
      nextNonce
    );

    console.log(
      "Gas price:",
      hre.ethers.formatUnits(
        DEPLOY_GAS_PRICE,
        "gwei"
      ),
      "Gwei"
    );

    console.log(
      "----------------------------------------"
    );

    const ContractFactory =
      await hre.ethers.getContractFactory(
        name,
        deployer
      );

    let contract;

    try {
      contract =
        await ContractFactory.deploy(
          ...args,
          {
            nonce:
              nextNonce,

            gasPrice:
              DEPLOY_GAS_PRICE,
          }
        );
    } catch (error) {
      console.error(
        `\nFailed while sending ${name}.`
      );

      console.error(
        "Nonce:",
        nextNonce
      );

      console.error(
        "Gas price:",
        hre.ethers.formatUnits(
          DEPLOY_GAS_PRICE,
          "gwei"
        ),
        "Gwei"
      );

      throw error;
    }

    const deploymentTx =
      contract.deploymentTransaction();

    if (
      !deploymentTx
    ) {
      throw new Error(
        `${name} has no deployment transaction.`
      );
    }

    console.log(
      "Transaction:",
      deploymentTx.hash
    );

    console.log(
      "Waiting for confirmation..."
    );

    const usedNonce =
      nextNonce;

    nextNonce += 1;

    let receipt;

    try {
      receipt =
        await deploymentTx.wait();
    } catch (error) {
      console.error(
        `${name} transaction was sent but confirmation failed.`
      );

      console.error(
        "Transaction:",
        deploymentTx.hash
      );

      console.error(
        "Nonce:",
        usedNonce
      );

      throw error;
    }

    if (
      !receipt
    ) {
      throw new Error(
        `${name} deployment receipt not found. Transaction: ${deploymentTx.hash}`
      );
    }

    if (
      receipt.status !== 1
    ) {
      throw new Error(
        `${name} deployment reverted. Transaction: ${deploymentTx.hash}`
      );
    }

    const address =
      await contract.getAddress();

    const code =
      await hre.ethers.provider.getCode(
        address
      );

    if (
      !code ||
      code === "0x"
    ) {
      throw new Error(
        [
          `${name} transaction was mined but no bytecode exists.`,
          `Address: ${address}`,
          `Transaction: ${deploymentTx.hash}`,
        ].join("\n")
      );
    }

    contracts[name] =
      address;

    console.log(
      "Address:",
      address
    );

    console.log(
      "Gas used:",
      receipt.gasUsed.toString()
    );

    console.log(
      "Block:",
      receipt.blockNumber
    );

    saveDeploymentData({
      networkName,
      chainId,
      deployerAddress,
      contracts,
    });

    return contract;
  }

  // ============================================================
  // 4. OBJECT BINDING
  // ============================================================

  const objectBinding =
    await deployOrResume(
      "NumenObjectBinding",
      [
        contracts.NumenAssetRegistry,
        contracts.NumenObjectRegistry,
      ]
    );

  // ============================================================
  // 5. ATTESTATION REGISTRY
  // ============================================================

  const attestationRegistry =
    await deployOrResume(
      "NumenAttestationRegistry",
      [
        contracts.NumenAssetRegistry,
        contracts.NumenObjectRegistry,
      ]
    );

  // ============================================================
  // 6. DOCUMENT REGISTRY
  // ============================================================

  const documentRegistry =
    await deployOrResume(
      "NumenDocumentRegistry",
      [
        contracts.NumenAssetRegistry,
        contracts.NumenObjectRegistry,
      ]
    );

  // ============================================================
  // 7. PROVENANCE REGISTRY
  // ============================================================

  const provenanceRegistry =
    await deployOrResume(
      "NumenProvenanceRegistry",
      [
        contracts.NumenAssetRegistry,
      ]
    );

  // ============================================================
  // 8. FUNGIBLE FACTORY
  // ============================================================

  const fungibleFactory =
    await deployOrResume(
      "NumenFungibleFactory"
    );

  // ============================================================
  // 9. ERC721 FACTORY
  // ============================================================

  const erc721Factory =
    await deployOrResume(
      "NumenERC721Factory"
    );

  // ============================================================
  // 10. ERC1155 FACTORY
  // ============================================================

  const erc1155Factory =
    await deployOrResume(
      "NumenERC1155Factory"
    );

  // Keep references available for verification.
  void objectBinding;
  void attestationRegistry;
  void documentRegistry;
  void fungibleFactory;
  void erc721Factory;
  void erc1155Factory;

  // ============================================================
  // VERIFY COMPLETE DEPLOYMENT
  // ============================================================

  console.log(
    "\n========================================"
  );

  console.log(
    "VERIFYING COMPLETE DEPLOYMENT"
  );

  console.log(
    "========================================"
  );

  const requiredContracts = [
    "NumenAssetRegistry",
    "NumenObjectRegistry",
    "NumenMetadataRegistry",
    "NumenObjectBinding",
    "NumenAttestationRegistry",
    "NumenDocumentRegistry",
    "NumenProvenanceRegistry",
    "NumenFungibleFactory",
    "NumenERC721Factory",
    "NumenERC1155Factory",
  ];

  for (
    const name
    of requiredContracts
  ) {
    const address =
      contracts[name];

    if (
      !address
    ) {
      throw new Error(
        `${name} is missing from deployment state.`
      );
    }

    await verifyContract(
      name,
      address
    );
  }

  // ============================================================
  // FINAL DEPENDENCY CHECKS
  // ============================================================

  console.log(
    "\nVerifying registry dependencies..."
  );

  const finalMetadataAssetRegistry =
    await metadataRegistry.assetRegistry();

  if (
    finalMetadataAssetRegistry.toLowerCase() !==
    contracts.NumenAssetRegistry.toLowerCase()
  ) {
    throw new Error(
      "NumenMetadataRegistry Asset Registry mismatch."
    );
  }

  const provenanceAssetRegistry =
    await provenanceRegistry.assetRegistry();

  if (
    provenanceAssetRegistry.toLowerCase() !==
    contracts.NumenAssetRegistry.toLowerCase()
  ) {
    throw new Error(
      "NumenProvenanceRegistry Asset Registry mismatch."
    );
  }

  console.log(
    "Registry dependencies OK."
  );

  // ============================================================
  // FINAL SAVE
  // ============================================================

  saveDeploymentData({
    networkName,
    chainId,
    deployerAddress,
    contracts,
  });

  // ============================================================
  // FINAL OUTPUT
  // ============================================================

  console.log(
    "\n========================================"
  );

  console.log(
    "NUMEN ASSET PROTOCOL"
  );

  console.log(
    "MAINNET DEPLOYMENT COMPLETE"
  );

  console.log(
    "========================================\n"
  );

  for (
    const name
    of requiredContracts
  ) {
    console.log(
      `${name}: ${contracts[name]}`
    );
  }

  console.log(
    "\nDeployment state:"
  );

  console.log(
    outputFile
  );

  console.log(
    "\nFinal nonce:"
  );

  console.log(
    await hre.ethers.provider.getTransactionCount(
      deployerAddress,
      "latest"
    )
  );

  console.log(
    "\n========================================"
  );
}

// ============================================================
// RUN
// ============================================================

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(
      "\n========================================"
    );

    console.error(
      "DEPLOYMENT FAILED"
    );

    console.error(
      "========================================\n"
    );

    console.error(error);

    console.error(
      "\nIMPORTANT:"
    );

    console.error(
      "Do not immediately rerun after a failed send or confirmation."
    );

    console.error(
      "Check the transaction/nonce state first."
    );

    console.error(
      "Deployment state file:"
    );

    console.error(
      outputFile
    );

    process.exit(1);
  });