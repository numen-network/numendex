// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./NumenERC721Asset.sol";

/**
 * @title NumenERC721Factory
 * @notice Permissionless ERC-721 collection factory for the Numen Asset Protocol.
 *
 * Design principles:
 *
 * - Anyone may create their own collection.
 * - The configured creator must be msg.sender.
 * - The Factory does not become collection admin.
 * - The Factory does not receive mint authority.
 * - The Factory does not receive pause authority.
 * - The Factory does not receive metadata authority.
 * - The Factory cannot later mint, freeze, edit or control collections.
 *
 * If a Numen Asset Registry is configured, the collection is registered
 * atomically during creation.
 *
 * Registry identity:
 *
 *   (collectionAddress, CONTRACT, 0)
 *
 * Individual NFTs may later be registered separately as:
 *
 *   (collectionAddress, TOKEN, tokenId)
 */
contract NumenERC721Factory {
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

    event ERC721AssetCreated(
        address indexed asset,
        bytes32 indexed assetId,
        address indexed creator,
        address admin,
        address registry
    );

    // =============================================================
    // VERSION
    // =============================================================

    bytes32 private constant
        _FACTORY_VERSION =
            keccak256(
                "NUMEN_ERC721_FACTORY_V1"
            );

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
    // CREATE ERC721 ASSET
    // =============================================================

    /**
     * @notice Creates a new Numen ERC-721 collection.
     *
     * The creator must explicitly create their own collection.
     * This prevents another account from deploying a collection
     * while falsely claiming somebody else as its creator.
     *
     * If config.registry is non-zero:
     *
     * 1. Collection is deployed.
     * 2. Collection calls the Registry itself.
     * 3. Registry creates CONTRACT / 0 identity.
     * 4. Asset ID is stored inside the collection.
     * 5. Factory emits the final Asset ID.
     *
     * All of these operations happen in one transaction.
     *
     * If registration fails, deployment also reverts.
     */
    function createERC721Asset(
        NumenERC721Asset.AssetConfig
            calldata config
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

        NumenERC721Asset deployedAsset =
            new NumenERC721Asset(
                config
            );

        asset =
            address(deployedAsset);

        /*
         * Registry registration is optional.
         *
         * Zero registry allows deployment of a standalone
         * ERC-721 collection without Numen Registry registration.
         */
        if (
            config.registry !=
            address(0)
        ) {
            assetId =
                deployedAsset
                    .registerNumenCollection();
        }

        emit ERC721AssetCreated(
            asset,
            assetId,
            config.creator,
            config.admin,
            config.registry
        );
    }
}