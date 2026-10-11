require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  console.log("");
  console.log("==========================================");
  console.log("NUMENDEX REMOVE LIQUIDITY TEST");
  console.log("==========================================");
  console.log("");

  // ==========================================
  // CONFIG
  // ==========================================

  const NUMN_ADDRESS =
    "0x0000000000000000000000000000000000000802";

  const TEST_ADDRESS =
    "0xa417b372ed6d6076fcce02f531f709b261fc2845";

  const EXPECTED_PAIR =
    "0x5fe019dD3B708999759D0F23083cdDC4fB3fAc49";

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
      `Wrong wallet: ${wallet}`
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

  // ==========================================
  // ABIs
  // ==========================================

  const ERC20_ABI = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)"
  ];

  const PAIR_ABI = [
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function getReserves() view returns (uint112 reserve0,uint112 reserve1,uint32 blockTimestampLast)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner,address spender) view returns (uint256)",
    "function approve(address spender,uint256 value) returns (bool)"
  ];

  // ==========================================
  // CONTRACTS
  // ==========================================

  const numen =
    new ethers.Contract(
      NUMN_ADDRESS,
      ERC20_ABI,
      signer
    );

  const test =
    new ethers.Contract(
      TEST_ADDRESS,
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

  const routerFactory =
    await router.factory();

  if (
    routerFactory.toLowerCase() !==
    FACTORY_ADDRESS.toLowerCase()
  ) {
    throw new Error(
      "Router Factory mismatch."
    );
  }

  const pairAddress =
    await factory.getPair(
      NUMN_ADDRESS,
      TEST_ADDRESS
    );

  if (
    pairAddress === ethers.ZeroAddress
  ) {
    throw new Error(
      "TEST/NUMN pair does not exist."
    );
  }

  if (
    pairAddress.toLowerCase() !==
    EXPECTED_PAIR.toLowerCase()
  ) {
    throw new Error(
      `Unexpected pair: ${pairAddress}`
    );
  }

  console.log(
    "Pair:",
    pairAddress
  );

  const pair =
    new ethers.Contract(
      pairAddress,
      PAIR_ABI,
      signer
    );

  // ==========================================
  // TOKEN INFO
  // ==========================================

  const numenDecimals =
    Number(await numen.decimals());

  const testDecimals =
    Number(await test.decimals());

  const token0 =
    await pair.token0();

  const token1 =
    await pair.token1();

  console.log("");
  console.log(
    "token0:",
    token0
  );

  console.log(
    "token1:",
    token1
  );

  // ==========================================
  // STATE BEFORE
  // ==========================================

  const lpBalanceBefore =
    await pair.balanceOf(wallet);

  const totalSupplyBefore =
    await pair.totalSupply();

  const reservesBefore =
    await pair.getReserves();

  const numenBalanceBefore =
    await numen.balanceOf(wallet);

  const testBalanceBefore =
    await test.balanceOf(wallet);

  if (lpBalanceBefore === 0n) {
    throw new Error(
      "Wallet has no LP tokens."
    );
  }

  console.log("");
  console.log("------------------------------------------");
  console.log("BEFORE REMOVE LIQUIDITY");
  console.log("------------------------------------------");

  console.log(
    "LP balance:",
    lpBalanceBefore.toString()
  );

  console.log(
    "LP total supply:",
    totalSupplyBefore.toString()
  );

  console.log(
    "reserve0:",
    reservesBefore[0].toString()
  );

  console.log(
    "reserve1:",
    reservesBefore[1].toString()
  );

  console.log(
    "NUMN wallet balance:",
    ethers.formatUnits(
      numenBalanceBefore,
      numenDecimals
    )
  );

  console.log(
    "TEST wallet balance:",
    ethers.formatUnits(
      testBalanceBefore,
      testDecimals
    )
  );

  // ==========================================
  // REMOVE 10% OF WALLET LP
  // ==========================================

  const liquidity =
    lpBalanceBefore / 10n;

  if (liquidity === 0n) {
    throw new Error(
      "Calculated liquidity is zero."
    );
  }

  console.log("");
  console.log(
    "LP to remove:",
    liquidity.toString()
  );

  console.log(
    "Percentage of wallet LP: ~10%"
  );

  // ==========================================
  // IDENTIFY RESERVES
  // ==========================================

  let numenReserveBefore;
  let testReserveBefore;

  if (
    token0.toLowerCase() ===
    NUMN_ADDRESS.toLowerCase()
  ) {
    numenReserveBefore =
      reservesBefore[0];

    testReserveBefore =
      reservesBefore[1];
  } else {
    numenReserveBefore =
      reservesBefore[1];

    testReserveBefore =
      reservesBefore[0];
  }

  // ==========================================
  // EXPECTED WITHDRAWAL
  // ==========================================

  const expectedNumen =
    liquidity *
    numenReserveBefore /
    totalSupplyBefore;

  const expectedTest =
    liquidity *
    testReserveBefore /
    totalSupplyBefore;

  if (
    expectedNumen === 0n ||
    expectedTest === 0n
  ) {
    throw new Error(
      "Expected withdrawal amount is zero."
    );
  }

  const minNumen =
    expectedNumen * 99n / 100n;

  const minTest =
    expectedTest * 99n / 100n;

  console.log("");
  console.log("------------------------------------------");
  console.log("EXPECTED WITHDRAWAL");
  console.log("------------------------------------------");

  console.log(
    "Expected NUMN:",
    ethers.formatUnits(
      expectedNumen,
      numenDecimals
    )
  );

  console.log(
    "Expected TEST:",
    ethers.formatUnits(
      expectedTest,
      testDecimals
    )
  );

  console.log(
    "Minimum NUMN:",
    ethers.formatUnits(
      minNumen,
      numenDecimals
    )
  );

  console.log(
    "Minimum TEST:",
    ethers.formatUnits(
      minTest,
      testDecimals
    )
  );

  // ==========================================
  // LP APPROVAL
  // ==========================================

  const gasPrice =
    ethers.parseUnits(
      process.env.NUMEN_GAS_PRICE_GWEI ||
        "500",
      "gwei"
    );

  let lpAllowance =
    await pair.allowance(
      wallet,
      ROUTER_ADDRESS
    );

  console.log("");
  console.log(
    "Current LP allowance:",
    lpAllowance.toString()
  );

  if (lpAllowance < liquidity) {
    console.log(
      "Approving LP tokens..."
    );

    const approveTx =
      await pair.approve(
        ROUTER_ADDRESS,
        liquidity,
        {
          gasLimit: 500000n,
          gasPrice
        }
      );

    console.log(
      "LP approve TX:",
      approveTx.hash
    );

    const approveReceipt =
      await approveTx.wait();

    if (
      !approveReceipt ||
      approveReceipt.status !== 1
    ) {
      throw new Error(
        "LP approval failed."
      );
    }

    console.log(
      "LP approve gas used:",
      approveReceipt.gasUsed.toString()
    );

    lpAllowance =
      await pair.allowance(
        wallet,
        ROUTER_ADDRESS
      );

    if (lpAllowance < liquidity) {
      throw new Error(
        "LP allowance still insufficient."
      );
    }
  }

  console.log(
    "✅ LP allowance sufficient."
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
    BigInt(latestBlock.timestamp) + 1800n;

  // ==========================================
  // STATIC REMOVE
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("REMOVE LIQUIDITY SIMULATION");
  console.log("------------------------------------------");

  /*
   * tokenA = TEST
   * tokenB = NUMN
   *
   * Therefore return values are:
   * amountA = TEST
   * amountB = NUMN
   */
  const simulation =
    await router.removeLiquidity.staticCall(
      TEST_ADDRESS,
      NUMN_ADDRESS,
      liquidity,
      minTest,
      minNumen,
      wallet,
      deadline
    );

  const simulatedTest =
    simulation[0];

  const simulatedNumen =
    simulation[1];

  console.log(
    "Simulated TEST:",
    ethers.formatUnits(
      simulatedTest,
      testDecimals
    )
  );

  console.log(
    "Simulated NUMN:",
    ethers.formatUnits(
      simulatedNumen,
      numenDecimals
    )
  );

  if (simulatedTest < minTest) {
    throw new Error(
      "Simulated TEST below minimum."
    );
  }

  if (simulatedNumen < minNumen) {
    throw new Error(
      "Simulated NUMN below minimum."
    );
  }

  console.log(
    "✅ removeLiquidity simulation successful."
  );

  // ==========================================
  // GAS ESTIMATE
  // ==========================================

  const estimatedGas =
    await router.removeLiquidity.estimateGas(
      TEST_ADDRESS,
      NUMN_ADDRESS,
      liquidity,
      minTest,
      minNumen,
      wallet,
      deadline
    );

  console.log("");
  console.log(
    "RPC estimated gas:",
    estimatedGas.toString()
  );

  const gasLimit =
    1_500_000n;

  console.log(
    "Manual gas limit:",
    gasLimit.toString()
  );

  // ==========================================
  // REAL REMOVE LIQUIDITY
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("SENDING REAL REMOVE LIQUIDITY");
  console.log("------------------------------------------");

  const tx =
    await router.removeLiquidity(
      TEST_ADDRESS,
      NUMN_ADDRESS,
      liquidity,
      minTest,
      minNumen,
      wallet,
      deadline,
      {
        gasLimit,
        gasPrice
      }
    );

  console.log(
    "Remove liquidity TX:",
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
      "removeLiquidity transaction failed."
    );
  }

  console.log(
    "Gas used:",
    receipt.gasUsed.toString()
  );

  // ==========================================
  // STATE AFTER
  // ==========================================

  const lpBalanceAfter =
    await pair.balanceOf(wallet);

  const totalSupplyAfter =
    await pair.totalSupply();

  const reservesAfter =
    await pair.getReserves();

  const numenBalanceAfter =
    await numen.balanceOf(wallet);

  const testBalanceAfter =
    await test.balanceOf(wallet);

  console.log("");
  console.log("------------------------------------------");
  console.log("AFTER REMOVE LIQUIDITY");
  console.log("------------------------------------------");

  console.log(
    "LP balance:",
    lpBalanceAfter.toString()
  );

  console.log(
    "LP total supply:",
    totalSupplyAfter.toString()
  );

  console.log(
    "reserve0:",
    reservesAfter[0].toString()
  );

  console.log(
    "reserve1:",
    reservesAfter[1].toString()
  );

  console.log(
    "NUMN wallet balance:",
    ethers.formatUnits(
      numenBalanceAfter,
      numenDecimals
    )
  );

  console.log(
    "TEST wallet balance:",
    ethers.formatUnits(
      testBalanceAfter,
      testDecimals
    )
  );

  // ==========================================
  // IDENTIFY AFTER RESERVES
  // ==========================================

  let numenReserveAfter;
  let testReserveAfter;

  if (
    token0.toLowerCase() ===
    NUMN_ADDRESS.toLowerCase()
  ) {
    numenReserveAfter =
      reservesAfter[0];

    testReserveAfter =
      reservesAfter[1];
  } else {
    numenReserveAfter =
      reservesAfter[1];

    testReserveAfter =
      reservesAfter[0];
  }

  // ==========================================
  // VERIFY
  // ==========================================

  const lpBurned =
    lpBalanceBefore -
    lpBalanceAfter;

  const numenRemoved =
    numenReserveBefore -
    numenReserveAfter;

  const testRemoved =
    testReserveBefore -
    testReserveAfter;

  const testReceivedByWallet =
    testBalanceAfter -
    testBalanceBefore;

  console.log("");
  console.log("------------------------------------------");
  console.log("REMOVE RESULT");
  console.log("------------------------------------------");

  console.log(
    "LP burned:",
    lpBurned.toString()
  );

  console.log(
    "NUMN removed from Pair:",
    ethers.formatUnits(
      numenRemoved,
      numenDecimals
    )
  );

  console.log(
    "TEST removed from Pair:",
    ethers.formatUnits(
      testRemoved,
      testDecimals
    )
  );

  console.log(
    "TEST received by wallet:",
    ethers.formatUnits(
      testReceivedByWallet,
      testDecimals
    )
  );

  if (lpBurned !== liquidity) {
    throw new Error(
      "Incorrect LP amount burned."
    );
  }

  if (
    totalSupplyBefore -
    totalSupplyAfter !== liquidity
  ) {
    throw new Error(
      "LP total supply did not decrease correctly."
    );
  }

  if (
    numenRemoved !== simulatedNumen
  ) {
    throw new Error(
      "NUMN reserve reduction differs from simulation."
    );
  }

  if (
    testRemoved !== simulatedTest
  ) {
    throw new Error(
      "TEST reserve reduction differs from simulation."
    );
  }

  if (
    testReceivedByWallet !== simulatedTest
  ) {
    throw new Error(
      "Wallet TEST receipt differs from simulation."
    );
  }

  /*
   * Do NOT compare NUMN wallet balance directly
   * against simulatedNumen because NUMN is also
   * paying transaction gas.
   */

  console.log("");
  console.log("==========================================");
  console.log("REMOVE LIQUIDITY TEST SUCCESSFUL");
  console.log("==========================================");
  console.log("");

  console.log(
    "✅ LP approve works."
  );

  console.log(
    "✅ Router removeLiquidity works."
  );

  console.log(
    "✅ LP tokens are burned correctly."
  );

  console.log(
    "✅ TEST returned to wallet."
  );

  console.log(
    "✅ NUMN returned from Pair."
  );

  console.log(
    "✅ Pair reserves updated correctly."
  );

  console.log(
    "✅ LP totalSupply updated correctly."
  );

  console.log("");
  console.log(
    "Remove TX:",
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
      "REMOVE LIQUIDITY TEST FAILED:"
    );

    console.error(
      error.shortMessage ||
      error.reason ||
      error.message ||
      error
    );

    process.exit(1);
  });