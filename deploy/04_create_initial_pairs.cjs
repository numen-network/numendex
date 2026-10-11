require("dotenv").config();

module.exports = async function ({
  deployments,
  ethers,
  network
}) {
  console.log("");
  console.log("==========================================");
  console.log("NUMENDEX INITIAL PAIRS");
  console.log("==========================================");
  console.log("");

  const chainId = Number(
    network.config.chainId
  );

  if (chainId !== 32026) {
    throw new Error(
      `Wrong network. Expected Numen Mainnet 32026, got ${chainId}`
    );
  }

  const factoryDeployment =
    await deployments.get(
      "NumenDEXFactory"
    );

  const routerDeployment =
    await deployments.get(
      "NumenDEXRouter"
    );

  const factoryCode =
    await ethers.provider.getCode(
      factoryDeployment.address
    );

  const routerCode =
    await ethers.provider.getCode(
      routerDeployment.address
    );

  if (factoryCode === "0x") {
    throw new Error(
      "NumenDEXFactory contract not found."
    );
  }

  if (routerCode === "0x") {
    throw new Error(
      "NumenDEXRouter contract not found."
    );
  }

  console.log(
    "Factory:",
    factoryDeployment.address
  );

  console.log(
    "Router:",
    routerDeployment.address
  );

  console.log("");
  console.log(
    "ℹ️ Initial pair creation is currently disabled."
  );

  console.log(
    "No NDEX, TEST, NUMN or other token pair will be created by this script."
  );

  console.log("");
  console.log(
    "Pairs will be created separately after Factory and Router deployment has been verified."
  );

  console.log("");
  console.log(
    "✅ No pair transaction was sent."
  );

  console.log("");
};

module.exports.tags = [
  "Pairs"
];

module.exports.dependencies = [
  "Core"
];