// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./NumenDEXPair.sol";

contract NumenDEXFactory {
    // =============================================================
    // PROTOCOL FEE
    // =============================================================

    address public feeTo;
    address public feeToSetter;

    // =============================================================
    // PAIRS
    // =============================================================

    mapping(address => mapping(address => address)) public getPair;

    address[] public allPairs;

    // =============================================================
    // EVENTS
    // =============================================================

    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256
    );

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    constructor(
        address _feeToSetter
    ) {
        require(
            _feeToSetter != address(0),
            "NumenDEX: ZERO_SETTER"
        );

        feeToSetter =
            _feeToSetter;
    }

    // =============================================================
    // PAIR COUNT
    // =============================================================

    function allPairsLength()
        external
        view
        returns (uint256)
    {
        return allPairs.length;
    }

    // =============================================================
    // CREATE PAIR
    // =============================================================

    function createPair(
        address tokenA,
        address tokenB
    )
        external
        returns (address pair)
    {
        require(
            tokenA != tokenB,
            "NumenDEX: IDENTICAL_ADDRESSES"
        );

        (
            address token0,
            address token1
        ) =
            tokenA < tokenB
                ? (tokenA, tokenB)
                : (tokenB, tokenA);

        require(
            token0 != address(0),
            "NumenDEX: ZERO_ADDRESS"
        );

        require(
            getPair[token0][token1] ==
                address(0),
            "NumenDEX: PAIR_EXISTS"
        );

        // =========================================================
        // DEPLOY PAIR
        // =========================================================

        NumenDEXPair newPair =
            new NumenDEXPair(
                address(this),
                token0,
                token1
            );

        pair =
            address(newPair);

        // =========================================================
        // STORE PAIR BOTH DIRECTIONS
        // =========================================================

        getPair[token0][token1] =
            pair;

        getPair[token1][token0] =
            pair;

        allPairs.push(
            pair
        );

        // =========================================================
        // EVENT
        // =========================================================

        emit PairCreated(
            token0,
            token1,
            pair,
            allPairs.length
        );
    }

    // =============================================================
    // SET PROTOCOL FEE RECEIVER
    // =============================================================

    function setFeeTo(
        address _feeTo
    ) external {
        require(
            msg.sender ==
                feeToSetter,
            "NumenDEX: FORBIDDEN"
        );

        feeTo =
            _feeTo;
    }

    // =============================================================
    // CHANGE FEE ADMIN
    // =============================================================

    function setFeeToSetter(
        address _feeToSetter
    ) external {
        require(
            msg.sender ==
                feeToSetter,
            "NumenDEX: FORBIDDEN"
        );

        require(
            _feeToSetter != address(0),
            "NumenDEX: ZERO_SETTER"
        );

        feeToSetter =
            _feeToSetter;
    }
}