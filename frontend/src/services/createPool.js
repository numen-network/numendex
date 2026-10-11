import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  ZeroAddress,
  getAddress,
  isAddress,
} from "ethers";

const NUMEN_CHAIN_ID = 32026;

const NUMEN_RPC_URL =
  "https://rpc.numen-network.org";

const FACTORY_ADDRESS =
  "0xE4C63d8eEAeC2B717c4e24d1Cfa4a57C0A1C7907";

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
  "function createPair(address tokenA, address tokenB) external returns (address pair)",
  "function allPairsLength() external view returns (uint256)",
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint256)",
];

/*
 * Numen RPC can significantly overestimate
 * EVM contract gas.
 *
 * Use a manual cap for Factory.createPair().
 */
const CREATE_PAIR_GAS_LIMIT =
  2_500_000n;

/*
 * Static public provider.
 *
 * Used for read-only calls such as getPair().
 * This means checking whether a pool exists
 * does not require MetaMask.
 */
const readProvider =
  new JsonRpcProvider(
    NUMEN_RPC_URL,
    {
      name: "numen",
      chainId:
        NUMEN_CHAIN_ID,
    },
    {
      staticNetwork: true,
    }
  );

function normalizeAddress(
  address,
  label = "Token"
) {
  if (
    !address ||
    !isAddress(address)
  ) {
    throw new Error(
      `${label} address is invalid.`
    );
  }

  return getAddress(
    address
  );
}

function validatePair(
  tokenA,
  tokenB
) {
  const normalizedTokenA =
    normalizeAddress(
      tokenA,
      "Token A"
    );

  const normalizedTokenB =
    normalizeAddress(
      tokenB,
      "Token B"
    );

  if (
    normalizedTokenA.toLowerCase() ===
    normalizedTokenB.toLowerCase()
  ) {
    throw new Error(
      "A token cannot be paired with itself."
    );
  }

  return {
    tokenA:
      normalizedTokenA,

    tokenB:
      normalizedTokenB,
  };
}

function getInjectedEthereum() {
  if (
    typeof window ===
      "undefined" ||
    !window.ethereum
  ) {
    throw new Error(
      "MetaMask or another EVM wallet was not detected."
    );
  }

  return window.ethereum;
}

async function getWalletContext() {
  const ethereum =
    getInjectedEthereum();

  const provider =
    new BrowserProvider(
      ethereum
    );

  const network =
    await provider.getNetwork();

  if (
    network.chainId !==
    BigInt(
      NUMEN_CHAIN_ID
    )
  ) {
    throw new Error(
      "Please switch your wallet to Numen Network."
    );
  }

  const signer =
    await provider.getSigner();

  const account =
    await signer.getAddress();

  return {
    provider,
    signer,
    account,
  };
}

/*
 * ========================================
 * GET EXISTING PAIR
 * ========================================
 *
 * Read-only.
 *
 * Returns:
 *
 * null
 *
 * or:
 *
 * 0xPairAddress
 */
export async function getExistingPair({
  tokenA,
  tokenB,
}) {
  const validated =
    validatePair(
      tokenA,
      tokenB
    );

  const factory =
    new Contract(
      FACTORY_ADDRESS,
      FACTORY_ABI,
      readProvider
    );

  const pairAddress =
    await factory.getPair(
      validated.tokenA,
      validated.tokenB
    );

  if (
    !pairAddress ||
    pairAddress ===
      ZeroAddress
  ) {
    return null;
  }

  return getAddress(
    pairAddress
  );
}

/*
 * ========================================
 * CREATE POOL
 * ========================================
 *
 * Flow:
 *
 * 1. Validate token addresses
 * 2. Make sure tokens are different
 * 3. Check Factory.getPair()
 * 4. If pair exists, return it
 * 5. Verify wallet is on Numen
 * 6. Call Factory.createPair()
 * 7. Wait for confirmation
 * 8. Read new pair address from Factory
 */
export async function createPool({
  tokenA,
  tokenB,
}) {
  const validated =
    validatePair(
      tokenA,
      tokenB
    );

  /*
   * Check before opening MetaMask.
   */
  const existingPair =
    await getExistingPair({
      tokenA:
        validated.tokenA,

      tokenB:
        validated.tokenB,
    });

  if (existingPair) {
    return {
      success: false,
      alreadyExists: true,

      pairAddress:
        existingPair,

      tokenA:
        validated.tokenA,

      tokenB:
        validated.tokenB,

      transactionHash:
        null,

      account:
        null,

      receipt:
        null,
    };
  }

  const {
    signer,
    account,
  } =
    await getWalletContext();

  const factory =
    new Contract(
      FACTORY_ADDRESS,
      FACTORY_ABI,
      signer
    );

  /*
   * Check once more immediately before
   * sending the transaction.
   *
   * This also protects against another
   * wallet creating the same pair between
   * our first check and the transaction.
   */
  const pairBeforeTransaction =
    await factory.getPair(
      validated.tokenA,
      validated.tokenB
    );

  if (
    pairBeforeTransaction &&
    pairBeforeTransaction !==
      ZeroAddress
  ) {
    return {
      success: false,
      alreadyExists: true,

      pairAddress:
        getAddress(
          pairBeforeTransaction
        ),

      tokenA:
        validated.tokenA,

      tokenB:
        validated.tokenB,

      transactionHash:
        null,

      account,

      receipt:
        null,
    };
  }

  /*
   * Do not use estimateGas here.
   *
   * Numen RPC currently returns very large
   * estimates for some EVM contract calls.
   */
  const transaction =
    await factory.createPair(
      validated.tokenA,
      validated.tokenB,
      {
        gasLimit:
          CREATE_PAIR_GAS_LIMIT,
      }
    );

  const receipt =
    await transaction.wait();

  if (!receipt) {
    throw new Error(
      "The pool creation transaction was not confirmed."
    );
  }

  if (
    receipt.status !==
      undefined &&
    Number(
      receipt.status
    ) !== 1
  ) {
    throw new Error(
      "The pool creation transaction failed."
    );
  }

  /*
   * Do not rely only on PairCreated event
   * parsing. Factory.getPair() is the
   * canonical final check.
   */
  const createdPair =
    await factory.getPair(
      validated.tokenA,
      validated.tokenB
    );

  if (
    !createdPair ||
    createdPair ===
      ZeroAddress
  ) {
    throw new Error(
      "The transaction was confirmed, but the new pool address could not be found."
    );
  }

  return {
    success: true,
    alreadyExists: false,

    pairAddress:
      getAddress(
        createdPair
      ),

    tokenA:
      validated.tokenA,

    tokenB:
      validated.tokenB,

    transactionHash:
      transaction.hash,

    account,

    receipt,
  };
}

/*
 * ========================================
 * EXPORT CONSTANTS
 * ========================================
 */

export {
  FACTORY_ADDRESS,
  FACTORY_ABI,
  CREATE_PAIR_GAS_LIMIT,
  NUMEN_CHAIN_ID,
  NUMEN_RPC_URL,
};