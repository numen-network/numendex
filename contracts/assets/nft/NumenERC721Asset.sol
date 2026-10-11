// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../interfaces/INumenAssetRegistry.sol";
import "../libraries/NumenAssetTypes.sol";

/**
 * @title NumenERC721Asset
 * @notice ERC-721 collection implementation for the Numen Asset Protocol.
 *
 * Registry identities:
 *
 * Collection:
 *   (address(this), CONTRACT, 0)
 *
 * Individual NFT:
 *   (address(this), TOKEN, tokenId)
 *
 * These identities are intentionally separate.
 *
 * V2 lifecycle model:
 *
 * - A tokenId can be created only once during the lifetime of this contract.
 * - Burning does not make the tokenId reusable.
 * - totalMinted is lifetime issuance, not current circulating supply.
 * - Token metadata is retained after burn as historical protocol data.
 * - A registered token's Numen Asset ID is retained after burn.
 *
 * Registry metadata is a registration snapshot/reference.
 * Live token metadata is maintained by this contract.
 *
 * IMPORTANT:
 * Numen registration does not by itself prove:
 *
 * - physical authenticity,
 * - legal ownership,
 * - provenance,
 * - manufacturer identity,
 * - custody,
 * - physical existence.
 *
 * Those claims belong to other protocol layers such as:
 *
 * - Object Registry
 * - Object Binding
 * - Attestation Registry
 * - Document Registry
 * - Provenance Registry
 */
