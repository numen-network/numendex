const { ethers } = require("hardhat");
require("dotenv").config();

// ============================================================
// NUMEN NATIVE ERC-20 SYSTEM ADDRESS
// ============================================================

const NUMN_ADDRESS =
  process.env.NUMN_ADDRESS ||
  "0x0000000000000000000000000000000000000802";

// ============================================================
// MINIMAL ERC-20 ABI
// ============================================================

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// ============================================================
// SAFE READ HELPER
// ============================================================

async function safeRead(
  label,
  callback
) {
  try {
    const result =
      await callback();

    console.log(
      `✅ ${label}:`,
      result
    );

    return result;
  } catch (error) {
    console.log(
      `❌ ${label}: CALL FAILED`
    );

    if (error.shortMessage) {
      console.log(
        "   ",
        error.shortMessage
      );
    } else if (error.message) {
      console.log(
        "   ",
        error.message
      );
    }

    return null;
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("");
  console.log(
    "=============================================="
  );
  console.log(
    "       NUMEN NATIVE ERC-20 CHECK"
  );
  console.log(
    "=============================================="
  );
  console.log("");

  // ==========================================================
  // NETWORK
  // ==========================================================

  const provider =
    ethers.provider;

  const network =
    await provider.getNetwork();

  console.log(
    "Network chainId:",
    network.chainId.toString()
  );

  if (
    network.chainId !== 32026n
  ) {
    throw new Error(
      `Wrong network. Expected Numen chainId 32026, received ${network.chainId.toString()}`
    );
  }

  console.log(
    "NUMN system address:",
    NUMN_ADDRESS
  );

  console.log("");

  // ==========================================================
  // CONTRACT CODE
  // ==========================================================

  const code =
    await provider.getCode(
      NUMN_ADDRESS
    );

  console.log(
    "Contract bytecode length:",
    code.length
  );

  if (
    code === "0x"
  ) {
    console.log(
      "⚠️ No EVM bytecode returned at NUMN system address."
    );

    console.log(
      "This may still be a Frontier/precompile-style system address."
    );
  } else {
    console.log(
      "✅ EVM bytecode exists at NUMN system address."
    );
  }

  console.log("");

  // ==========================================================
  // ERC-20 CONTRACT
  // ==========================================================

  const numen =
    new ethers.Contract(
      NUMN_ADDRESS,
      ERC20_ABI,
      provider
    );

  // ==========================================================
  // ERC-20 METADATA
  // ==========================================================

  const name =
    await safeRead(
      "name()",
      async () =>
        await numen.name()
    );

  const symbol =
    await safeRead(
      "symbol()",
      async () =>
        await numen.symbol()
    );

  const decimals =
    await safeRead(
      "decimals()",
      async () =>
        await numen.decimals()
    );

  const totalSupply =
    await safeRead(
      "totalSupply()",
      async () =>
        await numen.totalSupply()
    );

  console.log("");

  // ==========================================================
  // FORMAT SUPPLY
  // ==========================================================

  if (
    totalSupply !== null &&
    decimals !== null
  ) {
    try {
      console.log(
        "Formatted total supply:",
        ethers.formatUnits(
          totalSupply,
          Number(decimals)
        )
      );
    } catch (error) {
      console.log(
        "⚠️ Could not format total supply."
      );
    }
  }

  console.log("");

  // ==========================================================
  // DEPLOYER ADDRESS
  //
  // Reading the signer address does NOT send a transaction.
  // ==========================================================

  let signer = null;
  let signerAddress = null;

  try {
    const signers =
      await ethers.getSigners();

    if (
      signers.length > 0
    ) {
      signer =
        signers[0];

      signerAddress =
        await signer.getAddress();

      console.log(
        "Configured wallet:",
        signerAddress
      );
    }
  } catch (error) {
    console.log(
      "⚠️ No configured signer available."
    );
  }

  console.log("");

  // ==========================================================
  // BALANCE
  // ==========================================================

  let balance = null;

  if (
    signerAddress
  ) {
    balance =
      await safeRead(
        "balanceOf(wallet)",
        async () =>
          await numen.balanceOf(
            signerAddress
          )
      );

    if (
      balance !== null &&
      decimals !== null
    ) {
      console.log(
        "Formatted NUMN balance:",
        ethers.formatUnits(
          balance,
          Number(decimals)
        )
      );
    }
  }

  console.log("");

  // ==========================================================
  // ROUTER ALLOWANCE
  //
  // IMPORTANT:
  // This is only read if ROUTER_ADDRESS exists in .env.
  // No approve transaction is sent.
  // ==========================================================

  const routerAddress =
    process.env.ROUTER_ADDRESS;

  if (
    signerAddress &&
    routerAddress &&
    ethers.isAddress(
      routerAddress
    )
  ) {
    console.log(
      "Configured Router:",
      routerAddress
    );

    const allowance =
      await safeRead(
        "allowance(wallet, router)",
        async () =>
          await numen.allowance(
            signerAddress,
            routerAddress
          )
      );

    if (
      allowance !== null &&
      decimals !== null
    ) {
      console.log(
        "Formatted allowance:",
        ethers.formatUnits(
          allowance,
          Number(decimals)
        )
      );
    }
  } else {
    console.log(
      "ℹ️ Router allowance check skipped."
    );
  }

  console.log("");

  // ==========================================================
  // NATIVE BALANCE
  //
  // NUMN is also used for EVM transaction gas.
  // ==========================================================

  if (
    signerAddress
  ) {
    const nativeBalance =
      await provider.getBalance(
        signerAddress
      );

    console.log(
      "Native EVM balance:",
      ethers.formatEther(
        nativeBalance
      ),
      "NUMN"
    );

    if (
      balance !== null
    ) {
      console.log(
        "ERC-20 balanceOf raw:",
        balance.toString()
      );

      console.log(
        "Native balance raw:",
        nativeBalance.toString()
      );

      if (
        balance === nativeBalance
      ) {
        console.log(
          "✅ ERC-20 balanceOf and native EVM balance are identical."
        );
      } else {
        console.log(
          "⚠️ ERC-20 balanceOf and native EVM balance differ."
        );
      }
    }
  }

  console.log("");

  // ==========================================================
  // GAS PRICE
  // ==========================================================

  try {
    const feeData =
      await provider.getFeeData();

    if (
      feeData.gasPrice !== null
    ) {
      console.log(
        "RPC gas price:",
        ethers.formatUnits(
          feeData.gasPrice,
          "gwei"
        ),
        "Gwei"
      );

      console.log(
        "RPC gas price raw:",
        feeData.gasPrice.toString()
      );
    } else {
      console.log(
        "⚠️ RPC did not return legacy gasPrice."
      );
    }
  } catch (error) {
    console.log(
      "❌ Gas price query failed."
    );
  }

  console.log("");

  // ==========================================================
  // SUMMARY
  // ==========================================================

  console.log(
    "=============================================="
  );

  console.log(
    "READ-ONLY CHECK COMPLETE"
  );

  console.log(
    "No transaction was sent."
  );

  console.log(
    "No token was transferred."
  );

  console.log(
    "No approval was created."
  );

  console.log(
    "=============================================="
  );

  console.log("");

  if (
    name !== null &&
    symbol !== null &&
    decimals !== null
  ) {
    console.log(
      "ERC-20 metadata calls are working."
    );
  } else {
    console.log(
      "One or more ERC-20 metadata calls failed."
    );
  }
}

// ============================================================
// RUN
// ============================================================

main()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error("");
    console.error(
      "❌ NUMN CHECK FAILED"
    );

    console.error(
      error
    );

    process.exitCode = 1;
  });