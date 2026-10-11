require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  console.log("");
  console.log("==========================================");
  console.log("NUMENDEX REAL LIQUIDITY TEST");
  console.log("==========================================");
  console.log("");

  // ==========================================
  // ADDRESSES
  // ==========================================

  const NUMN_ADDRESS =
    "0x0000000000000000000000000000000000000802";

  const TEST_ADDRESS =
    "0xa417b372ed6d6076fcce02f531f709b261fc2845";

  const FACTORY_ADDRESS =
    process.env.FACTORY_ADDRESS;

  const ROUTER_ADDRESS =
    process.env.ROUTER_ADDRESS;

  const EXPECTED_WALLET =
    "0x478C47d215bbfc43F25FAB48B4100bB1BbE1a6Dc";

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
    "NUMN:",
    NUMN_ADDRESS
  );

  console.log(
    "TEST:",
    TEST_ADDRESS
  );

  console.log("");

  // ==========================================
  // ABIs
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
  // VERIFY ROUTER -> FACTORY
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

  console.log(
    "✅ Router -> Factory verified."
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

  console.log("");
  console.log(
    "NUMN decimals:",
    numenDecimals
  );

  console.log(
    "TEST symbol:",
    testSymbol
  );

  console.log(
    "TEST decimals:",
    testDecimals
  );

  // ==========================================
  // AMOUNTS
  // ==========================================

  const NUMN_AMOUNT =
    ethers.parseUnits(
      "0.005",
      numenDecimals
    );

  const TEST_AMOUNT =
    ethers.parseUnits(
      "10",
      testDecimals
    );

  console.log("");
  console.log(
    "Liquidity NUMN:",
    ethers.formatUnits(
      NUMN_AMOUNT,
      numenDecimals
    )
  );

  console.log(
    "Liquidity TEST:",
    ethers.formatUnits(
      TEST_AMOUNT,
      testDecimals
    )
  );

  // ==========================================
  // BALANCES BEFORE
  // ==========================================

  const numenBalanceBefore =
    await numen.balanceOf(wallet);

  const testBalanceBefore =
    await test.balanceOf(wallet);

  console.log("");
  console.log("------------------------------------------");
  console.log("BALANCES BEFORE");
  console.log("------------------------------------------");

  console.log(
    "NUMN:",
    ethers.formatUnits(
      numenBalanceBefore,
      numenDecimals
    )
  );

  console.log(
    `${testSymbol}:`,
    ethers.formatUnits(
      testBalanceBefore,
      testDecimals
    )
  );

  if (numenBalanceBefore < NUMN_AMOUNT) {
    throw new Error(
      "Insufficient NUMN balance."
    );
  }

  if (testBalanceBefore < TEST_AMOUNT) {
    throw new Error(
      "Insufficient TEST balance."
    );
  }

  // ==========================================
  // CURRENT PAIR
  // ==========================================

  let pairAddress =
    await factory.getPair(
      TEST_ADDRESS,
      NUMN_ADDRESS
    );

  console.log("");
  console.log(
    "Pair BEFORE:",
    pairAddress
  );

  if (pairAddress === ethers.ZeroAddress) {
    console.log(
      "ℹ️ TEST/NUMN pair does not exist yet."
    );

    console.log(
      "Router.addLiquidity() will create it."
    );
  } else {
    console.log(
      "ℹ️ TEST/NUMN pair already exists."
    );
  }

  // ==========================================
  // NUMN ALLOWANCE
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("NUMN ALLOWANCE");
  console.log("------------------------------------------");

  const numenAllowance =
    await numen.allowance(
      wallet,
      ROUTER_ADDRESS
    );

  console.log(
    "Current NUMN allowance:",
    ethers.formatUnits(
      numenAllowance,
      numenDecimals
    )
  );

  if (numenAllowance < NUMN_AMOUNT) {
    throw new Error(
      "NUMN allowance is below 0.005 NUMN. Run the NUMN approve test first."
    );
  }

  console.log(
    "✅ NUMN allowance sufficient."
  );

  // ==========================================
  // TEST ALLOWANCE
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("TEST ALLOWANCE");
  console.log("------------------------------------------");

  let testAllowance =
    await test.allowance(
      wallet,
      ROUTER_ADDRESS
    );

  console.log(
    "Current TEST allowance:",
    ethers.formatUnits(
      testAllowance,
      testDecimals
    )
  );

  const gasPrice =
    ethers.parseUnits(
      process.env.NUMEN_GAS_PRICE_GWEI ||
        "500",
      "gwei"
    );

  if (testAllowance < TEST_AMOUNT) {
    console.log("");
    console.log(
      "Approving 10 TEST..."
    );

    const approveGas =
      await test.approve.estimateGas(
        ROUTER_ADDRESS,
        TEST_AMOUNT
      );

    console.log(
      "Estimated approve gas:",
      approveGas.toString()
    );

    const approveTx =
      await test.approve(
        ROUTER_ADDRESS,
        TEST_AMOUNT,
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
        "TEST approve transaction failed."
      );
    }

    console.log(
      "Approve gas used:",
      approveReceipt.gasUsed.toString()
    );

    testAllowance =
      await test.allowance(
        wallet,
        ROUTER_ADDRESS
      );

    console.log(
      "TEST allowance AFTER:",
      ethers.formatUnits(
        testAllowance,
        testDecimals
      )
    );
  }

  if (testAllowance < TEST_AMOUNT) {
    throw new Error(
      "TEST allowance is still insufficient."
    );
  }

  console.log(
    "✅ TEST allowance sufficient."
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
  // STATIC ADD LIQUIDITY TEST
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("ADD LIQUIDITY SIMULATION");
  console.log("------------------------------------------");

  try {
    const simulation =
      await router.addLiquidity.staticCall(
        TEST_ADDRESS,
        NUMN_ADDRESS,
        TEST_AMOUNT,
        NUMN_AMOUNT,
        TEST_AMOUNT,
        NUMN_AMOUNT,
        wallet,
        deadline
      );

    console.log(
      "amount TEST:",
      ethers.formatUnits(
        simulation[0],
        testDecimals
      )
    );

    console.log(
      "amount NUMN:",
      ethers.formatUnits(
        simulation[1],
        numenDecimals
      )
    );

    console.log(
      "LP liquidity:",
      simulation[2].toString()
    );

    console.log(
      "✅ addLiquidity simulation successful."
    );
  } catch (error) {
    console.log(
      "❌ addLiquidity simulation failed."
    );

    throw error;
  }

  // ==========================================
  // GAS ESTIMATION
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("ADD LIQUIDITY GAS ESTIMATE");
  console.log("------------------------------------------");

  const estimatedGas =
    await router.addLiquidity.estimateGas(
      TEST_ADDRESS,
      NUMN_ADDRESS,
      TEST_AMOUNT,
      NUMN_AMOUNT,
      TEST_AMOUNT,
      NUMN_AMOUNT,
      wallet,
      deadline
    );

  console.log(
    "Estimated gas:",
    estimatedGas.toString()
  );

  /*
   * First liquidity call may also create
   * the Pair contract, therefore we use
   * a generous gas limit.
   */
  const liquidityGasLimit =
    3_000_000n;

  console.log(
    "Transaction gas limit:",
    liquidityGasLimit.toString()
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
  // REAL ADD LIQUIDITY
  // ==========================================

  console.log("");
  console.log("------------------------------------------");
  console.log("SENDING REAL ADD LIQUIDITY TRANSACTION");
  console.log("------------------------------------------");

  const tx =
    await router.addLiquidity(
      TEST_ADDRESS,
      NUMN_ADDRESS,
      TEST_AMOUNT,
      NUMN_AMOUNT,
      TEST_AMOUNT,
      NUMN_AMOUNT,
      wallet,
      deadline,
      {
        gasLimit: liquidityGasLimit,
        gasPrice
      }
    );

  console.log(
    "Transaction:",
    tx.hash
  );

  console.log(
    "Waiting for confirmation..."
  );

  const receipt =
    await tx.wait();

  if (!receipt) {
    throw new Error(
      "No liquidity transaction receipt."
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
      "addLiquidity transaction failed."
    );
  }

  console.log(
    "✅ addLiquidity transaction confirmed."
  );

  // ==========================================
  // FIND PAIR
  // ==========================================

  pairAddress =
    await factory.getPair(
      TEST_ADDRESS,
      NUMN_ADDRESS
    );

  if (pairAddress === ethers.ZeroAddress) {
    throw new Error(
      "Pair address is still zero after addLiquidity."
    );
  }

  console.log("");
  console.log(
    "TEST/NUMN Pair:",
    pairAddress
  );

  // ==========================================
  // PAIR VERIFICATION
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

  const reserves =
    await pair.getReserves();

  const lpBalance =
    await pair.balanceOf(wallet);

  const lpTotalSupply =
    await pair.totalSupply();

  console.log("");
  console.log("------------------------------------------");
  console.log("PAIR VERIFICATION");
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
    "LP balance:",
    lpBalance.toString()
  );

  console.log(
    "LP total supply:",
    lpTotalSupply.toString()
  );

  if (lpBalance === 0n) {
    throw new Error(
      "Wallet received no LP tokens."
    );
  }

  if (
    reserves[0] === 0n ||
    reserves[1] === 0n
  ) {
    throw new Error(
      "Pair reserves are zero."
    );
  }

  // ==========================================
  // BALANCES AFTER
  // ==========================================

  const numenBalanceAfter =
    await numen.balanceOf(wallet);

  const testBalanceAfter =
    await test.balanceOf(wallet);

  const numenAllowanceAfter =
    await numen.allowance(
      wallet,
      ROUTER_ADDRESS
    );

  const testAllowanceAfter =
    await test.allowance(
      wallet,
      ROUTER_ADDRESS
    );

  console.log("");
  console.log("------------------------------------------");
  console.log("BALANCES AFTER");
  console.log("------------------------------------------");

  console.log(
    "NUMN:",
    ethers.formatUnits(
      numenBalanceAfter,
      numenDecimals
    )
  );

  console.log(
    `${testSymbol}:`,
    ethers.formatUnits(
      testBalanceAfter,
      testDecimals
    )
  );

  console.log("");
  console.log(
    "NUMN allowance remaining:",
    ethers.formatUnits(
      numenAllowanceAfter,
      numenDecimals
    )
  );

  console.log(
    "TEST allowance remaining:",
    ethers.formatUnits(
      testAllowanceAfter,
      testDecimals
    )
  );

  console.log("");
  console.log("==========================================");
  console.log("TEST SUCCESSFUL");
  console.log("==========================================");
  console.log("");

  console.log(
    "✅ Factory pair creation works."
  );

  console.log(
    "✅ Router addLiquidity works."
  );

  console.log(
    "✅ NUMN approve works."
  );

  console.log(
    "✅ NUMN transferFrom through Router works."
  );

  console.log(
    "✅ TEST transferFrom through Router works."
  );

  console.log(
    "✅ Pair mint works."
  );

  console.log(
    "✅ LP tokens were issued."
  );

  console.log("");
  console.log(
    "NUMN can be used directly by NumenDEX without WNUMN."
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("TEST FAILED:");

    console.error(
      error.shortMessage ||
      error.reason ||
      error.message ||
      error
    );

    process.exit(1);
  });