// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./NumenERC1155Asset.sol";

/**
 * @title NumenERC1155Factory
 * @notice Permissionless ERC-1155 collection factory for the
 *         Numen Asset Protocol.
 *
 * Design principles:
 *
 * - Anyone may create their own ERC1155 collection.
 * - The configured creator must be msg.sender.
 * - The Factory never becomes collection admin.
 * - The Factory receives no mint authority.
 * - The Factory receives no pause authority.
 * - The Factory receives no metadata authority.
 * - The Factory cannot later mint, freeze, edit or control assets.
 *
 * Registry model:
 *
 * Collection:
 *   (collectionAddress, CONTRACT, 0)
 *
 * Individual ERC1155 token type:
 *   (collectionAddress, TOKEN, tokenId)
 *
 * If a Registry is configured, collection registration happens
 * atomically in the same transaction as deployment.
 */
contract NumenERC1155Factory {
    // =============================================================
    // ERRORS
    // =============================================================

    error ZeroAddress();

    error CreatorMustBeCaller(
        address configuredCreator,
        address caller
    );

    // =============================================================
    // EVENTS
    // =============================================================

    event ERC1155AssetCreated(
        address indexed asset,
        bytes32 indexed assetId,
        address indexed creator,
        address admin,
        address registry
    );

    // =============================================================
    // VERSION
    // =============================================================

    bytes32 private constant _FACTORY_VERSION =
        keccak256("NUMEN_ERC1155_FACTORY_V1");

    // =============================================================
    // VERSION GETTER
    // =============================================================

    function factoryVersion()
        external
        pure
        returns (bytes32)
    {
        return _FACTORY_VERSION;
    }

    // =============================================================
    // CREATE ERC1155 ASSET
    // =============================================================

    /**
     * @notice Creates a new Numen ERC1155 collection.
     *
     * The creator must be the transaction sender.
     *
     * This prevents a caller from creating a collection while
     * falsely assigning another wallet as its creator.
     *
     * If config.registry != address(0):
     *
     * 1. ERC1155 collection is deployed.
     * 2. The collection calls Registry itself.
     * 3. Registry creates:
     *
     *      (collectionAddress, CONTRACT, 0)
     *
     * 4. Registry returns the Asset ID.
     * 5. Collection stores the Asset ID.
     * 6. Factory emits the Asset ID.
     *
     * The process is atomic. If registration fails, the entire
     * transaction, including deployment, reverts.
     *
     * If registry == address(0), a standalone ERC1155 collection
     * is created without Registry registration.
     */
    function createERC1155Asset(
        NumenERC1155Asset.AssetConfig calldata config
    )
        external
        returns (
            address asset,
            bytes32 assetId
        )
    {
        if (
            config.creator ==
            address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            config.creator !=
            msg.sender
        ) {
            revert CreatorMustBeCaller(
                config.creator,
                msg.sender
            );
        }

        NumenERC1155Asset deployedAsset =
            new NumenERC1155Asset(
                config
            );

        asset =
            address(deployedAsset);

        /*
         * Registry registration is optional.
         *
         * When configured, registration is performed by the
         * newly deployed collection itself.
         *
         * The Factory therefore does not need any privileged
         * Registry role.
         */
        if (
            config.registry !=
            address(0)
        ) {
            assetId =
                deployedAsset
                    .registerNumenCollection();
        }

        emit ERC1155AssetCreated(
            asset,
            assetId,
            config.creator,
            config.admin,
            config.registry
        );
    }
}