// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/NumenAssetTypes.sol";

/**
 * @title INumenAsset
 * @notice Common interface for assets created or registered through
 *         the Numen Asset Protocol.
 *
 * @dev
 * This interface intentionally does not replace ERC-20, ERC-721,
 * or ERC-1155.
 *
 * Assets continue to implement their normal Ethereum standards.
 * INumenAsset adds a common Numen-facing identity layer so that
 * registries, explorers, indexers, wallets, and applications can
 * understand them through one protocol interface.
 *
 * A Numen asset may represent:
 *
 * - A standard fungible token
 * - A governance token
 * - A community token
 * - A fractional real-world asset
 * - An NFT
 * - A digital twin
 * - A product passport
 * - A certificate
 * - A collectible
 * - A physical-object reference
 * - Another registered asset type
 *
 * IMPORTANT:
 *
 * Registration as a Numen asset does NOT by itself prove:
 *
 * - physical authenticity,
 * - legal ownership,
 * - regulatory compliance,
 * - provenance,
 * - issuer legitimacy,
 * - or the truth of metadata.
 *
 * Those claims belong to separate object, attestation,
 * document, and verification layers.
 */
interface INumenAsset {
    // =============================================================
    //                            EVENTS
    // =============================================================

    /**
     * @notice Emitted when the asset metadata reference changes.
     */
    event NumenMetadataUpdated(
        string metadataURI,
        bytes32 metadataHash,
        address indexed updatedBy
    );

    /**
     * @notice Emitted when the asset's category or representation
     *         classification changes.
     */
    event NumenClassificationUpdated(
        NumenAssetTypes.AssetCategory category,
        NumenAssetTypes.RepresentationType representation,
        address indexed updatedBy
    );

    // =============================================================
    //                         PROTOCOL IDENTITY
    // =============================================================

    /**
     * @notice Returns the Numen Asset Protocol version implemented
     *         by this contract.
     *
     * @dev
     * Using a version identifier allows future protocol generations
     * to coexist without requiring old assets to be redeployed.
     */
    function numenAssetProtocolVersion()
        external
        pure
        returns (bytes32);

    /**
     * @notice Returns the registry-level Numen Asset ID.
     *
     * @dev
     * The registry is responsible for assigning the final assetId.
     * A newly deployed asset may temporarily return bytes32(0)
     * before registration is completed, depending on the deployment
     * flow used by its factory.
     */
    function numenAssetId()
        external
        view
        returns (bytes32);

    /**
     * @notice Returns the address that originally created the asset.
     *
     * @dev
     * Creator is historical information and should not be interpreted
     * as the current owner or administrator.
     */
    function numenCreator()
        external
        view
        returns (address);

    /**
     * @notice Returns the primary administrator of the asset.
     *
     * @dev
     * This may be:
     *
     * - an EOA,
     * - a multisig,
     * - a DAO,
     * - another contract,
     * - or address(0) for an immutable / renounced asset.
     *
     * The exact permissions associated with this address depend on
     * the implementation.
     */
    function numenAdmin()
        external
        view
        returns (address);

    // =============================================================
    //                       ASSET CLASSIFICATION
    // =============================================================

    /**
     * @notice Returns whether this is fundamentally a fungible or
     *         non-fungible asset.
     */
    function numenAssetClass()
        external
        view
        returns (NumenAssetTypes.AssetClass);

    /**
     * @notice Returns the technical token standard used by the asset.
     */
    function numenAssetStandard()
        external
        view
        returns (NumenAssetTypes.AssetStandard);

    /**
     * @notice Returns the semantic category of the asset.
     *
     * Examples:
     *
     * - UTILITY
     * - GOVERNANCE
     * - REAL_ESTATE
     * - PRECIOUS_STONE
     * - VEHICLE
     * - CULTURAL_HERITAGE
     */
    function numenAssetCategory()
        external
        view
        returns (NumenAssetTypes.AssetCategory);

    /**
     * @notice Returns what the token or asset record represents.
     *
     * Examples:
     *
     * - DIGITAL_ASSET
     * - DIGITAL_TWIN
     * - FRACTIONAL_INTEREST
     * - OWNERSHIP_CLAIM
     * - PRODUCT_PASSPORT
     */
    function numenRepresentation()
        external
        view
        returns (NumenAssetTypes.RepresentationType);

    // =============================================================
    //                            METADATA
    // =============================================================

    /**
     * @notice Returns the primary metadata URI.
     *
     * @dev
     * The URI may point to IPFS, HTTPS, Arweave, or another
     * application-supported storage system.
     */
    function numenMetadataURI()
        external
        view
        returns (string memory);

    /**
     * @notice Returns a cryptographic commitment to the metadata.
     *
     * @dev
     * This allows applications to detect metadata changes even when
     * the referenced data is stored outside the blockchain.
     */
    function numenMetadataHash()
        external
        view
        returns (bytes32);

    // =============================================================
    //                        CAPABILITY FLAGS
    // =============================================================

    /**
     * @notice Returns true when the asset supports minting after
     *         initial creation.
     */
    function numenMintable()
        external
        view
        returns (bool);

    /**
     * @notice Returns true when holders or authorized accounts can
     *         burn units of the asset.
     */
    function numenBurnable()
        external
        view
        returns (bool);

    /**
     * @notice Returns true when the asset includes pause capability.
     *
     * @dev
     * This does not indicate whether the asset is currently paused.
     */
    function numenPausable()
        external
        view
        returns (bool);

    /**
     * @notice Returns true when EIP-2612-style permit functionality
     *         is supported where applicable.
     *
     * @dev
     * Primarily relevant to fungible assets.
     */
    function numenPermitEnabled()
        external
        view
        returns (bool);

    /**
     * @notice Returns true when governance/voting functionality
     *         is supported.
     */
    function numenVotesEnabled()
        external
        view
        returns (bool);

    /**
     * @notice Returns true when the asset is intended to have
     *         physical / 3D object associations.
     *
     * @dev
     * This flag means "integration enabled", not
     * "physical authenticity verified".
     */
    function numenObjectBindingEnabled()
        external
        view
        returns (bool);

    // =============================================================
    //                     COMPLETE DESCRIPTOR
    // =============================================================

    /**
     * @notice Returns the asset's core Numen classification and
     *         metadata in a single call.
     *
     * @dev
     * This is useful for explorers, indexers, frontends, and other
     * applications that need a compact protocol-level description.
     */
    function numenAssetDescriptor()
        external
        view
        returns (
            bytes32 assetId,
            address creator,
            address admin,
            NumenAssetTypes.AssetClass assetClass,
            NumenAssetTypes.AssetStandard standard,
            NumenAssetTypes.AssetCategory category,
            NumenAssetTypes.RepresentationType representation,
            string memory metadataURI,
            bytes32 metadataHash,
            bool objectBindingEnabled
        );

    // =============================================================
    //                     ERC-165 STYLE DISCOVERY
    // =============================================================

    /**
     * @notice Returns true when the implementation supports the
     *         supplied interface identifier.
     *
     * @dev
     * Asset implementations may use ERC-165 directly or provide
     * compatible interface discovery.
     */
    function supportsInterface(bytes4 interfaceId)
        external
        view
        returns (bool);
}