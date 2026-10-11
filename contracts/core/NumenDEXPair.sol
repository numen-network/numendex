// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/INumenDEXFactory.sol";
import "../libraries/Math.sol";
import "../libraries/UQ112x112.sol";

interface INumenDEXCallee {
    function numenDEXCall(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}

contract NumenDEXPair {
    using UQ112x112 for uint224;

    // =============================================================
    // LP TOKEN
    // =============================================================

    string public constant name = "NumenDEX LP Token";
    string public constant symbol = "NDEX-LP";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value
    );

    // =============================================================
    // PERMIT
    // =============================================================

    bytes32 public immutable DOMAIN_SEPARATOR;

    bytes32 public constant PERMIT_TYPEHASH =
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

    mapping(address => uint256) public nonces;

    // =============================================================
    // AMM
    // =============================================================

    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    address public immutable factory;
    address public immutable token0;
    address public immutable token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;

    uint256 public kLast;

    uint256 private unlocked = 1;

    // =============================================================
    // AMM EVENTS
    // =============================================================

    event Mint(
        address indexed sender,
        uint256 amount0,
        uint256 amount1
    );

    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );

    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );

    event Sync(
        uint112 reserve0,
        uint112 reserve1
    );

    // =============================================================
    // REENTRANCY LOCK
    // =============================================================

    modifier lock() {
        require(
            unlocked == 1,
            "NumenDEX: LOCKED"
        );

        unlocked = 0;

        _;

        unlocked = 1;
    }

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    constructor(
        address _factory,
        address _token0,
        address _token1
    ) {
        require(
            _factory != address(0),
            "NumenDEX: ZERO_FACTORY"
        );

        require(
            _token0 != address(0) &&
                _token1 != address(0),
            "NumenDEX: ZERO_TOKEN"
        );

        require(
            _token0 != _token1,
            "NumenDEX: IDENTICAL_TOKENS"
        );

        factory = _factory;
        token0 = _token0;
        token1 = _token1;

        DOMAIN_SEPARATOR =
            keccak256(
                abi.encode(
                    keccak256(
                        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                    ),
                    keccak256(bytes(name)),
                    keccak256(bytes("1")),
                    block.chainid,
                    address(this)
                )
            );
    }

    // =============================================================
    // ERC20
    // =============================================================

    function approve(
        address spender,
        uint256 value
    ) external returns (bool) {
        allowance[msg.sender][spender] = value;

        emit Approval(
            msg.sender,
            spender,
            value
        );

        return true;
    }

    function transfer(
        address to,
        uint256 value
    ) external returns (bool) {
        _transfer(
            msg.sender,
            to,
            value
        );

        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool) {
        uint256 currentAllowance =
            allowance[from][msg.sender];

        if (
            currentAllowance !=
            type(uint256).max
        ) {
            allowance[from][msg.sender] =
                currentAllowance - value;

            emit Approval(
                from,
                msg.sender,
                allowance[from][msg.sender]
            );
        }

        _transfer(
            from,
            to,
            value
        );

        return true;
    }

    function _transfer(
        address from,
        address to,
        uint256 value
    ) private {
        require(
            from != address(0),
            "NumenDEX: TRANSFER_FROM_ZERO"
        );

        require(
            to != address(0),
            "NumenDEX: TRANSFER_TO_ZERO"
        );

        balanceOf[from] -= value;
        balanceOf[to] += value;

        emit Transfer(
            from,
            to,
            value
        );
    }

    function _mint(
        address to,
        uint256 value
    ) private {
        totalSupply += value;
        balanceOf[to] += value;

        emit Transfer(
            address(0),
            to,
            value
        );
    }

    function _burn(
        address from,
        uint256 value
    ) private {
        balanceOf[from] -= value;
        totalSupply -= value;

        emit Transfer(
            from,
            address(0),
            value
        );
    }

    // =============================================================
    // EIP-2612 PERMIT
    // =============================================================

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(
            deadline >= block.timestamp,
            "NumenDEX: EXPIRED"
        );

        uint256 nonce =
            nonces[owner];

        bytes32 digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR,
                    keccak256(
                        abi.encode(
                            PERMIT_TYPEHASH,
                            owner,
                            spender,
                            value,
                            nonce,
                            deadline
                        )
                    )
                )
            );

        address recoveredAddress =
            ecrecover(
                digest,
                v,
                r,
                s
            );

        require(
            recoveredAddress != address(0) &&
                recoveredAddress == owner,
            "NumenDEX: INVALID_SIGNATURE"
        );

        nonces[owner] =
            nonce + 1;

        allowance[owner][spender] =
            value;

        emit Approval(
            owner,
            spender,
            value
        );
    }

    // =============================================================
    // RESERVES
    // =============================================================

    function getReserves()
        public
        view
        returns (
            uint112 _reserve0,
            uint112 _reserve1,
            uint32 _blockTimestampLast
        )
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast =
            blockTimestampLast;
    }

    // =============================================================
    // UPDATE RESERVES / TWAP
    // =============================================================

    function _update(
        uint256 balance0,
        uint256 balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private {
        require(
            balance0 <= type(uint112).max &&
                balance1 <= type(uint112).max,
            "NumenDEX: OVERFLOW"
        );

        uint32 blockTimestamp =
            uint32(
                block.timestamp %
                    2 ** 32
            );

        uint32 timeElapsed;

        unchecked {
            timeElapsed =
                blockTimestamp -
                blockTimestampLast;
        }

        if (
            timeElapsed > 0 &&
            _reserve0 != 0 &&
            _reserve1 != 0
        ) {
            unchecked {
                price0CumulativeLast +=
                    uint256(
                        UQ112x112
                            .encode(_reserve1)
                            .uqdiv(_reserve0)
                    ) *
                    timeElapsed;

                price1CumulativeLast +=
                    uint256(
                        UQ112x112
                            .encode(_reserve0)
                            .uqdiv(_reserve1)
                    ) *
                    timeElapsed;
            }
        }

        reserve0 =
            uint112(balance0);

        reserve1 =
            uint112(balance1);

        blockTimestampLast =
            blockTimestamp;

        emit Sync(
            reserve0,
            reserve1
        );
    }

    // =============================================================
    // ADD LIQUIDITY / MINT LP
    // =============================================================

    function mint(
        address to
    )
        external
        lock
        returns (uint256 liquidity)
    {
        require(
            to != address(0),
            "NumenDEX: ZERO_TO"
        );

        (
            uint112 _reserve0,
            uint112 _reserve1,

        ) = getReserves();

        uint256 balance0 =
            _tokenBalance(token0);

        uint256 balance1 =
            _tokenBalance(token1);

        uint256 amount0 =
            balance0 -
            uint256(_reserve0);

        uint256 amount1 =
            balance1 -
            uint256(_reserve1);

        bool feeOn =
            _mintFee(
                _reserve0,
                _reserve1
            );

        uint256 _totalSupply =
            totalSupply;

        if (_totalSupply == 0) {
            uint256 rootLiquidity =
                Math.sqrt(
                    amount0 *
                        amount1
                );

            require(
                rootLiquidity >
                    MINIMUM_LIQUIDITY,
                "NumenDEX: INSUFFICIENT_INITIAL_LIQUIDITY"
            );

            liquidity =
                rootLiquidity -
                MINIMUM_LIQUIDITY;

            // Permanently locked minimum liquidity.
            _mint(
                address(0),
                MINIMUM_LIQUIDITY
            );
        } else {
            liquidity =
                Math.min(
                    amount0 *
                        _totalSupply /
                        uint256(_reserve0),

                    amount1 *
                        _totalSupply /
                        uint256(_reserve1)
                );
        }

        require(
            liquidity > 0,
            "NumenDEX: INSUFFICIENT_LIQUIDITY_MINTED"
        );

        _mint(
            to,
            liquidity
        );

        _update(
            balance0,
            balance1,
            _reserve0,
            _reserve1
        );

        if (feeOn) {
            kLast =
                uint256(reserve0) *
                uint256(reserve1);
        }

        emit Mint(
            msg.sender,
            amount0,
            amount1
        );
    }

    // =============================================================
    // REMOVE LIQUIDITY / BURN LP
    // =============================================================

    function burn(
        address to
    )
        external
        lock
        returns (
            uint256 amount0,
            uint256 amount1
        )
    {
        require(
            to != address(0),
            "NumenDEX: ZERO_TO"
        );

        (
            uint112 _reserve0,
            uint112 _reserve1,

        ) = getReserves();

        uint256 balance0 =
            _tokenBalance(token0);

        uint256 balance1 =
            _tokenBalance(token1);

        uint256 liquidity =
            balanceOf[address(this)];

        require(
            liquidity > 0,
            "NumenDEX: ZERO_LIQUIDITY"
        );

        bool feeOn =
            _mintFee(
                _reserve0,
                _reserve1
            );

        uint256 _totalSupply =
            totalSupply;

        amount0 =
            liquidity *
            balance0 /
            _totalSupply;

        amount1 =
            liquidity *
            balance1 /
            _totalSupply;

        require(
            amount0 > 0 &&
                amount1 > 0,
            "NumenDEX: INSUFFICIENT_LIQUIDITY_BURNED"
        );

        _burn(
            address(this),
            liquidity
        );

        _safeTransfer(
            token0,
            to,
            amount0
        );

        _safeTransfer(
            token1,
            to,
            amount1
        );

        balance0 =
            _tokenBalance(token0);

        balance1 =
            _tokenBalance(token1);

        _update(
            balance0,
            balance1,
            _reserve0,
            _reserve1
        );

        if (feeOn) {
            kLast =
                uint256(reserve0) *
                uint256(reserve1);
        }

        emit Burn(
            msg.sender,
            amount0,
            amount1,
            to
        );
    }

    // =============================================================
    // SWAP
    // =============================================================

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external lock {
        require(
            amount0Out > 0 ||
                amount1Out > 0,
            "NumenDEX: INSUFFICIENT_OUTPUT_AMOUNT"
        );

        (
            uint112 _reserve0,
            uint112 _reserve1,

        ) = getReserves();

        require(
            amount0Out <
                uint256(_reserve0) &&
                amount1Out <
                uint256(_reserve1),
            "NumenDEX: INSUFFICIENT_LIQUIDITY"
        );

        require(
            to != address(0),
            "NumenDEX: ZERO_TO"
        );

        require(
            to != token0 &&
                to != token1,
            "NumenDEX: INVALID_TO"
        );

        // Transfer requested output first.
        if (amount0Out > 0) {
            _safeTransfer(
                token0,
                to,
                amount0Out
            );
        }

        if (amount1Out > 0) {
            _safeTransfer(
                token1,
                to,
                amount1Out
            );
        }

        // Optional flash-swap callback.
        if (data.length > 0) {
            INumenDEXCallee(to)
                .numenDEXCall(
                    msg.sender,
                    amount0Out,
                    amount1Out,
                    data
                );
        }

        uint256 balance0 =
            _tokenBalance(token0);

        uint256 balance1 =
            _tokenBalance(token1);

        (
            uint256 amount0In,
            uint256 amount1In
        ) =
            _calculateAmountIn(
                balance0,
                balance1,
                _reserve0,
                _reserve1,
                amount0Out,
                amount1Out
            );

        require(
            amount0In > 0 ||
                amount1In > 0,
            "NumenDEX: INSUFFICIENT_INPUT_AMOUNT"
        );

        _checkInvariant(
            balance0,
            balance1,
            _reserve0,
            _reserve1,
            amount0In,
            amount1In
        );

        _update(
            balance0,
            balance1,
            _reserve0,
            _reserve1
        );

        emit Swap(
            msg.sender,
            amount0In,
            amount1In,
            amount0Out,
            amount1Out,
            to
        );
    }

    // =============================================================
    // SWAP INPUT CALCULATION
    // =============================================================

    function _calculateAmountIn(
        uint256 balance0,
        uint256 balance1,
        uint112 _reserve0,
        uint112 _reserve1,
        uint256 amount0Out,
        uint256 amount1Out
    )
        private
        pure
        returns (
            uint256 amount0In,
            uint256 amount1In
        )
    {
        uint256 expectedBalance0 =
            uint256(_reserve0) -
            amount0Out;

        uint256 expectedBalance1 =
            uint256(_reserve1) -
            amount1Out;

        if (
            balance0 >
            expectedBalance0
        ) {
            amount0In =
                balance0 -
                expectedBalance0;
        }

        if (
            balance1 >
            expectedBalance1
        ) {
            amount1In =
                balance1 -
                expectedBalance1;
        }
    }

    // =============================================================
    // CONSTANT PRODUCT INVARIANT
    // =============================================================

    function _checkInvariant(
        uint256 balance0,
        uint256 balance1,
        uint112 _reserve0,
        uint112 _reserve1,
        uint256 amount0In,
        uint256 amount1In
    ) private pure {
        /*
         * 0.30% swap fee:
         *
         * balanceAdjusted =
         * balance * 1000 - amountIn * 3
         *
         * Equivalent effective input:
         * 997 / 1000 = 99.7%
         */

        uint256 balance0Adjusted =
            balance0 *
                1000 -
            amount0In *
                3;

        uint256 balance1Adjusted =
            balance1 *
                1000 -
            amount1In *
                3;

        require(
            balance0Adjusted *
                balance1Adjusted >=
                uint256(_reserve0) *
                    uint256(_reserve1) *
                    1_000_000,
            "NumenDEX: K"
        );
    }

    // =============================================================
    // SKIM
    // =============================================================

    function skim(
        address to
    ) external lock {
        require(
            to != address(0),
            "NumenDEX: ZERO_TO"
        );

        uint256 balance0 =
            _tokenBalance(token0);

        uint256 balance1 =
            _tokenBalance(token1);

        if (
            balance0 >
            uint256(reserve0)
        ) {
            _safeTransfer(
                token0,
                to,
                balance0 -
                    uint256(reserve0)
            );
        }

        if (
            balance1 >
            uint256(reserve1)
        ) {
            _safeTransfer(
                token1,
                to,
                balance1 -
                    uint256(reserve1)
            );
        }
    }

    // =============================================================
    // SYNC
    // =============================================================

    function sync()
        external
        lock
    {
        _update(
            _tokenBalance(token0),
            _tokenBalance(token1),
            reserve0,
            reserve1
        );
    }

    // =============================================================
    // PROTOCOL FEE
    // =============================================================

    function _mintFee(
        uint112 _reserve0,
        uint112 _reserve1
    )
        private
        returns (bool feeOn)
    {
        address feeTo =
            INumenDEXFactory(factory)
                .feeTo();

        feeOn =
            feeTo != address(0);

        uint256 _kLast =
            kLast;

        if (feeOn) {
            if (_kLast != 0) {
                uint256 rootK =
                    Math.sqrt(
                        uint256(_reserve0) *
                            uint256(_reserve1)
                    );

                uint256 rootKLast =
                    Math.sqrt(
                        _kLast
                    );

                if (
                    rootK >
                    rootKLast
                ) {
                    uint256 numerator =
                        totalSupply *
                        (
                            rootK -
                            rootKLast
                        );

                    uint256 denominator =
                        rootK *
                            5 +
                        rootKLast;

                    uint256 liquidity =
                        numerator /
                        denominator;

                    if (
                        liquidity > 0
                    ) {
                        _mint(
                            feeTo,
                            liquidity
                        );
                    }
                }
            }
        } else if (
            _kLast != 0
        ) {
            kLast = 0;
        }
    }

    // =============================================================
    // SAFE TOKEN TRANSFER
    // =============================================================

    function _safeTransfer(
        address token,
        address to,
        uint256 value
    ) private {
        (
            bool success,
            bytes memory data
        ) =
            token.call(
                abi.encodeWithSelector(
                    bytes4(
                        keccak256(
                            "transfer(address,uint256)"
                        )
                    ),
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
            "NumenDEX: TRANSFER_FAILED"
        );
    }

    // =============================================================
    // TOKEN BALANCE
    // =============================================================

    function _tokenBalance(
        address token
    )
        private
        view
        returns (
            uint256 balance
        )
    {
        (
            bool success,
            bytes memory data
        ) =
            token.staticcall(
                abi.encodeWithSelector(
                    bytes4(
                        keccak256(
                            "balanceOf(address)"
                        )
                    ),
                    address(this)
                )
            );

        require(
            success &&
                data.length >= 32,
            "NumenDEX: BALANCE_FAILED"
        );

        balance =
            abi.decode(
                data,
                (uint256)
            );
    }
}