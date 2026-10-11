require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  console.log("==========================================");
  console.log("NUMENDEX DEPLOYMENT GAS ESTIMATE");
  console.log("==========================================");
  console.log("");

  // ==========================================
  // NETWORK
  // ==========================================

  const network = await ethers.provider.getNetwork();

  console.log(
    "Chain ID:",
    network.chainId.toString()
  );

  if (network.chainId !== 32026n) {
    throw new Error(
      `Wrong network. Expected Numen Mainnet 32026, got ${network.chainId}`
    );
  }

  // ==========================================
  // DEPLOYER
  // ==========================================

  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      "No deployer found. Check PRIVATE_KEY in .env"
    );
  }

  const deployerAddress =
    await deployer.getAddress();

  console.log(
    "Deployer:",
    deployerAddress
  );

  const expectedDeployer =
    "0x478C47d215bbfc43F25FAB48B4100bB1BbE1a6Dc";

  if (
    deployerAddress.toLowerCase() !==
    expectedDeployer.toLowerCase()
  ) {
    throw new Error(
      `Wrong deployer. Expected ${expectedDeployer}, got ${deployerAddress}`
    );
  }

  const balance =
    await ethers.provider.getBalance(
      deployerAddress
    );

  console.log(
    "Deployer NUMN balance:",
    ethers.formatEther(balance),
    "NUMN"
  );

  console.log("");

  // ==========================================
  // GAS PRICE
  // ==========================================

  const configuredGasPriceGwei =
    process.env.NUMEN_GAS_PRICE_GWEI || "500";

  const gasPrice =
    ethers.parseUnits(
      configuredGasPriceGwei,
      "gwei"
    );

  console.log(
    "Configured gas price:",
    configuredGasPriceGwei,
    "Gwei"
  );

  console.log(
    "Gas price raw:",
    gasPrice.toString()
  );

  console.log("");

  // ==========================================
  // FACTORY ESTIMATE
  // ==========================================

  console.log("------------------------------------------");
  console.log("1) NumenDEXFactory");
  console.log("------------------------------------------");

  const Factory =
    await ethers.getContractFactory(
      "NumenDEXFactory",
      deployer
    );

  const factoryDeployTx =
    await Factory.getDeployTransaction(
      deployerAddress
    );

  const factoryGas =
    await ethers.provider.estimateGas({
      from: deployerAddress,
      data: factoryDeployTx.data
    });

  const factoryCost =
    factoryGas * gasPrice;

  console.log(
    "Estimated gas:",
    factoryGas.toString()
  );

  console.log(
    "Estimated cost:",
    ethers.formatEther(factoryCost),
    "NUMN"
  );

  console.log("");

  // ==========================================
  // ROUTER ESTIMATE
  // ==========================================

  console.log("------------------------------------------");
  console.log("2) NumenDEXRouter");
  console.log("------------------------------------------");

  const Router =
    await ethers.getContractFactory(
      "NumenDEXRouter",
      deployer
    );

  /*
   * Router constructor only requires a
   * non-zero factory address.
   *
   * For GAS ESTIMATION ONLY we use the
   * deployer address as a placeholder.
   *
   * No transaction is sent.
   */
  const routerDeployTx =
    await Router.getDeployTransaction(
      deployerAddress
    );

  const routerGas =
    await ethers.provider.estimateGas({
      from: deployerAddress,
      data: routerDeployTx.data
    });

  const routerCost =
    routerGas * gasPrice;

  console.log(
    "Estimated gas:",
    routerGas.toString()
  );

  console.log(
    "Estimated cost:",
    ethers.formatEther(routerCost),
    "NUMN"
  );

  console.log("");

  // ==========================================
  // TOTAL
  // ==========================================

  const totalGas =
    factoryGas + routerGas;

  const totalCost =
    factoryCost + routerCost;

  // %25 safety margin
  const safetyGas =
    (totalGas * 125n) / 100n;

  const safetyCost =
    safetyGas * gasPrice;

  console.log("==========================================");
  console.log("TOTAL");
  console.log("==========================================");

  console.log(
    "Factory gas:",
    factoryGas.toString()
  );

  console.log(
    "Router gas:",
    routerGas.toString()
  );

  console.log(
    "Total estimated gas:",
    totalGas.toString()
  );

  console.log("");

  console.log(
    "Estimated deployment cost:",
    ethers.formatEther(totalCost),
    "NUMN"
  );

  console.log(
    "Recommended budget (+25%):",
    ethers.formatEther(safetyCost),
    "NUMN"
  );

  console.log("");

  if (balance >= safetyCost) {
    console.log(
      "✅ Deployer has enough NUMN for Factory + Router deployment."
    );
  } else {
    const missing =
      safetyCost - balance;

    console.log(
      "❌ Deployer does NOT have enough NUMN."
    );

    console.log(
      "Additional NUMN required:",
      ethers.formatEther(missing)
    );
  }

  console.log("");
  console.log("==========================================");
  console.log("NO TRANSACTION WAS SENT");
  console.log("==========================================");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("FATAL ERROR:");
    console.error(error);
    process.exit(1);
  });