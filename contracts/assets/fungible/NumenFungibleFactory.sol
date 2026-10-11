// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./NumenFungibleAsset.sol";

/**
 * @title NumenFungibleFactory
 * @notice Permissionless deployment factory for fungible assets
 *         in the Numen Asset Protocol.
 *
 * @dev
 * The factory is intentionally minimal.
 *
 * It does NOT:
 *
 * - own deployed assets,
 * - receive DEFAULT_ADMIN_ROLE,
 * - receive MINTER_ROLE,
 * - receive PAUSER_ROLE,
 * - receive METADATA_ROLE,
 * - control token balances,
 * - control token supply,
 * - control token metadata,
 * - control registry records.
 *
 * The factory only:
 *
 * 1. validates creator attribution,
 * 2. deploys NumenFungibleAsset,
 * 3. triggers canonical self-registration when configured,
 * 4. emits a discovery event.
 *
 * Asset discovery should be performed from
 * FungibleAssetCreated events and the Numen Asset Registry
 * instead of duplicating large enumerable state here.
 */
contract NumenFungibleFactory {
    // =============================================================
    //                            ERRORS
    // =============================================================

    error ZeroAddress();

    error CreatorMustBeCaller(
        address configuredCreator,
        address caller
    );

    // =============================================================
    //                            EVENTS
    // =============================================================

    /**
     * @notice Emitted after a fungible asset is successfully created.
     *
     * @param asset Address of the deployed ERC-20 asset.
     * @param assetId Registry-generated Numen Asset ID.
     *        Zero when registry integration is disabled.
     * @param creator Creator of the asset.
     * @param admin Initial asset administrator.
     * @param registry Configured Numen Asset Registry.
     */
    event FungibleAssetCreated(
        address indexed asset,
        bytes32 indexed assetId,
        address indexed creator,
        address admin,
        address registry
    );

    // =============================================================
    //                          CONSTANTS
    // =============================================================

    bytes32 private constant _FACTORY_VERSION =
        keccak256(
            "NUMEN_FUNGIBLE_FACTORY_V1"
        );

    // =============================================================
    //                       FACTORY VERSION
    // =============================================================

    /**
     * @notice Returns the factory implementation version.
     */
    function factoryVersion()
        external
        pure
        returns (bytes32)
    {
        return _FACTORY_VERSION;
    }

    // =============================================================
    //                         CREATE ASSET
    // =============================================================

    /**
     * @notice Creates a new Numen fungible asset.
     *
     * @dev
     * config.creator MUST equal msg.sender.
     *
     * This prevents someone from using the official Numen factory
     * to attribute a newly created asset to another wallet.
     *
     * Other authorities may intentionally be different addresses:
     *
     * - admin
     * - initialRecipient
     * - mintAuthority
     * - pauseAuthority
     * - metadataAuthority
     *
     * This supports multisigs, DAOs and operational wallets without
     * granting the factory any authority over the deployed asset.
     *
     * When config.registry is non-zero, registration is performed
     * atomically after deployment.
     *
     * The factory calls:
     *
     *     deployedAsset.registerNumenAsset()
     *
     * The deployed asset then calls the registry itself.
     *
     * Therefore NumenAssetRegistry observes:
     *
     *     msg.sender == assetContract
     *
     * If registration fails, the entire transaction reverts,
     * including contract deployment.
     *
     * @param config Complete asset configuration.
     *
     * @return asset Address of the newly deployed asset.
     * @return assetId Numen Asset ID, or bytes32(0) when no
     *         registry was configured.
     */
    function createFungibleAsset(
        NumenFungibleAsset.AssetConfig calldata config
    )
        external
        returns (
            address asset,
            bytes32 assetId
        )
    {
        // ---------------------------------------------------------
        // Creator validation
        // ---------------------------------------------------------

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

        // ---------------------------------------------------------
        // Asset deployment
        // ---------------------------------------------------------

        NumenFungibleAsset deployedAsset =
            new NumenFungibleAsset(
                config
            );

        asset =
            address(
                deployedAsset
            );

        // ---------------------------------------------------------
        // Canonical self-registration
        // ---------------------------------------------------------

        if (
            config.registry !=
            address(0)
        ) {
            assetId =
                deployedAsset
                    .registerNumenAsset();
        }

        // ---------------------------------------------------------
        // Discovery event
        // ---------------------------------------------------------

        emit FungibleAssetCreated(
            asset,
            assetId,
            config.creator,
            config.admin,
            config.registry
        );
    }
}