contract NumenERC721Asset is
    ERC721,
    ERC721Burnable,
    ERC721Pausable,
    AccessControl
{
    using Strings for uint256;

    // =============================================================
    // ROLES
    // =============================================================

    bytes32 public constant MINTER_ROLE =
        keccak256("MINTER_ROLE");

    bytes32 public constant PAUSER_ROLE =
        keccak256("PAUSER_ROLE");

    bytes32 public constant METADATA_ROLE =
        keccak256("METADATA_ROLE");

    // =============================================================
    // ERRORS
    // =============================================================

    error ZeroAddress();

    error MintingDisabled();

    error BurningDisabled();

    error PausingDisabled();

    error RegistryNotConfigured();

    error CollectionAlreadyRegistered();

    error TokenAlreadyRegistered(
        uint256 tokenId
    );

    error TokenDoesNotExist(
        uint256 tokenId
    );

    error TokenNeverCreated(
        uint256 tokenId
    );

    error TokenIdAlreadyUsed(
        uint256 tokenId
    );

    error RegistryReturnedInvalidAssetId();

    error MaximumSupplyExceeded();

    error EmptyTokenURI();

    // =============================================================
    // EVENTS
    // =============================================================

    event NumenCollectionRegistered(
        bytes32 indexed assetId,
        address indexed registry,
        address indexed triggeredBy
    );

    event NumenTokenRegistered(
        uint256 indexed tokenId,
        bytes32 indexed assetId,
        address indexed triggeredBy
    );

    event CollectionMetadataUpdated(
        string metadataURI,
        bytes32 metadataHash,
        address indexed updatedBy
    );

    event TokenMetadataUpdated(
        uint256 indexed tokenId,
        string tokenURI,
        bytes32 metadataHash,
        address indexed updatedBy
    );

    event ClassificationUpdated(
        NumenAssetTypes.AssetCategory category,
        NumenAssetTypes.RepresentationType representation,
        address indexed updatedBy
    );

    event BaseURIUpdated(
        string baseURI,
        address indexed updatedBy
    );

    event NumenTokenCreated(
        uint256 indexed tokenId,
        address indexed to,
        string tokenURI,
        bytes32 metadataHash
    );

    event NumenTokenBurned(
        uint256 indexed tokenId,
        address indexed burnedBy
    );

    // =============================================================
    // CONFIG
    // =============================================================

    struct AssetConfig {
        string name;
        string symbol;

        uint256 maxSupply;

        bool mintable;
        bool burnable;
        bool pausable;
        bool objectBindingEnabled;

        NumenAssetTypes.AssetCategory category;

        NumenAssetTypes.RepresentationType representation;

        string metadataURI;
        bytes32 metadataHash;

        string baseURI;

        address creator;
        address admin;

        address mintAuthority;
        address pauseAuthority;
        address metadataAuthority;

        address registry;
    }

    // =============================================================
    // IMMUTABLE / CORE STATE
    // =============================================================

    address private immutable _numenCreator;

    address private immutable _initialAdmin;

    address private immutable _registryController;

    INumenAssetRegistry private immutable _numenRegistry;

    bool private immutable _mintable;

    bool private immutable _burnable;

    bool private immutable _pausable;

    bool private immutable _objectBindingEnabled;

    uint256 private immutable _maximumSupply;

    // =============================================================
    // COLLECTION STATE
    // =============================================================

    bytes32 private _collectionAssetId;

    NumenAssetTypes.AssetCategory
        private _category;

    NumenAssetTypes.RepresentationType
        private _representation;

    string private _metadataURI;

    bytes32 private _metadataHash;

    string private _baseTokenURI;

    /**
     * @dev Lifetime number of NFTs minted.
     *
     * Burning does not decrease this value.
     */
    uint256 private _totalMinted;

    // =============================================================
    // TOKEN LIFECYCLE STATE
    // =============================================================

    /**
     * @dev Permanent token identity marker.
     *
     * Once true, it never becomes false.
     *
     * This prevents a burned tokenId from being recreated.
     */
    mapping(uint256 => bool)
        private _tokenEverMinted;

    // =============================================================
    // TOKEN REGISTRY / METADATA STATE
    // =============================================================

    mapping(uint256 => bytes32)
        private _tokenAssetIds;

    mapping(uint256 => string)
        private _tokenURIs;

    mapping(uint256 => bytes32)
        private _tokenMetadataHashes;

    // =============================================================
    // CONSTANTS
    // =============================================================

    NumenAssetTypes.AssetScope
        private constant _COLLECTION_SCOPE =
            NumenAssetTypes.AssetScope.CONTRACT;

    NumenAssetTypes.AssetScope
        private constant _TOKEN_SCOPE =
            NumenAssetTypes.AssetScope.TOKEN;

    uint256 private constant
        _COLLECTION_TOKEN_ID = 0;

    bytes32 private constant
        _PROTOCOL_ID =
            keccak256(
                "NUMEN_ASSET_PROTOCOL"
            );

    bytes32 private constant
        _IMPLEMENTATION_VERSION =
            keccak256(
                "NUMEN_ERC721_ASSET_V2"
            );

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    constructor(
        AssetConfig memory config
    )
        ERC721(
            config.name,
            config.symbol
        )
    {
        if (
            config.creator == address(0) ||
            config.admin == address(0) ||
            config.metadataAuthority ==
                address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            config.mintable &&
            config.mintAuthority ==
                address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            config.pausable &&
            config.pauseAuthority ==
                address(0)
        ) {
            revert ZeroAddress();
        }

        _numenCreator =
            config.creator;

        _initialAdmin =
            config.admin;

        _registryController =
            config.admin;

        _numenRegistry =
            INumenAssetRegistry(
                config.registry
            );

        _mintable =
            config.mintable;

        _burnable =
            config.burnable;

        _pausable =
            config.pausable;

        _objectBindingEnabled =
            config.objectBindingEnabled;

        _maximumSupply =
            config.maxSupply;

        _category =
            config.category;

        _representation =
            config.representation;

        _metadataURI =
            config.metadataURI;

        _metadataHash =
            config.metadataHash;

        _baseTokenURI =
            config.baseURI;

        _grantRole(
            DEFAULT_ADMIN_ROLE,
            config.admin
        );

        _grantRole(
            METADATA_ROLE,
            config.metadataAuthority
        );

        if (config.mintable) {
            _grantRole(
                MINTER_ROLE,
                config.mintAuthority
            );
        }

        if (config.pausable) {
            _grantRole(
                PAUSER_ROLE,
                config.pauseAuthority
            );
        }
    }

    // =============================================================
    // NUMEN PROTOCOL INFORMATION
    // =============================================================

    function numenProtocolId()
        external
        pure
        returns (bytes32)
    {
        return _PROTOCOL_ID;
    }

    function numenImplementationVersion()
        external
        pure
        returns (bytes32)
    {
        return _IMPLEMENTATION_VERSION;
    }

    function numenCreator()
        external
        view
        returns (address)
    {
        return _numenCreator;
    }

    function numenAdmin()
        external
        view
        returns (address)
    {
        return _initialAdmin;
    }

    function numenRegistry()
        external
        view
        returns (address)
    {
        return address(
            _numenRegistry
        );
    }

    function initialRegistryController()
        external
        view
        returns (address)
    {
        return _registryController;
    }

    // =============================================================
    // ASSET CLASSIFICATION
    // =============================================================

    function numenAssetClass()
        external
        pure
        returns (
            NumenAssetTypes.AssetClass
        )
    {
        return
            NumenAssetTypes
                .AssetClass
                .NON_FUNGIBLE;
    }

    function numenAssetStandard()
        external
        pure
        returns (
            NumenAssetTypes.AssetStandard
        )
    {
        return
            NumenAssetTypes
                .AssetStandard
                .ERC721;
    }

    function numenAssetCategory()
        external
        view
        returns (
            NumenAssetTypes.AssetCategory
        )
    {
        return _category;
    }

    function numenRepresentation()
        external
        view
        returns (
            NumenAssetTypes
                .RepresentationType
        )
    {
        return _representation;
    }

    function numenCollectionScope()
        external
        pure
        returns (
            NumenAssetTypes.AssetScope
        )
    {
        return _COLLECTION_SCOPE;
    }

    function numenTokenScope()
        external
        pure
        returns (
            NumenAssetTypes.AssetScope
        )
    {
        return _TOKEN_SCOPE;
    }

    // =============================================================
    // FEATURES
    // =============================================================

    function numenMintable()
        external
        view
        returns (bool)
    {
        return _mintable;
    }

    function numenBurnable()
        external
        view
        returns (bool)
    {
        return _burnable;
    }

    function numenPausable()
        external
        view
        returns (bool)
    {
        return _pausable;
    }

    function numenObjectBindingEnabled()
        external
        view
        returns (bool)
    {
        return
            _objectBindingEnabled;
    }

    function maximumSupply()
        external
        view
        returns (uint256)
    {
        return _maximumSupply;
    }

    /**
     * @notice Lifetime number of NFTs minted.
     *
     * Burning does not reduce this value.
     */
    function totalMinted()
        external
        view
        returns (uint256)
    {
        return _totalMinted;
    }

    /**
     * @notice Returns true if this tokenId has ever been minted.
     *
     * This remains true after burn.
     */
    function tokenEverMinted(
        uint256 tokenId
    )
        external
        view
        returns (bool)
    {
        return
            _tokenEverMinted[
                tokenId
            ];
    }

    /**
     * @notice Returns true only while the ERC721 token currently exists.
     */
    function tokenExists(
        uint256 tokenId
    )
        external
        view
        returns (bool)
    {
        return _tokenExists(
            tokenId
        );
    }

    // =============================================================
    // COLLECTION METADATA
    // =============================================================

    function numenMetadataURI()
        external
        view
        returns (string memory)
    {
        return _metadataURI;
    }

    function numenMetadataHash()
        external
        view
        returns (bytes32)
    {
        return _metadataHash;
    }

    function setNumenMetadata(
        string calldata metadataURI,
        bytes32 metadataHash
    )
        external
        onlyRole(METADATA_ROLE)
    {
        _metadataURI =
            metadataURI;

        _metadataHash =
            metadataHash;

        emit CollectionMetadataUpdated(
            metadataURI,
            metadataHash,
            msg.sender
        );
    }

    function setNumenClassification(
        NumenAssetTypes.AssetCategory
            category,
        NumenAssetTypes
            .RepresentationType
            representation
    )
        external
        onlyRole(METADATA_ROLE)
    {
        _category =
            category;

        _representation =
            representation;

        emit ClassificationUpdated(
            category,
            representation,
            msg.sender
        );
    }

    // =============================================================
    // TOKEN URI / METADATA
    // =============================================================

    function setBaseURI(
        string calldata newBaseURI
    )
        external
        onlyRole(METADATA_ROLE)
    {
        _baseTokenURI =
            newBaseURI;

        emit BaseURIUpdated(
            newBaseURI,
            msg.sender
        );
    }

    function baseURI()
        external
        view
        returns (string memory)
    {
        return _baseTokenURI;
    }

    /**
     * @notice Updates token-specific metadata.
     *
     * V2 allows historical metadata to remain manageable after burn.
     * Therefore this checks permanent token identity rather than current
     * ERC721 ownership/existence.
     */
    function setTokenMetadata(
        uint256 tokenId,
        string calldata newTokenURI,
        bytes32 metadataHash
    )
        external
        onlyRole(METADATA_ROLE)
    {
        if (
            !_tokenEverMinted[tokenId]
        ) {
            revert TokenNeverCreated(
                tokenId
            );
        }

        if (
            bytes(newTokenURI).length ==
            0
        ) {
            revert EmptyTokenURI();
        }

        _tokenURIs[tokenId] =
            newTokenURI;

        _tokenMetadataHashes[
            tokenId
        ] = metadataHash;

        emit TokenMetadataUpdated(
            tokenId,
            newTokenURI,
            metadataHash,
            msg.sender
        );
    }

    /**
     * @notice Returns metadata hash for a token that has existed.
     *
     * Remains readable after burn.
     */
    function tokenMetadataHash(
        uint256 tokenId
    )
        external
        view
        returns (bytes32)
    {
        if (
            !_tokenEverMinted[tokenId]
        ) {
            revert TokenNeverCreated(
                tokenId
            );
        }

        return
            _tokenMetadataHashes[
                tokenId
            ];
    }

    /**
     * @notice Standard ERC721 tokenURI.
     *
     * As required by normal ERC721 semantics, this only works for
     * currently existing tokens.
     */
    function tokenURI(
        uint256 tokenId
    )
        public
        view
        override
        returns (string memory)
    {
        if (!_tokenExists(tokenId)) {
            revert TokenDoesNotExist(
                tokenId
            );
        }

        return
            _resolvedTokenURI(
                tokenId
            );
    }

    /**
     * @notice Returns the historical metadata URI of any tokenId that
     *         has ever existed, including a burned token.
     */
    function historicalTokenURI(
        uint256 tokenId
    )
        external
        view
        returns (string memory)
    {
        if (
            !_tokenEverMinted[tokenId]
        ) {
            revert TokenNeverCreated(
                tokenId
            );
        }

        return
            _resolvedTokenURI(
                tokenId
            );
    }

    // =============================================================
    // MINT
    // =============================================================

    function mint(
        address to,
        uint256 tokenId,
        string calldata tokenURI_,
        bytes32 metadataHash
    )
        external
        onlyRole(MINTER_ROLE)
    {
        if (!_mintable) {
            revert MintingDisabled();
        }

        if (to == address(0)) {
            revert ZeroAddress();
        }

        /*
         * Permanent token identity:
         * a tokenId can never be reused, even after burn.
         */
        if (
            _tokenEverMinted[tokenId]
        ) {
            revert TokenIdAlreadyUsed(
                tokenId
            );
        }

        /*
         * maxSupply is a lifetime issuance cap.
         * Burning does not restore minting capacity.
         */
        if (
            _maximumSupply != 0 &&
            _totalMinted + 1 >
                _maximumSupply
        ) {
            revert MaximumSupplyExceeded();
        }

        /*
         * Set permanent identity before _safeMint.
         *
         * If _safeMint reverts, the entire transaction reverts and
         * this flag is rolled back automatically.
         */
        _tokenEverMinted[tokenId] =
            true;

        unchecked {
            ++_totalMinted;
        }

        if (
            bytes(tokenURI_).length >
            0
        ) {
            _tokenURIs[tokenId] =
                tokenURI_;
        }

        _tokenMetadataHashes[
            tokenId
        ] = metadataHash;

        _safeMint(
            to,
            tokenId
        );

        emit NumenTokenCreated(
            tokenId,
            to,
            tokenURI_,
            metadataHash
        );
    }

    // =============================================================
    // BURN
    // =============================================================

    function burn(
        uint256 tokenId
    )
        public
        override
    {
        if (!_burnable) {
            revert BurningDisabled();
        }

        /*
         * ERC721Burnable performs the ownership / approval checks.
         *
         * We intentionally do NOT delete:
         *
         * - _tokenEverMinted
         * - _tokenURIs
         * - _tokenMetadataHashes
         * - _tokenAssetIds
         *
         * These form part of the token's historical protocol identity.
         */
        super.burn(tokenId);

        emit NumenTokenBurned(
            tokenId,
            msg.sender
        );
    }

    // =============================================================
    // PAUSE
    // =============================================================

    function pause()
        external
        onlyRole(PAUSER_ROLE)
    {
        if (!_pausable) {
            revert PausingDisabled();
        }

        _pause();
    }

    function unpause()
        external
        onlyRole(PAUSER_ROLE)
    {
        if (!_pausable) {
            revert PausingDisabled();
        }

        _unpause();
    }

    // =============================================================
    // COLLECTION REGISTRATION
    // =============================================================

    function numenAssetId()
        external
        view
        returns (bytes32)
    {
        return _collectionAssetId;
    }

    function isNumenRegistered()
        external
        view
        returns (bool)
    {
        return
            _collectionAssetId !=
            bytes32(0);
    }

    /**
     * @notice Registers the ERC721 collection itself.
     *
     * Identity:
     *
     *   (address(this), CONTRACT, 0)
     *
     * Anyone may trigger registration.
     *
     * The caller cannot choose creator, controller, classification
     * or metadata.
     */
    function registerNumenCollection()
        public
        returns (bytes32 assetId)
    {
        if (
            address(_numenRegistry) ==
            address(0)
        ) {
            revert RegistryNotConfigured();
        }

        if (
            _collectionAssetId !=
            bytes32(0)
        ) {
            revert CollectionAlreadyRegistered();
        }

        INumenAssetRegistry
            .RegisterAssetRequest
            memory request =
                INumenAssetRegistry
                    .RegisterAssetRequest({
                        assetClass:
                            NumenAssetTypes
                                .AssetClass
                                .NON_FUNGIBLE,

                        standard:
                            NumenAssetTypes
                                .AssetStandard
                                .ERC721,

                        scope:
                            _COLLECTION_SCOPE,

                        category:
                            _category,

                        representation:
                            _representation,

                        assetContract:
                            address(this),

                        tokenId:
                            _COLLECTION_TOKEN_ID,

                        creator:
                            _numenCreator,

                        controller:
                            _registryController,

                        metadataURI:
                            _metadataURI,

                        metadataHash:
                            _metadataHash
                    });

        assetId =
            _numenRegistry
                .registerAsset(
                    request
                );

        if (
            assetId ==
            bytes32(0)
        ) {
            revert RegistryReturnedInvalidAssetId();
        }

        _collectionAssetId =
            assetId;

        emit NumenCollectionRegistered(
            assetId,
            address(
                _numenRegistry
            ),
            msg.sender
        );
    }

    // =============================================================
    // TOKEN REGISTRATION
    // =============================================================

    function numenTokenAssetId(
        uint256 tokenId
    )
        external
        view
        returns (bytes32)
    {
        return
            _tokenAssetIds[
                tokenId
            ];
    }

    function isNumenTokenRegistered(
        uint256 tokenId
    )
        external
        view
        returns (bool)
    {
        return
            _tokenAssetIds[
                tokenId
            ] != bytes32(0);
    }

    /**
     * @notice Registers an individual NFT.
     *
     * Identity:
     *
     *   (address(this), TOKEN, tokenId)
     *
     * Registration remains optional.
     *
     * V2 deliberately allows a historically valid token to be
     * registered even after it has been burned. This preserves the
     * distinction between:
     *
     * - "this token identity never existed"
     * - "this token identity existed and was later burned"
     *
     * Registry metadata is a snapshot/reference at registration time.
     */
    function registerNumenToken(
        uint256 tokenId
    )
        external
        returns (bytes32 assetId)
    {
        if (
            address(_numenRegistry) ==
            address(0)
        ) {
            revert RegistryNotConfigured();
        }

        if (
            !_tokenEverMinted[tokenId]
        ) {
            revert TokenNeverCreated(
                tokenId
            );
        }

        if (
            _tokenAssetIds[tokenId] !=
            bytes32(0)
        ) {
            revert TokenAlreadyRegistered(
                tokenId
            );
        }

        string memory uri =
            _resolvedTokenURI(
                tokenId
            );

        bytes32 metadataHash =
            _tokenMetadataHashes[
                tokenId
            ];

        INumenAssetRegistry
            .RegisterAssetRequest
            memory request =
                INumenAssetRegistry
                    .RegisterAssetRequest({
                        assetClass:
                            NumenAssetTypes
                                .AssetClass
                                .NON_FUNGIBLE,

                        standard:
                            NumenAssetTypes
                                .AssetStandard
                                .ERC721,

                        scope:
                            _TOKEN_SCOPE,

                        category:
                            _category,

                        representation:
                            _representation,

                        assetContract:
                            address(this),

                        tokenId:
                            tokenId,

                        creator:
                            _numenCreator,

                        controller:
                            _registryController,

                        metadataURI:
                            uri,

                        metadataHash:
                            metadataHash
                    });

        assetId =
            _numenRegistry
                .registerAsset(
                    request
                );

        if (
            assetId ==
            bytes32(0)
        ) {
            revert RegistryReturnedInvalidAssetId();
        }

        _tokenAssetIds[
            tokenId
        ] = assetId;

        emit NumenTokenRegistered(
            tokenId,
            assetId,
            msg.sender
        );
    }

    // =============================================================
    // INTERNAL
    // =============================================================

    /**
     * @dev Current ERC721 existence.
     *
     * False after burn.
     */
    function _tokenExists(
        uint256 tokenId
    )
        internal
        view
        returns (bool)
    {
        return
            _ownerOf(tokenId) !=
            address(0);
    }

    /**
     * @dev Resolves metadata without requiring current ERC721 existence.
     *
     * Used for historical reads and Registry registration.
     */
    function _resolvedTokenURI(
        uint256 tokenId
    )
        internal
        view
        returns (string memory)
    {
        string memory explicitURI =
            _tokenURIs[tokenId];

        if (
            bytes(explicitURI).length >
            0
        ) {
            return explicitURI;
        }

        string memory base =
            _baseTokenURI;

        if (
            bytes(base).length == 0
        ) {
            return "";
        }

        return
            string.concat(
                base,
                tokenId.toString()
            );
    }

    function _baseURI()
        internal
        view
        override
        returns (string memory)
    {
        return _baseTokenURI;
    }

    // =============================================================
    // ERC721 / PAUSABLE
    // =============================================================

    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        override(
            ERC721,
            ERC721Pausable
        )
        returns (address)
    {
        return
            super._update(
                to,
                tokenId,
                auth
            );
    }

    // =============================================================
    // ERC165
    // =============================================================

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            ERC721,
            AccessControl
        )
        returns (bool)
    {
        return
            super.supportsInterface(
                interfaceId
            );
    }
}