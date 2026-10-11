require("dotenv").config();

module.exports = async function ({ network }) {
  console.log("");
  console.log("==========================================");
  console.log("NUMENDEX DEPLOYMENT CONFIG");
  console.log("==========================================");

  const chainId = Number(network.config.chainId);

  console.log("Network:", network.name);
  console.log("Chain ID:", chainId);
  console.log(
    "RPC:",
    process.env.NUMEN_RPC_URL || "NOT SET"
  );
  console.log(
    "Gas Price:",
    process.env.NUMEN_GAS_PRICE_GWEI || "500",
    "Gwei"
  );
  console.log(
    "NUMN:",
    process.env.NUMN_ADDRESS || "NOT SET"
  );

  if (chainId !== 32026) {
    throw new Error(
      `Wrong network. Expected Numen Mainnet 32026, got ${chainId}`
    );
  }

  if (!process.env.NUMN_ADDRESS) {
    throw new Error(
      "NUMN_ADDRESS is missing from .env"
    );
  }

  if (
    process.env.NUMN_ADDRESS.toLowerCase() !==
    "0x0000000000000000000000000000000000000802"
  ) {
    throw new Error(
      "Unexpected NUMN_ADDRESS."
    );
  }

  console.log("");
  console.log("✅ Deployment configuration OK.");
  console.log("");
};

module.exports.tags = ["Config"];