// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "../interfaces/INumenAssetRegistry.sol";
import "../libraries/NumenAssetTypes.sol";

/**
 * @title NumenERC1155Asset
 * @notice Professional ERC1155 implementation for Numen Asset Protocol.
 *
 * DESIGN PRINCIPLES
 * =============================================================
 *
 * 1. Token type identity is permanent.
 *
 *    Once a tokenId is created, it remains a known token type even
 *    when its circulating supply becomes zero.
 *
 * 2. Maximum supply is based on lifetime issuance.
 *
 *    Burning tokens does NOT restore mint capacity.
 *
 * 3. Metadata authority is separated from mint authority.
 *
 *    MINTER_ROLE cannot modify metadata of an existing token type.
 *
 * 4. Duplicate IDs are rejected in batch mint operations.
 *
 *    This prevents supply-cap bypass through repeated tokenIds.
 *
 * 5. Registry identity and ERC1155 token identity remain separate.
 *
 *    Collection:
 *        AssetScope.CONTRACT / tokenId 0
 *
 *    Individual token type:
 *        AssetScope.TOKEN / actual tokenId
 *
 * 6. The Factory receives no authority over deployed assets.
 */
contract NumenERC1155Asset is
    ERC1155,
    ERC1155Burnable,
    ERC1155Pausable,
    ERC1155Supply,
    AccessControl
{
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

    error TokenTypeAlreadyExists(
        uint256 tokenId
    );

    error RegistryReturnedInvalidAssetId();

    error InvalidAmount();

    error EmptyTokenURI();

    error ArrayLengthMismatch();

    error DuplicateTokenId(
        uint256 tokenId
    );

    error MaximumSupplyExceeded(
        uint256 tokenId,
        uint256 maxSupply
    );

    error InvalidMaximumSupply(
        uint256 tokenId,
        uint256 maxSupply,
        uint256 initialAmount
    );

    // =============================================================
    // EVENTS
    // =============================================================

    event NumenCollectionRegistered(
        bytes32 indexed assetId,
        address indexed registry
    );

    event NumenTokenRegistered(
        uint256 indexed tokenId,
        bytes32 indexed assetId,
        address indexed registry
    );

    event TokenTypeCreated(
        uint256 indexed tokenId,
        uint256 initialAmount,
        uint256 maxSupply,
        string tokenURI,
        bytes32 metadataHash
    );

    event CollectionMetadataUpdated(
        string metadataURI,
        bytes32 metadataHash
    );

    event TokenMetadataUpdated(
        uint256 indexed tokenId,
        string tokenURI,
        bytes32 metadataHash
    );

    event ClassificationUpdated(
        NumenAssetTypes.AssetCategory category,
        NumenAssetTypes.RepresentationType representation
    );

    event BaseURIUpdated(
        string baseURI
    );

    // =============================================================
    // CONFIG
    // =============================================================

    struct AssetConfig {
        string baseURI;

        bool mintable;
        bool burnable;
        bool pausable;
        bool objectBindingEnabled;

        NumenAssetTypes.AssetCategory category;

        NumenAssetTypes.RepresentationType representation;

        string metadataURI;
        bytes32 metadataHash;

        address creator;
        address admin;

        address mintAuthority;
        address pauseAuthority;
        address metadataAuthority;

        address registry;
    }

    // =============================================================
    // CONSTANTS
    // =============================================================

    bytes32 private constant
        _PROTOCOL_ID =
            keccak256(
                "NUMEN_ASSET_PROTOCOL"
            );

    bytes32 private constant
        _ASSET_VERSION =
            keccak256(
                "NUMEN_ERC1155_ASSET_V2"
            );

    // =============================================================
    // IMMUTABLE CONFIGURATION
    // =============================================================

    address public immutable creator;

    address public immutable initialAdmin;

    address public immutable registryController;

    INumenAssetRegistry public immutable registry;

    bool public immutable mintable;

    bool public immutable burnable;

    bool public immutable pausable;

    bool public immutable objectBindingEnabled;

    // =============================================================
    // COLLECTION STATE
    // =============================================================

    bytes32 public collectionAssetId;

    NumenAssetTypes.AssetCategory
        private _category;

    NumenAssetTypes.RepresentationType
        private _representation;

    string private _collectionMetadataURI;

    bytes32 private _collectionMetadataHash;

    string private _baseTokenURI;

    // =============================================================
    // TOKEN TYPE STATE
    // =============================================================

    mapping(
        uint256 => bool
    )
        private _tokenTypeCreated;

    mapping(
        uint256 => uint256
    )
        private _tokenTotalMinted;

    mapping(
        uint256 => uint256
    )
        private _tokenMaxSupply;

    mapping(
        uint256 => string
    )
        private _tokenURIs;

    mapping(
        uint256 => bytes32
    )
        private _tokenMetadataHashes;

    mapping(
        uint256 => bytes32
    )
        public tokenAssetIds;

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    constructor(
        AssetConfig memory config
    )
        ERC1155(config.baseURI)
    {
        if (
            config.creator ==
                address(0) ||
            config.admin ==
                address(0) ||
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

        creator =
            config.creator;

        initialAdmin =
            config.admin;

        registryController =
            config.admin;

        registry =
            INumenAssetRegistry(
                config.registry
            );

        mintable =
            config.mintable;

        burnable =
            config.burnable;

        pausable =
            config.pausable;

        objectBindingEnabled =
            config.objectBindingEnabled;

        _category =
            config.category;

        _representation =
            config.representation;

        _collectionMetadataURI =
            config.metadataURI;

        _collectionMetadataHash =
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

        if (
            config.mintable
        ) {
            _grantRole(
                MINTER_ROLE,
                config.mintAuthority
            );
        }

        if (
            config.pausable
        ) {
            _grantRole(
                PAUSER_ROLE,
                config.pauseAuthority
            );
        }
    }

    // =============================================================
    // PROTOCOL INFORMATION
    // =============================================================

    function protocolId()
        external
        pure
        returns (bytes32)
    {
        return _PROTOCOL_ID;
    }

    function assetVersion()
        external
        pure
        returns (bytes32)
    {
        return _ASSET_VERSION;
    }

    function assetCreator()
        external
        view
        returns (address)
    {
        return creator;
    }

    function assetAdmin()
        external
        view
        returns (address)
    {
        return initialAdmin;
    }

    function assetRegistry()
        external
        view
        returns (address)
    {
        return address(registry);
    }

    function assetRegistryController()
        external
        view
        returns (address)
    {
        return registryController;
    }

    // =============================================================
    // CLASSIFICATION
    // =============================================================

    function assetClass()
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

    function assetStandard()
        external
        pure
        returns (
            NumenAssetTypes.AssetStandard
        )
    {
        return
            NumenAssetTypes
                .AssetStandard
                .ERC1155;
    }

    function category()
        external
        view
        returns (
            NumenAssetTypes.AssetCategory
        )
    {
        return _category;
    }

    function representation()
        external
        view
        returns (
            NumenAssetTypes
                .RepresentationType
        )
    {
        return _representation;
    }

    function setClassification(
        NumenAssetTypes.AssetCategory
            category_,
        NumenAssetTypes.RepresentationType
            representation_
    )
        external
        onlyRole(METADATA_ROLE)
    {
        _category =
            category_;

        _representation =
            representation_;

        emit ClassificationUpdated(
            category_,
            representation_
        );
    }

    // =============================================================
    // FEATURES
    // =============================================================

    function features()
        external
        view
        returns (
            bool mintable_,
            bool burnable_,
            bool pausable_,
            bool objectBindingEnabled_
        )
    {
        return (
            mintable,
            burnable,
            pausable,
            objectBindingEnabled
        );
    }

    // =============================================================
    // COLLECTION METADATA
    // =============================================================

    function collectionMetadata()
        external
        view
        returns (
            string memory metadataURI,
            bytes32 metadataHash
        )
    {
        return (
            _collectionMetadataURI,
            _collectionMetadataHash
        );
    }

    function setCollectionMetadata(
        string calldata metadataURI_,
        bytes32 metadataHash_
    )
        external
        onlyRole(METADATA_ROLE)
    {
        _collectionMetadataURI =
            metadataURI_;

        _collectionMetadataHash =
            metadataHash_;

        emit CollectionMetadataUpdated(
            metadataURI_,
            metadataHash_
        );
    }

    // =============================================================
    // BASE URI
    // =============================================================

    function baseURI()
        external
        view
        returns (string memory)
    {
        return _baseTokenURI;
    }

    function setBaseURI(
        string calldata baseURI_
    )
        external
        onlyRole(METADATA_ROLE)
    {
        _baseTokenURI =
            baseURI_;

        _setURI(
            baseURI_
        );

        emit BaseURIUpdated(
            baseURI_
        );
    }

    // =============================================================
    // TOKEN TYPE INFORMATION
    // =============================================================

    function tokenTypeExists(
        uint256 tokenId
    )
        public
        view
        returns (bool)
    {
        return
            _tokenTypeCreated[
                tokenId
            ];
    }

    function tokenTotalMinted(
        uint256 tokenId
    )
        external
        view
        returns (uint256)
    {
        if (
            !_tokenTypeCreated[
                tokenId
            ]
        ) {
            revert TokenDoesNotExist(
                tokenId
            );
        }

        return
            _tokenTotalMinted[
                tokenId
            ];
    }

    function tokenMaxSupply(
        uint256 tokenId
    )
        external
        view
        returns (uint256)
    {
        if (
            !_tokenTypeCreated[
                tokenId
            ]
        ) {
            revert TokenDoesNotExist(
                tokenId
            );
        }

        return
            _tokenMaxSupply[
                tokenId
            ];
    }

    function tokenMetadataHash(
        uint256 tokenId
    )
        external
        view
        returns (bytes32)
    {
        if (
            !_tokenTypeCreated[
                tokenId
            ]
        ) {
            revert TokenDoesNotExist(
                tokenId
            );
        }

        return
            _tokenMetadataHashes[
                tokenId
            ];
    }

    // =============================================================
    // TOKEN URI
    // =============================================================

    function uri(
        uint256 tokenId
    )
        public
        view
        override
        returns (string memory)
    {
        string memory explicitURI =
            _tokenURIs[
                tokenId
            ];

        if (
            bytes(
                explicitURI
            ).length != 0
        ) {
            return explicitURI;
        }

        return
            super.uri(
                tokenId
            );
    }

    // =============================================================
    // CREATE TOKEN TYPE
    // =============================================================

    /**
     * @notice Creates a permanent ERC1155 token type.
     *
     * @param to Initial recipient. May be zero only when
     *           initialAmount == 0.
     * @param tokenId ERC1155 token ID.
     * @param initialAmount Initial amount to mint.
     * @param maxSupply Lifetime maximum issuance.
     *                  Zero means unlimited.
     * @param tokenURI_ Token-specific metadata URI.
     * @param metadataHash Metadata content hash.
     * @param data ERC1155 receiver data.
     *
     * @dev
     * Once created:
     *
     * - tokenId can never be created again,
     * - maxSupply cannot be changed,
     * - burning does not restore mint capacity.
     */
    function createTokenType(
        address to,
        uint256 tokenId,
        uint256 initialAmount,
        uint256 maxSupply,
        string calldata tokenURI_,
        bytes32 metadataHash,
        bytes calldata data
    )
        external
        onlyRole(MINTER_ROLE)
    {
        if (
            !mintable
        ) {
            revert MintingDisabled();
        }

        if (
            _tokenTypeCreated[
                tokenId
            ]
        ) {
            revert TokenTypeAlreadyExists(
                tokenId
            );
        }

        if (
            bytes(
                tokenURI_
            ).length == 0
        ) {
            revert EmptyTokenURI();
        }

        if (
            initialAmount >
                0 &&
            to ==
                address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            maxSupply != 0 &&
            initialAmount >
                maxSupply
        ) {
            revert InvalidMaximumSupply(
                tokenId,
                maxSupply,
                initialAmount
            );
        }

        _tokenTypeCreated[
            tokenId
        ] =
            true;

        _tokenMaxSupply[
            tokenId
        ] =
            maxSupply;

        _tokenURIs[
            tokenId
        ] =
            tokenURI_;

        _tokenMetadataHashes[
            tokenId
        ] =
            metadataHash;

        emit TokenTypeCreated(
            tokenId,
            initialAmount,
            maxSupply,
            tokenURI_,
            metadataHash
        );

        emit TokenMetadataUpdated(
            tokenId,
            tokenURI_,
            metadataHash
        );

        if (
            initialAmount >
                0
        ) {
            _tokenTotalMinted[
                tokenId
            ] =
                initialAmount;

            _mint(
                to,
                tokenId,
                initialAmount,
                data
            );
        }
    }

    // =============================================================
    // TOKEN METADATA
    // =============================================================

    function setTokenMetadata(
        uint256 tokenId,
        string calldata tokenURI_,
        bytes32 metadataHash_
    )
        external
        onlyRole(METADATA_ROLE)
    {
        if (
            !_tokenTypeCreated[
                tokenId
            ]
        ) {
            revert TokenDoesNotExist(
                tokenId
            );
        }

        if (
            bytes(
                tokenURI_
            ).length == 0
        ) {
            revert EmptyTokenURI();
        }

        _tokenURIs[
            tokenId
        ] =
            tokenURI_;

        _tokenMetadataHashes[
            tokenId
        ] =
            metadataHash_;

        emit TokenMetadataUpdated(
            tokenId,
            tokenURI_,
            metadataHash_
        );
    }

    // =============================================================
    // MINT
    // =============================================================

    /**
     * @notice Mints additional supply of an existing token type.
     *
     * @dev
     * This function deliberately contains no metadata parameters.
     * MINTER_ROLE therefore cannot modify metadata while minting.
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes calldata data
    )
        external
        onlyRole(MINTER_ROLE)
    {
        if (
            !mintable
        ) {
            revert MintingDisabled();
        }

        if (
            !_tokenTypeCreated[
                tokenId
            ]
        ) {
            revert TokenDoesNotExist(
                tokenId
            );
        }

        if (
            to ==
                address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            amount == 0
        ) {
            revert InvalidAmount();
        }

        _consumeMintCapacity(
            tokenId,
            amount
        );

        _mint(
            to,
            tokenId,
            amount,
            data
        );
    }

    // =============================================================
    // BATCH MINT
    // =============================================================

    function mintBatch(
        address to,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        bytes calldata data
    )
        external
        onlyRole(MINTER_ROLE)
    {
        if (
            !mintable
        ) {
            revert MintingDisabled();
        }

        if (
            to ==
                address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            tokenIds.length !=
                amounts.length
        ) {
            revert ArrayLengthMismatch();
        }

        if (
            tokenIds.length == 0
        ) {
            revert ArrayLengthMismatch();
        }

        /*
         * Duplicate token IDs are rejected.
         *
         * Without this check a batch such as:
         *
         * ids     = [7, 7]
         * amounts = [6, 6]
         *
         * could incorrectly pass independent pre-mint cap checks.
         *
         * O(n²) is intentional here. Batch sizes created by the
         * Asset Studio are expected to be small and this avoids
         * persistent helper storage solely for duplicate detection.
         */
        for (
            uint256 i = 0;
            i < tokenIds.length;
            ++i
        ) {
            uint256 tokenId =
                tokenIds[
                    i
                ];

            if (
                !_tokenTypeCreated[
                    tokenId
                ]
            ) {
                revert TokenDoesNotExist(
                    tokenId
                );
            }

            if (
                amounts[
                    i
                ] == 0
            ) {
                revert InvalidAmount();
            }

            for (
                uint256 j =
                    i + 1;
                j <
                    tokenIds.length;
                ++j
            ) {
                if (
                    tokenId ==
                    tokenIds[
                        j
                    ]
                ) {
                    revert DuplicateTokenId(
                        tokenId
                    );
                }
            }
        }

        /*
         * All validation completes before any lifetime counters
         * are changed.
         */
        for (
            uint256 i = 0;
            i < tokenIds.length;
            ++i
        ) {
            _consumeMintCapacity(
                tokenIds[
                    i
                ],
                amounts[
                    i
                ]
            );
        }

        _mintBatch(
            to,
            tokenIds,
            amounts,
            data
        );
    }

    // =============================================================
    // BURN
    // =============================================================

    function burn(
        address account,
        uint256 id,
        uint256 value
    )
        public
        override
    {
        if (
            !burnable
        ) {
            revert BurningDisabled();
        }

        super.burn(
            account,
            id,
            value
        );
    }

    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory values
    )
        public
        override
    {
        if (
            !burnable
        ) {
            revert BurningDisabled();
        }

        super.burnBatch(
            account,
            ids,
            values
        );
    }

    // =============================================================
    // PAUSE
    // =============================================================

    function pause()
        external
        onlyRole(PAUSER_ROLE)
    {
        if (
            !pausable
        ) {
            revert PausingDisabled();
        }

        _pause();
    }

    function unpause()
        external
        onlyRole(PAUSER_ROLE)
    {
        if (
            !pausable
        ) {
            revert PausingDisabled();
        }

        _unpause();
    }

    // =============================================================
    // NUMEN COLLECTION REGISTRATION
    // =============================================================

    /**
     * @notice Registers the ERC1155 collection itself.
     *
     * @dev
     * Permissionless trigger.
     *
     * The caller cannot choose registration data.
     * All canonical values come from this contract.
     */
    function registerNumenCollection()
        external
        returns (
            bytes32 assetId
        )
    {
        if (
            address(registry) ==
                address(0)
        ) {
            revert RegistryNotConfigured();
        }

        if (
            collectionAssetId !=
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
                                .ERC1155,

                        scope:
                            NumenAssetTypes
                                .AssetScope
                                .CONTRACT,

                        category:
                            _category,

                        representation:
                            _representation,

                        assetContract:
                            address(this),

                        tokenId:
                            0,

                        creator:
                            creator,

                        controller:
                            registryController,

                        metadataURI:
                            _collectionMetadataURI,

                        metadataHash:
                            _collectionMetadataHash
                    });

        assetId =
            registry.registerAsset(
                request
            );

        if (
            assetId ==
                bytes32(0)
        ) {
            revert RegistryReturnedInvalidAssetId();
        }

        collectionAssetId =
            assetId;

        emit NumenCollectionRegistered(
            assetId,
            address(registry)
        );
    }

    // =============================================================
    // NUMEN TOKEN TYPE REGISTRATION
    // =============================================================

    /**
     * @notice Registers an individual ERC1155 token type.
     *
     * @dev
     * A token type remains registerable even when all circulating
     * supply has been burned because tokenTypeCreated is permanent.
     */
    function registerNumenToken(
        uint256 tokenId
    )
        external
        returns (
            bytes32 assetId
        )
    {
        if (
            address(registry) ==
                address(0)
        ) {
            revert RegistryNotConfigured();
        }

        if (
            !_tokenTypeCreated[
                tokenId
            ]
        ) {
            revert TokenDoesNotExist(
                tokenId
            );
        }

        if (
            tokenAssetIds[
                tokenId
            ] !=
                bytes32(0)
        ) {
            revert TokenAlreadyRegistered(
                tokenId
            );
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
                                .ERC1155,

                        scope:
                            NumenAssetTypes
                                .AssetScope
                                .TOKEN,

                        category:
                            _category,

                        representation:
                            _representation,

                        assetContract:
                            address(this),

                        tokenId:
                            tokenId,

                        creator:
                            creator,

                        controller:
                            registryController,

                        metadataURI:
                            _tokenURIs[
                                tokenId
                            ],

                        metadataHash:
                            _tokenMetadataHashes[
                                tokenId
                            ]
                    });

        assetId =
            registry.registerAsset(
                request
            );

        if (
            assetId ==
                bytes32(0)
        ) {
            revert RegistryReturnedInvalidAssetId();
        }

        tokenAssetIds[
            tokenId
        ] =
            assetId;

        emit NumenTokenRegistered(
            tokenId,
            assetId,
            address(registry)
        );
    }

    // =============================================================
    // INTERNAL SUPPLY ACCOUNTING
    // =============================================================

    /**
     * @dev
     * Applies lifetime issuance accounting before mint.
     *
     * Burning only changes ERC1155 circulating totalSupply().
     * It NEVER decreases _tokenTotalMinted.
     */
    function _consumeMintCapacity(
        uint256 tokenId,
        uint256 amount
    )
        internal
    {
        uint256 lifetimeMinted =
            _tokenTotalMinted[
                tokenId
            ];

        uint256 maxSupply =
            _tokenMaxSupply[
                tokenId
            ];

        uint256 newLifetimeMinted =
            lifetimeMinted +
            amount;

        if (
            maxSupply != 0 &&
            newLifetimeMinted >
                maxSupply
        ) {
            revert MaximumSupplyExceeded(
                tokenId,
                maxSupply
            );
        }

        _tokenTotalMinted[
            tokenId
        ] =
            newLifetimeMinted;
    }

    // =============================================================
    // ERC1155 INTERNAL UPDATE
    // =============================================================

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    )
        internal
        override(
            ERC1155,
            ERC1155Pausable,
            ERC1155Supply
        )
    {
        super._update(
            from,
            to,
            ids,
            values
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
            ERC1155,
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