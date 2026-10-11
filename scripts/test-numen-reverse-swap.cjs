require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  console.log("");
  console.log("==========================================");
  console.log("NUMENDEX REVERSE SWAP TEST");
  console.log("NUMN -> TEST");
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
  // VERIFY FACTORY / PAIR
  // ==========================================

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

  console.log(
    "✅ Router / Factory / Pair verified."
  );

  // ==========================================
  // TOKEN INFO
  // ==========================================

  const numenSymbol =
    await numen.symbol();

  const numenDecimals =
    Number(await numen.decimals());

  const testSymbol =
    await test.symbol();

  const testDecimals =
    Number(await test.decimals());

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
  // AMOUNT
  // ==========================================

  const amountIn =
    ethers.parseUnits(
      "0.00005",
      numenDecimals
    );

  console.log("");
  console.log(
    "Swap amount:",
    ethers.formatUnits(
      amountIn,
      numenDecimals
    ),
    numenSymbol
  );

  // ==========================================
  // BEFORE
  // ==========================================

  const numenBalanceBefore =
    await numen.balanceOf(wallet);

  const testBalanceBefore =
    await test.balanceOf(wallet);

  const reservesBefore =
    await pair.getReserves();

  console.log("");
  console.log("------------------------------------------");
  console.log("BEFORE SWAP");
  console.log("------------------------------------------");

  console.log(
    "NUMN balance:",
    ethers.formatUnits(
      numenBalanceBefore,
      numenDecimals
    )
  );

  console.log(
    "TEST balance:",
    ethers.formatUnits(
      testBalanceBefore,
      testDecimals
    )
  );

  console.log(
    "reserve0:",
    reservesBefore[0].toString()
  );

  console.log(
    "reserve1:",
    reservesBefore[1].toString()
  );

  // ==========================================
  // NUMN ALLOWANCE
  // ==========================================

  const gasPrice =
    ethers.parseUnits(
      process.env.NUMEN_GAS_PRICE_GWEI ||
        "500",
      "gwei"
    );

  let allowance =
    await numen.allowance(
      wallet,
      ROUTER_ADDRESS
    );

  console.log("");
  console.log(
    "NUMN allowance:",
    ethers.formatUnits(
      allowance,
      numenDecimals
    )
  );

  if (allowance < amountIn) {
    console.log(
      "NUMN allowance insufficient."
    );

    console.log(
      "Approving 0.001 NUMN..."
    );

    const approveAmount =
      ethers.parseUnits(
        "0.001",
        numenDecimals
      );

    const approveTx =
      await numen.approve(
        ROUTER_ADDRESS,
        approveAmount,
        {
          gasLimit: 300000n,
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
        "NUMN approve failed."
      );
    }

    console.log(
      "Approve gas used:",
      approveReceipt.gasUsed.toString()
    );

    allowance =
      await numen.allowance(
        wallet,
        ROUTER_ADDRESS
      );

    if (allowance < amountIn) {
      throw new Error(
        "NUMN allowance still insufficient."
      );
    }
  }

  console.log(
    "✅ NUMN allowance sufficient."
  );

  // ==========================================
  // QUOTE
  // ==========================================

  const path = [
    NUMN_ADDRESS,
    TEST_ADDRESS
  ];

  const amounts =
    await router.getAmountsOut(
      amountIn,
      path
    );

  const expectedOut =
    amounts[1];

  const amountOutMin =
    expectedOut * 99n / 100n;

  console.log("");
  console.log("------------------------------------------");
  console.log("QUOTE");
  console.log("------------------------------------------");

  console.log(
    "Input:",
    ethers.formatUnits(
      amountIn,
      numenDecimals
    ),
    "NUMN"
  );

  console.log(
    "Expected output:",
    ethers.formatUnits(
      expectedOut,
      testDecimals
    ),
    "TEST"
  );

  console.log(
    "Minimum output:",
    ethers.formatUnits(
      amountOutMin,
      testDecimals
    ),
    "TEST"
  );

  if (expectedOut === 0n) {
    throw new Error(
      "Expected output is zero."
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
      "Cannot read latest block."
    );
  }

  const deadline =
    BigInt(latestBlock.timestamp) + 1800n;

  // ==========================================
  // STATIC CALL
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

  console.log(
    "Simulated TEST output:",
    ethers.formatUnits(
      simulation[1],
      testDecimals
    )
  );

  if (simulation[1] !== expectedOut) {
    throw new Error(
      "Simulation output differs from quote."
    );
  }

  console.log(
    "✅ Simulation successful."
  );

  // ==========================================
  // GAS
  // ==========================================

  const estimatedGas =
    await router.swapExactTokensForTokens.estimateGas(
      amountIn,
      amountOutMin,
      path,
      wallet,
      deadline
    );

  console.log("");
  console.log(
    "RPC estimated gas:",
    estimatedGas.toString()
  );

  const gasLimit =
    1_000_000n;

  console.log(
    "Manual gas limit:",
    gasLimit.toString()
  );

  // ==========================================
  // REAL SWAP
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("SENDING REAL NUMN -> TEST SWAP");
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

  const receipt =
    await tx.wait();

  if (
    !receipt ||
    receipt.status !== 1
  ) {
    throw new Error(
      "Swap transaction failed."
    );
  }

  console.log(
    "Gas used:",
    receipt.gasUsed.toString()
  );

  // ==========================================
  // AFTER
  // ==========================================

  const numenBalanceAfter =
    await numen.balanceOf(wallet);

  const testBalanceAfter =
    await test.balanceOf(wallet);

  const reservesAfter =
    await pair.getReserves();

  console.log("");
  console.log("------------------------------------------");
  console.log("AFTER SWAP");
  console.log("------------------------------------------");

  console.log(
    "NUMN balance:",
    ethers.formatUnits(
      numenBalanceAfter,
      numenDecimals
    )
  );

  console.log(
    "TEST balance:",
    ethers.formatUnits(
      testBalanceAfter,
      testDecimals
    )
  );

  console.log(
    "reserve0:",
    reservesAfter[0].toString()
  );

  console.log(
    "reserve1:",
    reservesAfter[1].toString()
  );

  // ==========================================
  // RESERVE ANALYSIS
  // ==========================================

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

  const actualNumenIn =
    numenReserveAfter -
    numenReserveBefore;

  const actualTestOut =
    testReserveBefore -
    testReserveAfter;

  const walletTestReceived =
    testBalanceAfter -
    testBalanceBefore;

  console.log("");
  console.log("------------------------------------------");
  console.log("SWAP RESULT");
  console.log("------------------------------------------");

  console.log(
    "NUMN received by Pair:",
    ethers.formatUnits(
      actualNumenIn,
      numenDecimals
    )
  );

  console.log(
    "TEST sent by Pair:",
    ethers.formatUnits(
      actualTestOut,
      testDecimals
    )
  );

  console.log(
    "TEST received by wallet:",
    ethers.formatUnits(
      walletTestReceived,
      testDecimals
    )
  );

  console.log(
    "Router quote:",
    ethers.formatUnits(
      expectedOut,
      testDecimals
    )
  );

  if (
    actualNumenIn !== amountIn
  ) {
    throw new Error(
      "Pair did not receive exact NUMN input."
    );
  }

  if (
    actualTestOut !== expectedOut
  ) {
    throw new Error(
      "Pair TEST output differs from quote."
    );
  }

  if (
    walletTestReceived !== expectedOut
  ) {
    throw new Error(
      "Wallet TEST receipt differs from quote."
    );
  }

  console.log("");
  console.log("==========================================");
  console.log("REVERSE SWAP TEST SUCCESSFUL");
  console.log("==========================================");
  console.log("");

  console.log(
    "✅ NUMN transferFrom works as swap input."
  );

  console.log(
    "✅ NUMN -> TEST quote works."
  );

  console.log(
    "✅ NUMN -> TEST Pair swap works."
  );

  console.log(
    "✅ TEST output matches Router quote."
  );

  console.log(
    "✅ Bidirectional swaps verified."
  );

  console.log("");
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
    console.error(
      "REVERSE SWAP TEST FAILED:"
    );

    console.error(
      error.shortMessage ||
      error.reason ||
      error.message ||
      error
    );

    process.exit(1);
  });