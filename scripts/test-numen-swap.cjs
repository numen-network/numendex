require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  console.log("");
  console.log("==========================================");
  console.log("NUMENDEX REAL SWAP TEST");
  console.log("TEST -> NUMN");
  console.log("==========================================");
  console.log("");

  // ==========================================
  // CONFIGURATION
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
      "No signer found. Check PRIVATE_KEY in .env"
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

  console.log("");

  // ==========================================
  // ABIs
  // ==========================================

  const ERC20_ABI = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner,address spender) view returns (uint256)",
    "function approve(address spender,uint256 amount) returns (bool)"
  ];

  const PAIR_ABI = [
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function getReserves() view returns (uint112 reserve0,uint112 reserve1,uint32 blockTimestampLast)"
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

  // ==========================================
  // VERIFY ROUTER / FACTORY
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

  const pairAddress =
    await factory.getPair(
      TEST_ADDRESS,
      NUMN_ADDRESS
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
      `Unexpected TEST/NUMN pair: ${pairAddress}`
    );
  }

  console.log(
    "Pair:",
    pairAddress
  );

  console.log(
    "✅ Router, Factory and Pair verified."
  );

  // ==========================================
  // TOKEN INFO
  // ==========================================

  const testSymbol =
    await test.symbol();

  const testDecimals =
    Number(await test.decimals());

  const numenSymbol =
    await numen.symbol();

  const numenDecimals =
    Number(await numen.decimals());

  // ==========================================
  // PAIR
  // ==========================================

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
  // SWAP AMOUNT
  // ==========================================

  const amountIn =
    ethers.parseUnits(
      "0.1",
      testDecimals
    );

  console.log("");
  console.log(
    "Swap amount:",
    ethers.formatUnits(
      amountIn,
      testDecimals
    ),
    testSymbol
  );

  // ==========================================
  // BALANCES BEFORE
  // ==========================================

  const testBalanceBefore =
    await test.balanceOf(wallet);

  const numenBalanceBefore =
    await numen.balanceOf(wallet);

  const reservesBefore =
    await pair.getReserves();

  console.log("");
  console.log("------------------------------------------");
  console.log("BEFORE SWAP");
  console.log("------------------------------------------");

  console.log(
    `${testSymbol} balance:`,
    ethers.formatUnits(
      testBalanceBefore,
      testDecimals
    )
  );

  console.log(
    `${numenSymbol} balance:`,
    ethers.formatUnits(
      numenBalanceBefore,
      numenDecimals
    )
  );

  console.log(
    "reserve0 raw:",
    reservesBefore[0].toString()
  );

  console.log(
    "reserve1 raw:",
    reservesBefore[1].toString()
  );

  if (testBalanceBefore < amountIn) {
    throw new Error(
      "Insufficient TEST balance."
    );
  }

  // ==========================================
  // TEST ALLOWANCE
  // ==========================================

  const gasPrice =
    ethers.parseUnits(
      process.env.NUMEN_GAS_PRICE_GWEI ||
        "500",
      "gwei"
    );

  let allowance =
    await test.allowance(
      wallet,
      ROUTER_ADDRESS
    );

  console.log("");
  console.log(
    "TEST allowance:",
    ethers.formatUnits(
      allowance,
      testDecimals
    )
  );

  if (allowance < amountIn) {
    console.log(
      "Approving 0.1 TEST..."
    );

    const approveTx =
      await test.approve(
        ROUTER_ADDRESS,
        amountIn,
        {
          gasLimit: 500000n,
          gasPrice
        }
      );

    console.log(
      "Approve TX:",
      approveTx.hash
    );

    const approveReceipt =
      await approveTx.wait();

    if (
      !approveReceipt ||
      approveReceipt.status !== 1
    ) {
      throw new Error(
        "TEST approve failed."
      );
    }

    console.log(
      "Approve gas used:",
      approveReceipt.gasUsed.toString()
    );

    allowance =
      await test.allowance(
        wallet,
        ROUTER_ADDRESS
      );

    if (allowance < amountIn) {
      throw new Error(
        "TEST allowance still insufficient."
      );
    }

    console.log(
      "✅ TEST allowance ready."
    );
  }

  // ==========================================
  // PATH
  // ==========================================

  const path = [
    TEST_ADDRESS,
    NUMN_ADDRESS
  ];

  // ==========================================
  // GET EXPECTED OUTPUT
  // ==========================================

  const amounts =
    await router.getAmountsOut(
      amountIn,
      path
    );

  const expectedOut =
    amounts[amounts.length - 1];

  console.log("");
  console.log("------------------------------------------");
  console.log("SWAP QUOTE");
  console.log("------------------------------------------");

  console.log(
    "Input:",
    ethers.formatUnits(
      amountIn,
      testDecimals
    ),
    testSymbol
  );

  console.log(
    "Expected output:",
    ethers.formatUnits(
      expectedOut,
      numenDecimals
    ),
    numenSymbol
  );

  /*
   * 1% slippage protection.
   *
   * amountOutMin = expectedOut * 99 / 100
   */
  const amountOutMin =
    (expectedOut * 99n) / 100n;

  console.log(
    "Minimum output (1% slippage):",
    ethers.formatUnits(
      amountOutMin,
      numenDecimals
    ),
    numenSymbol
  );

  if (expectedOut === 0n) {
    throw new Error(
      "Router quote returned zero NUMN."
    );
  }

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
  // STATIC SWAP
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("SWAP SIMULATION");
  console.log("------------------------------------------");

  const simulation =
    await router.swapExactTokensForTokens.staticCall(
      amountIn,
      amountOutMin,
      path,
      wallet,
      deadline
    );

  const simulatedOut =
    simulation[simulation.length - 1];

  console.log(
    "Simulated output:",
    ethers.formatUnits(
      simulatedOut,
      numenDecimals
    ),
    numenSymbol
  );

  if (simulatedOut < amountOutMin) {
    throw new Error(
      "Simulated output below minimum."
    );
  }

  console.log(
    "✅ Swap simulation successful."
  );

  // ==========================================
  // GAS ESTIMATE
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("SWAP GAS");
  console.log("------------------------------------------");

  const estimatedGas =
    await router.swapExactTokensForTokens.estimateGas(
      amountIn,
      amountOutMin,
      path,
      wallet,
      deadline
    );

  console.log(
    "Estimated gas:",
    estimatedGas.toString()
  );

  /*
   * Numen/Frontier gas estimation has already
   * shown unusual values, so use a safe manual
   * ceiling instead of copying estimateGas.
   */
  const gasLimit =
    1_000_000n;

  console.log(
    "Transaction gas limit:",
    gasLimit.toString()
  );

  console.log(
    "Gas price:",
    ethers.formatUnits(
      gasPrice,
      "gwei"
    ),
    "Gwei"
  );

  // ==========================================
  // REAL SWAP
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("SENDING REAL SWAP");
  console.log("------------------------------------------");

  const tx =
    await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      wallet,
      deadline,
      {
        gasLimit,
        gasPrice
      }
    );

  console.log(
    "Swap TX:",
    tx.hash
  );

  console.log(
    "Waiting for confirmation..."
  );

  const receipt =
    await tx.wait();

  if (!receipt) {
    throw new Error(
      "No swap receipt returned."
    );
  }

  console.log(
    "Status:",
    receipt.status
  );

  console.log(
    "Gas used:",
    receipt.gasUsed.toString()
  );

  if (receipt.status !== 1) {
    throw new Error(
      "Swap transaction failed."
    );
  }

  // ==========================================
  // AFTER SWAP
  // ==========================================

  const testBalanceAfter =
    await test.balanceOf(wallet);

  const numenBalanceAfter =
    await numen.balanceOf(wallet);

  const reservesAfter =
    await pair.getReserves();

  const allowanceAfter =
    await test.allowance(
      wallet,
      ROUTER_ADDRESS
    );

  console.log("");
  console.log("------------------------------------------");
  console.log("AFTER SWAP");
  console.log("------------------------------------------");

  console.log(
    `${testSymbol} balance:`,
    ethers.formatUnits(
      testBalanceAfter,
      testDecimals
    )
  );

  console.log(
    `${numenSymbol} balance:`,
    ethers.formatUnits(
      numenBalanceAfter,
      numenDecimals
    )
  );

  console.log(
    "reserve0 raw:",
    reservesAfter[0].toString()
  );

  console.log(
    "reserve1 raw:",
    reservesAfter[1].toString()
  );

  console.log(
    "TEST allowance remaining:",
    ethers.formatUnits(
      allowanceAfter,
      testDecimals
    )
  );

  // ==========================================
  // VERIFY TOKEN MOVEMENT
  // ==========================================

  const testSpent =
    testBalanceBefore -
    testBalanceAfter;

  /*
   * NUMN is also the gas token.
   * Therefore wallet NUMN balance cannot be
   * used directly to calculate swap output:
   *
   * NUMN received from swap - transaction gas
   *
   * Instead, reserve movement provides the
   * clean swap output.
   */

  let numenReserveBefore;
  let numenReserveAfter;
  let testReserveBefore;
  let testReserveAfter;

  if (
    token0.toLowerCase() ===
    NUMN_ADDRESS.toLowerCase()
  ) {
    numenReserveBefore =
      reservesBefore[0];

    numenReserveAfter =
      reservesAfter[0];

    testReserveBefore =
      reservesBefore[1];

    testReserveAfter =
      reservesAfter[1];
  } else {
    numenReserveBefore =
      reservesBefore[1];

    numenReserveAfter =
      reservesAfter[1];

    testReserveBefore =
      reservesBefore[0];

    testReserveAfter =
      reservesAfter[0];
  }

  const actualNumenOut =
    numenReserveBefore -
    numenReserveAfter;

  const actualTestIn =
    testReserveAfter -
    testReserveBefore;

  console.log("");
  console.log("------------------------------------------");
  console.log("SWAP RESULT");
  console.log("------------------------------------------");

  console.log(
    "TEST spent by wallet:",
    ethers.formatUnits(
      testSpent,
      testDecimals
    ),
    testSymbol
  );

  console.log(
    "TEST received by pair:",
    ethers.formatUnits(
      actualTestIn,
      testDecimals
    ),
    testSymbol
  );

  console.log(
    "NUMN output from pair:",
    ethers.formatUnits(
      actualNumenOut,
      numenDecimals
    ),
    numenSymbol
  );

  console.log(
    "Quoted NUMN output:",
    ethers.formatUnits(
      expectedOut,
      numenDecimals
    ),
    numenSymbol
  );

  if (actualTestIn !== amountIn) {
    throw new Error(
      "Pair did not receive expected TEST amount."
    );
  }

  if (actualNumenOut !== expectedOut) {
    throw new Error(
      "Actual NUMN output does not match Router quote."
    );
  }

  // ==========================================
  // SUCCESS
  // ==========================================

  console.log("");
  console.log("==========================================");
  console.log("SWAP TEST SUCCESSFUL");
  console.log("==========================================");
  console.log("");

  console.log(
    "✅ TEST transferFrom works."
  );

  console.log(
    "✅ Router getAmountsOut works."
  );

  console.log(
    "✅ Pair swap works."
  );

  console.log(
    "✅ 0.30% AMM fee calculation works."
  );

  console.log(
    "✅ Pair reserves updated correctly."
  );

  console.log(
    "✅ Native NUMN was transferred out of the Pair."
  );

  console.log(
    "✅ TEST -> NUMN mainnet swap completed."
  );

  console.log("");
  console.log(
    "TEST/NUMN Pair:",
    pairAddress
  );

  console.log(
    "Swap TX:",
    tx.hash
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("SWAP TEST FAILED:");

    console.error(
      error.shortMessage ||
      error.reason ||
      error.message ||
      error
    );

    process.exit(1);
  });