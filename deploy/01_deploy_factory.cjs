require("dotenv").config();

module.exports = async function ({
  getNamedAccounts,
  deployments,
  ethers,
  network
}) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("");
  console.log("==========================================");
  console.log("DEPLOY NUMENDEX FACTORY");
  console.log("==========================================");

  const chainId = Number(network.config.chainId);

  if (chainId !== 32026) {
    throw new Error(
      `Wrong network. Expected 32026, got ${chainId}`
    );
  }

  const expectedDeployer =
    "0x478C47d215bbfc43F25FAB48B4100bB1BbE1a6Dc";

  console.log("Deployer:", deployer);

  if (
    deployer.toLowerCase() !==
    expectedDeployer.toLowerCase()
  ) {
    throw new Error(
      `Wrong deployer. Expected ${expectedDeployer}, got ${deployer}`
    );
  }

  const balance =
    await ethers.provider.getBalance(deployer);

  console.log(
    "Balance:",
    ethers.formatEther(balance),
    "NUMN"
  );

  const gasPriceGwei =
    process.env.NUMEN_GAS_PRICE_GWEI || "500";

  const gasPrice =
    ethers.parseUnits(
      gasPriceGwei,
      "gwei"
    );

  console.log(
    "Gas price:",
    gasPriceGwei,
    "Gwei"
  );

  console.log(
    "Deploying Factory..."
  );

  const result = await deploy(
    "NumenDEXFactory",
    {
      from: deployer,

      args: [
        deployer
      ],

      log: true,

      gasPrice: gasPrice.toString(),

      gasLimit: 3_000_000,

      skipIfAlreadyDeployed: true
    }
  );

  console.log("");
  console.log(
    "Factory:",
    result.address
  );

  if (result.transactionHash) {
    console.log(
      "Transaction:",
      result.transactionHash
    );
  }

  const code =
    await ethers.provider.getCode(
      result.address
    );

  if (code === "0x") {
    throw new Error(
      "Factory bytecode not found."
    );
  }

  const factory =
    await ethers.getContractAt(
      "NumenDEXFactory",
      result.address
    );

  const feeToSetter =
    await factory.feeToSetter();

  if (
    feeToSetter.toLowerCase() !==
    deployer.toLowerCase()
  ) {
    throw new Error(
      "Factory feeToSetter mismatch."
    );
  }

  console.log(
    "feeToSetter:",
    feeToSetter
  );

  console.log(
    "allPairsLength:",
    (
      await factory.allPairsLength()
    ).toString()
  );

  console.log("");
  console.log(
    "✅ Factory deployment verified."
  );
};

module.exports.tags = [
  "Factory",
  "Core"
];

module.exports.dependencies = [
  "Config"
];