require("dotenv").config();

module.exports = async function ({
  getNamedAccounts,
  deployments,
  ethers,
  network
}) {
  const { get } = deployments;

  const { deployer } =
    await getNamedAccounts();

  console.log("");
  console.log("==========================================");
  console.log("VERIFY NUMENDEX CONFIGURATION");
  console.log("==========================================");

  const chainId =
    Number(network.config.chainId);

  if (chainId !== 32026) {
    throw new Error(
      `Wrong network. Expected 32026, got ${chainId}`
    );
  }

  const factoryDeployment =
    await get("NumenDEXFactory");

  const routerDeployment =
    await get("NumenDEXRouter");

  const factory =
    await ethers.getContractAt(
      "NumenDEXFactory",
      factoryDeployment.address
    );

  const router =
    await ethers.getContractAt(
      "NumenDEXRouter",
      routerDeployment.address
    );

  const feeTo =
    await factory.feeTo();

  const feeToSetter =
    await factory.feeToSetter();

  const routerFactory =
    await router.factory();

  const allPairsLength =
    await factory.allPairsLength();

  console.log(
    "Factory:",
    factoryDeployment.address
  );

  console.log(
    "Router:",
    routerDeployment.address
  );

  console.log(
    "Router Factory:",
    routerFactory
  );

  console.log(
    "feeTo:",
    feeTo
  );

  console.log(
    "feeToSetter:",
    feeToSetter
  );

  console.log(
    "allPairsLength:",
    allPairsLength.toString()
  );

  if (
    routerFactory.toLowerCase() !==
    factoryDeployment.address.toLowerCase()
  ) {
    throw new Error(
      "Router Factory mismatch."
    );
  }

  if (
    feeToSetter.toLowerCase() !==
    deployer.toLowerCase()
  ) {
    throw new Error(
      "feeToSetter is not deployer."
    );
  }

  if (
    feeTo !== ethers.ZeroAddress
  ) {
    console.log("");
    console.log(
      "⚠️ Protocol fee is currently ENABLED."
    );
  } else {
    console.log("");
    console.log(
      "✅ Protocol fee is currently disabled."
    );
  }

  console.log("");
  console.log(
    "✅ Factory + Router configuration verified."
  );

  console.log("");
  console.log("==========================================");
  console.log("DEPLOYMENT ADDRESSES");
  console.log("==========================================");

  console.log(
    "FACTORY_ADDRESS=" +
    factoryDeployment.address
  );

  console.log(
    "ROUTER_ADDRESS=" +
    routerDeployment.address
  );

  console.log("");
};

module.exports.tags = [
  "Configure",
  "Core"
];

module.exports.dependencies = [
  "Router"
];