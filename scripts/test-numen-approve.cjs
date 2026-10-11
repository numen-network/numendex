require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  console.log("");
  console.log("==========================================");
  console.log("NUMN ERC-20 APPROVE WRITE TEST");
  console.log("==========================================");
  console.log("");

  // ==========================================
  // ENVIRONMENT
  // ==========================================

  const NUMN_ADDRESS =
    process.env.NUMN_ADDRESS;

  const ROUTER_ADDRESS =
    process.env.ROUTER_ADDRESS;

  if (!NUMN_ADDRESS) {
    throw new Error(
      "NUMN_ADDRESS is missing from .env"
    );
  }

  if (!ROUTER_ADDRESS) {
    throw new Error(
      "ROUTER_ADDRESS is missing from .env"
    );
  }

  if (!ethers.isAddress(NUMN_ADDRESS)) {
    throw new Error(
      "Invalid NUMN_ADDRESS"
    );
  }

  if (!ethers.isAddress(ROUTER_ADDRESS)) {
    throw new Error(
      "Invalid ROUTER_ADDRESS"
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

  const signerAddress =
    await signer.getAddress();

  const expectedSigner =
    "0x478C47d215bbfc43F25FAB48B4100bB1BbE1a6Dc";

  console.log(
    "Wallet:",
    signerAddress
  );

  if (
    signerAddress.toLowerCase() !==
    expectedSigner.toLowerCase()
  ) {
    throw new Error(
      `Wrong signer. Expected ${expectedSigner}, got ${signerAddress}`
    );
  }

  console.log(
    "NUMN:",
    NUMN_ADDRESS
  );

  console.log(
    "Router:",
    ROUTER_ADDRESS
  );

  console.log("");

  // ==========================================
  // CHECK ROUTER BYTECODE
  // ==========================================

  const routerCode =
    await ethers.provider.getCode(
      ROUTER_ADDRESS
    );

  if (routerCode === "0x") {
    throw new Error(
      "No Router contract found at ROUTER_ADDRESS"
    );
  }

  console.log(
    "✅ Router contract exists."
  );

  // ==========================================
  // NUMN INTERFACE
  // ==========================================

  const NUMN_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner,address spender) view returns (uint256)",
    "function approve(address spender,uint256 amount) returns (bool)"
  ];

  const numen =
    new ethers.Contract(
      NUMN_ADDRESS,
      NUMN_ABI,
      signer
    );

  // ==========================================
  // TOKEN INFORMATION
  // ==========================================

  const name =
    await numen.name();

  const symbol =
    await numen.symbol();

  const decimals =
    Number(await numen.decimals());

  console.log(
    "Token:",
    name
  );

  console.log(
    "Symbol:",
    symbol
  );

  console.log(
    "Decimals:",
    decimals
  );

  console.log("");

  // ==========================================
  // BALANCES
  // ==========================================

  const erc20Balance =
    await numen.balanceOf(
      signerAddress
    );

  const nativeBalance =
    await ethers.provider.getBalance(
      signerAddress
    );

  console.log(
    "ERC-20 NUMN balance:",
    ethers.formatUnits(
      erc20Balance,
      decimals
    )
  );

  console.log(
    "Native NUMN balance:",
    ethers.formatEther(
      nativeBalance
    )
  );

  if (erc20Balance !== nativeBalance) {
    console.log("");
    console.log(
      "⚠️ ERC-20 and native balances are not identical."
    );
  } else {
    console.log(
      "✅ ERC-20 balance matches native balance."
    );
  }

  console.log("");

  // ==========================================
  // CURRENT ALLOWANCE
  // ==========================================

  const allowanceBefore =
    await numen.allowance(
      signerAddress,
      ROUTER_ADDRESS
    );

  console.log(
    "Allowance BEFORE:",
    ethers.formatUnits(
      allowanceBefore,
      decimals
    ),
    "NUMN"
  );

  // ==========================================
  // APPROVE AMOUNT
  // ==========================================

  const approveAmount =
    ethers.parseUnits(
      "0.01",
      decimals
    );

  console.log(
    "Approve amount:",
    ethers.formatUnits(
      approveAmount,
      decimals
    ),
    "NUMN"
  );

  console.log("");

  // ==========================================
  // STATIC SIMULATION
  // ==========================================

  console.log("------------------------------------------");
  console.log("1) approve() simulation");
  console.log("------------------------------------------");

  try {
    const result =
      await numen.approve.staticCall(
        ROUTER_ADDRESS,
        approveAmount
      );

    console.log(
      "approve.staticCall():",
      result
    );

    if (result !== true) {
      throw new Error(
        "approve() simulation did not return true"
      );
    }

    console.log(
      "✅ approve() simulation successful."
    );
  } catch (error) {
    console.log(
      "❌ approve() simulation failed."
    );

    throw error;
  }

  console.log("");

  // ==========================================
  // GAS ESTIMATION
  // ==========================================

  console.log("------------------------------------------");
  console.log("2) Gas estimation");
  console.log("------------------------------------------");

  const estimatedGas =
    await numen.approve.estimateGas(
      ROUTER_ADDRESS,
      approveAmount
    );

  console.log(
    "Estimated gas:",
    estimatedGas.toString()
  );

  /*
   * We intentionally use a comfortable
   * gas limit because Frontier/system
   * address execution can differ from
   * normal Solidity ERC-20 estimation.
   */
  const gasLimit = 300000n;

  const gasPrice =
    ethers.parseUnits(
      process.env.NUMEN_GAS_PRICE_GWEI ||
        "500",
      "gwei"
    );

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

  console.log("");

  // ==========================================
  // REAL APPROVE TRANSACTION
  // ==========================================

  console.log("------------------------------------------");
  console.log("3) Sending REAL approve transaction");
  console.log("------------------------------------------");

  const tx =
    await numen.approve(
      ROUTER_ADDRESS,
      approveAmount,
      {
        gasLimit,
        gasPrice
      }
    );

  console.log(
    "Transaction hash:",
    tx.hash
  );

  console.log(
    "Waiting for confirmation..."
  );

  const receipt =
    await tx.wait();

  if (!receipt) {
    throw new Error(
      "No transaction receipt returned."
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
      "NUMN approve transaction failed."
    );
  }

  console.log(
    "✅ approve transaction confirmed."
  );

  console.log("");

  // ==========================================
  // VERIFY ALLOWANCE
  // ==========================================

  console.log("------------------------------------------");
  console.log("4) Verify allowance");
  console.log("------------------------------------------");

  const allowanceAfter =
    await numen.allowance(
      signerAddress,
      ROUTER_ADDRESS
    );

  console.log(
    "Allowance AFTER:",
    ethers.formatUnits(
      allowanceAfter,
      decimals
    ),
    "NUMN"
  );

  if (
    allowanceAfter !==
    approveAmount
  ) {
    throw new Error(
      "Allowance after transaction does not match 0.01 NUMN."
    );
  }

  console.log(
    "✅ NUMN approve() write behavior verified."
  );

  console.log("");
  console.log("==========================================");
  console.log("TEST SUCCESSFUL");
  console.log("==========================================");
  console.log("");
  console.log(
    "NUMN system address supports approve() on Numen EVM."
  );

  console.log(
    "Router allowance:",
    ethers.formatUnits(
      allowanceAfter,
      decimals
    ),
    "NUMN"
  );

  console.log("");
  console.log(
    "No NUMN was transferred to the Router."
  );

  console.log(
    "Only an allowance was created."
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