require("dotenv").config();

module.exports = async function ({
  getNamedAccounts,
  deployments,
  ethers,
  network
}) {
  const {
    deploy,
    get
  } = deployments;

  const { deployer } =
    await getNamedAccounts();

  console.log("");
  console.log("==========================================");
  console.log("DEPLOY NUMENDEX ROUTER");
  console.log("==========================================");

  const chainId =
    Number(network.config.chainId);

  if (chainId !== 32026) {
    throw new Error(
      `Wrong network. Expected 32026, got ${chainId}`
    );
  }

  const expectedDeployer =
    "0x478C47d215bbfc43F25FAB48B4100bB1BbE1a6Dc";

  if (
    deployer.toLowerCase() !==
    expectedDeployer.toLowerCase()
  ) {
    throw new Error(
      `Wrong deployer. Expected ${expectedDeployer}, got ${deployer}`
    );
  }

  const factory =
    await get("NumenDEXFactory");

  console.log(
    "Factory:",
    factory.address
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
    "Deploying Router..."
  );

  const result = await deploy(
    "NumenDEXRouter",
    {
      from: deployer,

      args: [
        factory.address
      ],

      log: true,

      gasPrice: gasPrice.toString(),

      gasLimit: 2_000_000,

      skipIfAlreadyDeployed: true
    }
  );

  console.log("");
  console.log(
    "Router:",
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
      "Router bytecode not found."
    );
  }

  const router =
    await ethers.getContractAt(
      "NumenDEXRouter",
      result.address
    );

  const routerFactory =
    await router.factory();

  console.log(
    "Router.factory():",
    routerFactory
  );

  if (
    routerFactory.toLowerCase() !==
    factory.address.toLowerCase()
  ) {
    throw new Error(
      "Router is connected to wrong Factory."
    );
  }

  console.log("");
  console.log(
    "✅ Router deployment verified."
  );
};

module.exports.tags = [
  "Router",
  "Core"
];

module.exports.dependencies = [
  "Factory"
];