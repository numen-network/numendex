// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockERC20 {
    string public name;
    string public symbol;

    uint8 public constant decimals = 18;

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;

    mapping(address => mapping(address => uint256))
        public allowance;

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value
    );

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 initialSupply
    ) {
        name = _name;
        symbol = _symbol;

        _mint(
            msg.sender,
            initialSupply
        );
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

    function approve(
        address spender,
        uint256 value
    ) external returns (bool) {
        allowance[msg.sender][spender] =
            value;

        emit Approval(
            msg.sender,
            spender,
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
                currentAllowance -
                value;

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

    function mint(
        address to,
        uint256 value
    ) external {
        _mint(
            to,
            value
        );
    }

    function _transfer(
        address from,
        address to,
        uint256 value
    ) internal {
        require(
            from != address(0),
            "MockERC20: FROM_ZERO"
        );

        require(
            to != address(0),
            "MockERC20: TO_ZERO"
        );

        require(
            balanceOf[from] >= value,
            "MockERC20: INSUFFICIENT_BALANCE"
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
    ) internal {
        require(
            to != address(0),
            "MockERC20: MINT_TO_ZERO"
        );

        totalSupply += value;
        balanceOf[to] += value;

        emit Transfer(
            address(0),
            to,
            value
        );
    }
}