// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/INumenDEXFactory.sol";
import "../interfaces/INumenDEXPair.sol";
import "../libraries/NumenDEXLibrary.sol";

interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

contract NumenDEXRouter {
    address public immutable factory;

    modifier ensure(uint256 deadline) {
        require(
            deadline >= block.timestamp,
            "NumenDEXRouter: EXPIRED"
        );
        _;
    }

    constructor(address _factory) {
        require(
            _factory != address(0),
            "NumenDEXRouter: ZERO_FACTORY"
        );

        factory = _factory;
    }

    // =============================================================
    // ADD LIQUIDITY
    // =============================================================

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        require(
            tokenA != tokenB,
            "NumenDEXRouter: IDENTICAL_ADDRESSES"
        );

        require(
            tokenA != address(0) &&
            tokenB != address(0),
            "NumenDEXRouter: ZERO_ADDRESS"
        );

        require(
            to != address(0),
            "NumenDEXRouter: ZERO_TO"
        );

        if (
            INumenDEXFactory(factory)
                .getPair(tokenA, tokenB)
                == address(0)
        ) {
            INumenDEXFactory(factory)
                .createPair(
                    tokenA,
                    tokenB
                );
        }

        (
            uint256 reserveA,
            uint256 reserveB
        ) =
            NumenDEXLibrary.getReserves(
                factory,
                tokenA,
                tokenB
            );

        if (
            reserveA == 0 &&
            reserveB == 0
        ) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            uint256 amountBOptimal =
                NumenDEXLibrary.quote(
                    amountADesired,
                    reserveA,
                    reserveB
                );

            if (
                amountBOptimal <=
                amountBDesired
            ) {
                require(
                    amountBOptimal >=
                    amountBMin,
                    "NumenDEXRouter: INSUFFICIENT_B_AMOUNT"
                );

                amountA =
                    amountADesired;

                amountB =
                    amountBOptimal;
            } else {
                uint256 amountAOptimal =
                    NumenDEXLibrary.quote(
                        amountBDesired,
                        reserveB,
                        reserveA
                    );

                require(
                    amountAOptimal <=
                    amountADesired,
                    "NumenDEXRouter: EXCESSIVE_A_AMOUNT"
                );

                require(
                    amountAOptimal >=
                    amountAMin,
                    "NumenDEXRouter: INSUFFICIENT_A_AMOUNT"
                );

                amountA =
                    amountAOptimal;

                amountB =
                    amountBDesired;
            }
        }

        require(
            amountA >= amountAMin,
            "NumenDEXRouter: INSUFFICIENT_A_AMOUNT"
        );

        require(
            amountB >= amountBMin,
            "NumenDEXRouter: INSUFFICIENT_B_AMOUNT"
        );

        address pair =
            INumenDEXFactory(factory)
                .getPair(
                    tokenA,
                    tokenB
                );

        require(
            pair != address(0),
            "NumenDEXRouter: PAIR_NOT_FOUND"
        );

        _safeTransferFrom(
            tokenA,
            msg.sender,
            pair,
            amountA
        );

        _safeTransferFrom(
            tokenB,
            msg.sender,
            pair,
            amountB
        );

        liquidity =
            INumenDEXPair(pair)
                .mint(to);
    }

    // =============================================================
    // REMOVE LIQUIDITY
    // =============================================================

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        returns (
            uint256 amountA,
            uint256 amountB
        )
    {
        require(
            to != address(0),
            "NumenDEXRouter: ZERO_TO"
        );

        address pair =
            NumenDEXLibrary.pairFor(
                factory,
                tokenA,
                tokenB
            );

        _safeTransferFrom(
            pair,
            msg.sender,
            pair,
            liquidity
        );

        (
            uint256 amount0,
            uint256 amount1
        ) =
            INumenDEXPair(pair)
                .burn(to);

        (
            address token0_,

        ) =
            NumenDEXLibrary.sortTokens(
                tokenA,
                tokenB
            );

        if (tokenA == token0_) {
            amountA = amount0;
            amountB = amount1;
        } else {
            amountA = amount1;
            amountB = amount0;
        }

        require(
            amountA >= amountAMin,
            "NumenDEXRouter: INSUFFICIENT_A_AMOUNT"
        );

        require(
            amountB >= amountBMin,
            "NumenDEXRouter: INSUFFICIENT_B_AMOUNT"
        );
    }

    // =============================================================
    // EXACT INPUT SWAP
    // =============================================================

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        returns (
            uint256[] memory amounts
        )
    {
        require(
            path.length >= 2,
            "NumenDEXRouter: INVALID_PATH"
        );

        require(
            to != address(0),
            "NumenDEXRouter: ZERO_TO"
        );

        amounts =
            NumenDEXLibrary
                .getAmountsOut(
                    factory,
                    amountIn,
                    path
                );

        require(
            amounts[
                amounts.length - 1
            ] >= amountOutMin,
            "NumenDEXRouter: INSUFFICIENT_OUTPUT_AMOUNT"
        );

        address firstPair =
            NumenDEXLibrary.pairFor(
                factory,
                path[0],
                path[1]
            );

        _safeTransferFrom(
            path[0],
            msg.sender,
            firstPair,
            amounts[0]
        );

        _swap(
            amounts,
            path,
            to
        );
    }

    // =============================================================
    // EXACT OUTPUT SWAP
    // =============================================================

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        returns (
            uint256[] memory amounts
        )
    {
        require(
            path.length >= 2,
            "NumenDEXRouter: INVALID_PATH"
        );

        require(
            to != address(0),
            "NumenDEXRouter: ZERO_TO"
        );

        amounts =
            NumenDEXLibrary
                .getAmountsIn(
                    factory,
                    amountOut,
                    path
                );

        require(
            amounts[0] <=
            amountInMax,
            "NumenDEXRouter: EXCESSIVE_INPUT_AMOUNT"
        );

        address firstPair =
            NumenDEXLibrary.pairFor(
                factory,
                path[0],
                path[1]
            );

        _safeTransferFrom(
            path[0],
            msg.sender,
            firstPair,
            amounts[0]
        );

        _swap(
            amounts,
            path,
            to
        );
    }

    // =============================================================
    // QUOTES
    // =============================================================

    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    )
        external
        view
        returns (
            uint256[] memory amounts
        )
    {
        return
            NumenDEXLibrary
                .getAmountsOut(
                    factory,
                    amountIn,
                    path
                );
    }

    function getAmountsIn(
        uint256 amountOut,
        address[] calldata path
    )
        external
        view
        returns (
            uint256[] memory amounts
        )
    {
        return
            NumenDEXLibrary
                .getAmountsIn(
                    factory,
                    amountOut,
                    path
                );
    }

    // =============================================================
    // INTERNAL SWAP
    // =============================================================

    function _swap(
        uint256[] memory amounts,
        address[] calldata path,
        address finalTo
    ) internal {
        for (
            uint256 i = 0;
            i < path.length - 1;
            i++
        ) {
            /*
             * Burada input/output swap yolundaki gerçek
             * sırayı korumalıdır.
             *
             * Örnek:
             * NDEX -> NUMN
             *
             * Adres büyüklüğüne göre sıralamak input/output
             * yönünü değiştirmemelidir.
             */
            address input =
                path[i];

            address output =
                path[i + 1];

            (
                address token0_,

            ) =
                NumenDEXLibrary
                    .sortTokens(
                        input,
                        output
                    );

            uint256 amountOut =
                amounts[i + 1];

            uint256 amount0Out;
            uint256 amount1Out;

            if (input == token0_) {
                amount0Out = 0;
                amount1Out = amountOut;
            } else {
                amount0Out = amountOut;
                amount1Out = 0;
            }

            address to;

            if (
                i <
                path.length - 2
            ) {
                to =
                    NumenDEXLibrary
                        .pairFor(
                            factory,
                            output,
                            path[i + 2]
                        );
            } else {
                to =
                    finalTo;
            }

            address pair =
                NumenDEXLibrary
                    .pairFor(
                        factory,
                        input,
                        output
                    );

            INumenDEXPair(pair)
                .swap(
                    amount0Out,
                    amount1Out,
                    to,
                    new bytes(0)
                );
        }
    }

    // =============================================================
    // SAFE TRANSFER FROM
    // =============================================================

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) private {
        (
            bool success,
            bytes memory data
        ) =
            token.call(
                abi.encodeWithSelector(
                    IERC20
                        .transferFrom
                        .selector,
                    from,
                    to,
                    value
                )
            );

        require(
            success &&
            (
                data.length == 0 ||
                abi.decode(
                    data,
                    (bool)
                )
            ),
            "NumenDEXRouter: TRANSFER_FROM_FAILED"
        );
    }
}