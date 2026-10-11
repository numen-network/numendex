require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  console.log("");
  console.log("==========================================");
  console.log("NUMENDEX TEST / NDEX POOL CREATION");
  console.log("==========================================");
  console.log("");

  // ==========================================
  // CONFIG
  // ==========================================

  const TEST_ADDRESS =
    "0xa417b372ed6d6076fcce02f531f709b261fc2845";

  const NDEX_ADDRESS =
    "0x2456f756084bc884f59bf1aa92845dee142cdb56";

  const EXPECTED_WALLET =
    "0x478C47d215bbfc43F25FAB48B4100bB1BbE1a6Dc";

  const FACTORY_ADDRESS =
    process.env.FACTORY_ADDRESS;

  const ROUTER_ADDRESS =
    process.env.ROUTER_ADDRESS;

  if (!FACTORY_ADDRESS) {
    throw new Error(
      "FACTORY_ADDRESS missing from .env"
    );
  }

  if (!ROUTER_ADDRESS) {
    throw new Error(
      "ROUTER_ADDRESS missing from .env"
    );
  }

  // ==========================================
  // NETWORK
  // ==========================================

  const network =
    await ethers.provider.getNetwork();

  console.log(
    "Chain ID:",
    network.chainId.toString()
  );

  if (network.chainId !== 32026n) {
    throw new Error(
      `Wrong network. Expected 32026, got ${network.chainId}`
    );
  }

  // ==========================================
  // SIGNER
  // ==========================================

  const [signer] =
    await ethers.getSigners();

  if (!signer) {
    throw new Error(
      "No signer found."
    );
  }

  const wallet =
    await signer.getAddress();

  console.log(
    "Wallet:",
    wallet
  );

  if (
    wallet.toLowerCase() !==
    EXPECTED_WALLET.toLowerCase()
  ) {
    throw new Error(
      `Wrong wallet. Expected ${EXPECTED_WALLET}, got ${wallet}`
    );
  }

  console.log(
    "Factory:",
    FACTORY_ADDRESS
  );

  console.log(
    "Router:",
    ROUTER_ADDRESS
  );

  console.log(
    "TEST:",
    TEST_ADDRESS
  );

  console.log(
    "NDEX:",
    NDEX_ADDRESS
  );

  // ==========================================
  // ABIS
  // ==========================================

  const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner,address spender) view returns (uint256)",
    "function approve(address spender,uint256 amount) returns (bool)"
  ];

  const PAIR_ABI = [
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function getReserves() view returns (uint112 reserve0,uint112 reserve1,uint32 blockTimestampLast)",
    "function balanceOf(address account) view returns (uint256)",
    "function totalSupply() view returns (uint256)"
  ];

  // ==========================================
  // CONTRACTS
  // ==========================================

  const test =
    new ethers.Contract(
      TEST_ADDRESS,
      ERC20_ABI,
      signer
    );

  const ndex =
    new ethers.Contract(
      NDEX_ADDRESS,
      ERC20_ABI,
      signer
    );

  const factory =
    await ethers.getContractAt(
      "NumenDEXFactory",
      FACTORY_ADDRESS,
      signer
    );

  const router =
    await ethers.getContractAt(
      "NumenDEXRouter",
      ROUTER_ADDRESS,
      signer
    );

  // ==========================================
  // VERIFY ROUTER
  // ==========================================

  const routerFactory =
    await router.factory();

  if (
    routerFactory.toLowerCase() !==
    FACTORY_ADDRESS.toLowerCase()
  ) {
    throw new Error(
      "Router is connected to wrong Factory."
    );
  }

  console.log("");
  console.log(
    "✅ Router -> Factory verified."
  );

  // ==========================================
  // TOKEN INFO
  // ==========================================

  const testSymbol =
    await test.symbol();

  const ndexSymbol =
    await ndex.symbol();

  const testDecimals =
    Number(await test.decimals());

  const ndexDecimals =
    Number(await ndex.decimals());

  console.log("");
  console.log(
    "TEST symbol:",
    testSymbol
  );

  console.log(
    "TEST decimals:",
    testDecimals
  );

  console.log(
    "NDEX symbol:",
    ndexSymbol
  );

  console.log(
    "NDEX decimals:",
    ndexDecimals
  );

  if (testDecimals !== 18) {
    throw new Error(
      `Unexpected TEST decimals: ${testDecimals}`
    );
  }

  if (ndexDecimals !== 18) {
    throw new Error(
      `Unexpected NDEX decimals: ${ndexDecimals}`
    );
  }

  // ==========================================
  // LIQUIDITY AMOUNTS
  // ==========================================

  const TEST_AMOUNT =
    ethers.parseUnits(
      "5000",
      testDecimals
    );

  const NDEX_AMOUNT =
    ethers.parseUnits(
      "500",
      ndexDecimals
    );

  console.log("");
  console.log("------------------------------------------");
  console.log("PLANNED LIQUIDITY");
  console.log("------------------------------------------");

  console.log(
    "TEST:",
    ethers.formatUnits(
      TEST_AMOUNT,
      testDecimals
    )
  );

  console.log(
    "NDEX:",
    ethers.formatUnits(
      NDEX_AMOUNT,
      ndexDecimals
    )
  );

  console.log("");
  console.log(
    "Initial pool ratio:"
  );

  console.log(
    "1 NDEX = 10 TEST"
  );

  console.log(
    "1 TEST = 0.1 NDEX"
  );

  // ==========================================
  // BALANCES
  // ==========================================

  const testBalance =
    await test.balanceOf(wallet);

  const ndexBalance =
    await ndex.balanceOf(wallet);

  console.log("");
  console.log("------------------------------------------");
  console.log("WALLET BALANCES");
  console.log("------------------------------------------");

  console.log(
    "TEST:",
    ethers.formatUnits(
      testBalance,
      testDecimals
    )
  );

  console.log(
    "NDEX:",
    ethers.formatUnits(
      ndexBalance,
      ndexDecimals
    )
  );

  if (testBalance < TEST_AMOUNT) {
    throw new Error(
      "Insufficient TEST balance."
    );
  }

  if (ndexBalance < NDEX_AMOUNT) {
    throw new Error(
      "Insufficient NDEX balance."
    );
  }

  // ==========================================
  // CHECK EXISTING PAIR
  // ==========================================

  const existingPair =
    await factory.getPair(
      TEST_ADDRESS,
      NDEX_ADDRESS
    );

  console.log("");
  console.log(
    "Existing TEST/NDEX Pair:",
    existingPair
  );

  if (
    existingPair !== ethers.ZeroAddress
  ) {
    const existingPairContract =
      new ethers.Contract(
        existingPair,
        PAIR_ABI,
        ethers.provider
      );

    const existingReserves =
      await existingPairContract.getReserves();

    console.log("");
    console.log(
      "⚠️ TEST/NDEX pair already exists."
    );

    console.log(
      "reserve0:",
      existingReserves[0].toString()
    );

    console.log(
      "reserve1:",
      existingReserves[1].toString()
    );

    throw new Error(
      "Pair already exists. Script stopped to avoid changing an existing pool unintentionally."
    );
  }

  console.log(
    "✅ TEST/NDEX pair does not exist yet."
  );

  // ==========================================
  // GAS PRICE
  // ==========================================

  const gasPrice =
    ethers.parseUnits(
      process.env.NUMEN_GAS_PRICE_GWEI ||
        "500",
      "gwei"
    );

  console.log("");
  console.log(
    "Gas price:",
    ethers.formatUnits(
      gasPrice,
      "gwei"
    ),
    "Gwei"
  );

  // ==========================================
  // TEST APPROVAL
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("TEST APPROVAL");
  console.log("------------------------------------------");

  let testAllowance =
    await test.allowance(
      wallet,
      ROUTER_ADDRESS
    );

  console.log(
    "Current allowance:",
    ethers.formatUnits(
      testAllowance,
      testDecimals
    )
  );

  if (testAllowance < TEST_AMOUNT) {
    console.log(
      "Approving 5000 TEST..."
    );

    const tx =
      await test.approve(
        ROUTER_ADDRESS,
        TEST_AMOUNT,
        {
          gasLimit: 500000n,
          gasPrice
        }
      );

    console.log(
      "TEST approve TX:",
      tx.hash
    );

    const receipt =
      await tx.wait();

    if (
      !receipt ||
      receipt.status !== 1
    ) {
      throw new Error(
        "TEST approval failed."
      );
    }

    console.log(
      "Gas used:",
      receipt.gasUsed.toString()
    );

    testAllowance =
      await test.allowance(
        wallet,
        ROUTER_ADDRESS
      );
  }

  if (testAllowance < TEST_AMOUNT) {
    throw new Error(
      "TEST allowance insufficient."
    );
  }

  console.log(
    "✅ TEST allowance ready."
  );

  // ==========================================
  // NDEX APPROVAL
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("NDEX APPROVAL");
  console.log("------------------------------------------");

  let ndexAllowance =
    await ndex.allowance(
      wallet,
      ROUTER_ADDRESS
    );

  console.log(
    "Current allowance:",
    ethers.formatUnits(
      ndexAllowance,
      ndexDecimals
    )
  );

  if (ndexAllowance < NDEX_AMOUNT) {
    console.log(
      "Approving 500 NDEX..."
    );

    /*
     * NDEX uses ERC20Votes and we have already
     * observed that its transactions can require
     * considerably more gas than a simple ERC20.
     */
    const tx =
      await ndex.approve(
        ROUTER_ADDRESS,
        NDEX_AMOUNT,
        {
          gasLimit: 500000n,
          gasPrice
        }
      );

    console.log(
      "NDEX approve TX:",
      tx.hash
    );

    const receipt =
      await tx.wait();

    if (
      !receipt ||
      receipt.status !== 1
    ) {
      throw new Error(
        "NDEX approval failed."
      );
    }

    console.log(
      "Gas used:",
      receipt.gasUsed.toString()
    );

    ndexAllowance =
      await ndex.allowance(
        wallet,
        ROUTER_ADDRESS
      );
  }

  if (ndexAllowance < NDEX_AMOUNT) {
    throw new Error(
      "NDEX allowance insufficient."
    );
  }

  console.log(
    "✅ NDEX allowance ready."
  );

  // ==========================================
  // DEADLINE
  // ==========================================

  const latestBlock =
    await ethers.provider.getBlock(
      "latest"
    );

  if (!latestBlock) {
    throw new Error(
      "Could not read latest block."
    );
  }

  const deadline =
    BigInt(latestBlock.timestamp) +
    1800n;

  // ==========================================
  // SIMULATION
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("ADD LIQUIDITY SIMULATION");
  console.log("------------------------------------------");

  const simulation =
    await router.addLiquidity.staticCall(
      TEST_ADDRESS,
      NDEX_ADDRESS,
      TEST_AMOUNT,
      NDEX_AMOUNT,
      TEST_AMOUNT,
      NDEX_AMOUNT,
      wallet,
      deadline
    );

  console.log(
    "TEST used:",
    ethers.formatUnits(
      simulation[0],
      testDecimals
    )
  );

  console.log(
    "NDEX used:",
    ethers.formatUnits(
      simulation[1],
      ndexDecimals
    )
  );

  console.log(
    "LP liquidity:",
    simulation[2].toString()
  );

  if (
    simulation[0] !== TEST_AMOUNT
  ) {
    throw new Error(
      "Simulation TEST amount mismatch."
    );
  }

  if (
    simulation[1] !== NDEX_AMOUNT
  ) {
    throw new Error(
      "Simulation NDEX amount mismatch."
    );
  }

  console.log(
    "✅ Simulation successful."
  );

  // ==========================================
  // GAS ESTIMATE
  // ==========================================

  const estimatedGas =
    await router.addLiquidity.estimateGas(
      TEST_ADDRESS,
      NDEX_ADDRESS,
      TEST_AMOUNT,
      NDEX_AMOUNT,
      TEST_AMOUNT,
      NDEX_AMOUNT,
      wallet,
      deadline
    );

  console.log("");
  console.log(
    "RPC estimated gas:",
    estimatedGas.toString()
  );

  /*
   * Numen RPC dramatically overestimates gas
   * for these contract calls.
   *
   * First liquidity also deploys Pair.
   *
   * TEST/NUMN creation used ~1.9M gas.
   * NDEX is heavier, so use a larger ceiling.
   */
  const gasLimit =
    4_000_000n;

  console.log(
    "Manual gas limit:",
    gasLimit.toString()
  );

  // ==========================================
  // REAL ADD LIQUIDITY
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("CREATING TEST/NDEX POOL");
  console.log("------------------------------------------");

  const tx =
    await router.addLiquidity(
      TEST_ADDRESS,
      NDEX_ADDRESS,
      TEST_AMOUNT,
      NDEX_AMOUNT,
      TEST_AMOUNT,
      NDEX_AMOUNT,
      wallet,
      deadline,
      {
        gasLimit,
        gasPrice
      }
    );

  console.log(
    "Liquidity TX:",
    tx.hash
  );

  console.log(
    "Waiting for confirmation..."
  );

  const receipt =
    await tx.wait();

  if (
    !receipt ||
    receipt.status !== 1
  ) {
    throw new Error(
      "Liquidity transaction failed."
    );
  }

  console.log(
    "Gas used:",
    receipt.gasUsed.toString()
  );

  // ==========================================
  // VERIFY PAIR
  // ==========================================

  const pairAddress =
    await factory.getPair(
      TEST_ADDRESS,
      NDEX_ADDRESS
    );

  if (
    pairAddress === ethers.ZeroAddress
  ) {
    throw new Error(
      "Pair was not created."
    );
  }

  console.log("");
  console.log(
    "TEST/NDEX Pair:",
    pairAddress
  );

  const pair =
    new ethers.Contract(
      pairAddress,
      PAIR_ABI,
      ethers.provider
    );

  const token0 =
    await pair.token0();

  const token1 =
    await pair.token1();

  const reserves =
    await pair.getReserves();

  const lpBalance =
    await pair.balanceOf(wallet);

  const totalSupply =
    await pair.totalSupply();

  console.log("");
  console.log("------------------------------------------");
  console.log("PAIR STATE");
  console.log("------------------------------------------");

  console.log(
    "token0:",
    token0
  );

  console.log(
    "token1:",
    token1
  );

  console.log(
    "reserve0 raw:",
    reserves[0].toString()
  );

  console.log(
    "reserve1 raw:",
    reserves[1].toString()
  );

  console.log(
    "LP wallet balance:",
    lpBalance.toString()
  );

  console.log(
    "LP total supply:",
    totalSupply.toString()
  );

  // ==========================================
  // NORMALIZE RESERVES
  // ==========================================

  let testReserve;
  let ndexReserve;

  if (
    token0.toLowerCase() ===
    TEST_ADDRESS.toLowerCase()
  ) {
    testReserve =
      reserves[0];

    ndexReserve =
      reserves[1];
  } else {
    testReserve =
      reserves[1];

    ndexReserve =
      reserves[0];
  }

  console.log("");
  console.log(
    "TEST reserve:",
    ethers.formatUnits(
      testReserve,
      testDecimals
    )
  );

  console.log(
    "NDEX reserve:",
    ethers.formatUnits(
      ndexReserve,
      ndexDecimals
    )
  );

  if (
    testReserve !== TEST_AMOUNT
  ) {
    throw new Error(
      "Incorrect TEST reserve."
    );
  }

  if (
    ndexReserve !== NDEX_AMOUNT
  ) {
    throw new Error(
      "Incorrect NDEX reserve."
    );
  }

  if (lpBalance === 0n) {
    throw new Error(
      "No LP tokens received."
    );
  }

  // ==========================================
  // BALANCES AFTER
  // ==========================================

  const testBalanceAfter =
    await test.balanceOf(wallet);

  const ndexBalanceAfter =
    await ndex.balanceOf(wallet);

  console.log("");
  console.log("------------------------------------------");
  console.log("WALLET BALANCES AFTER");
  console.log("------------------------------------------");

  console.log(
    "TEST:",
    ethers.formatUnits(
      testBalanceAfter,
      testDecimals
    )
  );

  console.log(
    "NDEX:",
    ethers.formatUnits(
      ndexBalanceAfter,
      ndexDecimals
    )
  );

  // ==========================================
  // SUCCESS
  // ==========================================

  console.log("");
  console.log("==========================================");
  console.log("TEST/NDEX POOL CREATED SUCCESSFULLY");
  console.log("==========================================");
  console.log("");

  console.log(
    "Pair:",
    pairAddress
  );

  console.log(
    "TEST liquidity: 5000"
  );

  console.log(
    "NDEX liquidity: 500"
  );

  console.log(
    "Initial ratio: 1 NDEX = 10 TEST"
  );

  console.log("");
  console.log(
    "✅ Pair creation works."
  );

  console.log(
    "✅ TEST transferFrom works."
  );

  console.log(
    "✅ NDEX transferFrom works."
  );

  console.log(
    "✅ LP mint works."
  );

  console.log(
    "✅ Pool is ready for frontend development."
  );

  console.log("");
  console.log(
    "IMPORTANT: Keep the LP tokens if this pool is intended to remain available."
  );

  console.log("");
  console.log(
    "Liquidity TX:",
    tx.hash
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error(
      "TEST/NDEX POOL CREATION FAILED:"
    );

    console.error(
      error.shortMessage ||
      error.reason ||
      error.message ||
      error
    );

    process.exit(1);
  });