import {
  apiGet,
} from "./api";


function normalizeAddress(
  address
) {
  return String(
    address || ""
  ).trim();
}


function normalizeAmount(
  amount
) {
  return String(
    amount ?? ""
  ).trim();
}


function normalizeSlippage(
  slippage
) {
  const numericValue =
    Number(slippage);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return 0.5;
  }

  return Math.min(
    100,
    Math.max(
      0,
      numericValue
    )
  );
}


export async function fetchSwapQuote({
  tokenIn,
  tokenOut,
  amountIn,
  slippage = 0.5,
  signal,
}) {
  const tokenInAddress =
    normalizeAddress(
      tokenIn?.address
    );

  const tokenOutAddress =
    normalizeAddress(
      tokenOut?.address
    );

  const amount =
    normalizeAmount(
      amountIn
    );


  if (!tokenInAddress) {
    throw new Error(
      "Input token is required."
    );
  }


  if (!tokenOutAddress) {
    throw new Error(
      "Output token is required."
    );
  }


  if (
    tokenInAddress.toLowerCase() ===
    tokenOutAddress.toLowerCase()
  ) {
    throw new Error(
      "Input and output tokens cannot be the same."
    );
  }


  if (!amount) {
    throw new Error(
      "Amount is required."
    );
  }


  const response =
    await apiGet(
      "/quote",
      {
        params: {
          tokenIn:
            tokenInAddress,

          tokenOut:
            tokenOutAddress,

          amount,

          slippage:
            normalizeSlippage(
              slippage
            ),
        },

        signal,
      }
    );


  if (
    !response?.data
  ) {
    throw new Error(
      "Quote data is missing."
    );
  }


  return response.data;
}