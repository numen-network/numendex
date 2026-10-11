// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title NumenAssetTypes
 * @notice Shared data types for the Numen Asset Protocol.
 *
 * @dev
 * This library defines the common vocabulary used by:
 *
 * - Fungible assets
 * - Non-fungible assets
 * - Real-world assets (RWA)
 * - Digital twins
 * - Physical / 3D-linked assets
 * - Product passports
 * - Certificates
 * - Collections
 * - Future Numen Object Registry integrations
 *
 * IMPORTANT:
 *
 * A physical or 3D association does NOT by itself prove authenticity,
 * legal ownership, provenance, or physical-world identity.
 *
 * Verification and attestation states must be represented separately.
 */
library NumenAssetTypes {
    // =============================================================
    //                           ASSET CLASS
    // =============================================================

    /**
     * @notice Fundamental economic class of an asset.
     */
    enum AssetClass {
        FUNGIBLE,
        NON_FUNGIBLE
    }

    // =============================================================
    //                         ASSET STANDARD
    // =============================================================

    /**
     * @notice Technical representation used by an asset.
     *
     * NONE is useful for registry records that are not themselves
     * represented by a token contract.
     */
    enum AssetStandard {
        NONE,
        ERC20,
        ERC721,
        ERC1155
    }

    // =============================================================
    //                          ASSET SCOPE
    // =============================================================

    /**
     * @notice Defines whether a registry record represents an entire
     * token contract / collection or one individual token ID.
     *
     * CONTRACT:
     * - ERC20 assets
     * - ERC721 collection-level records
     * - ERC1155 collection-level records
     *
     * TOKEN:
     * - Individual ERC721 tokens
     * - Individual ERC1155 token types
     *
     * Scope is part of canonical Numen asset identity.
     *
     * This makes the following two identities distinct:
     *
     * contract = 0xABC...
     * scope    = CONTRACT
     * tokenId  = 0
     *
     * and:
     *
     * contract = 0xABC...
     * scope    = TOKEN
     * tokenId  = 0
     *
     * This distinction is required because NFT token ID 0 is valid.
     */
    enum AssetScope {
        CONTRACT,
        TOKEN
    }

    // =============================================================
    //                        ASSET CATEGORY
    // =============================================================

    /**
     * @notice High-level semantic category of an asset.
     *
     * CUSTOM allows applications to provide a human-readable
     * category through metadata without requiring a protocol upgrade.
     */
    enum AssetCategory {
        UNSPECIFIED,
        CURRENCY,
        PAYMENT,
        UTILITY,
        GOVERNANCE,
        COMMUNITY,
        GAMING,
        COMMODITY,
        REAL_ESTATE,
        PRECIOUS_METAL,
        PRECIOUS_STONE,
        COLLECTIBLE,
        ARTWORK,
        CULTURAL_HERITAGE,
        PRODUCT,
        VEHICLE,
        MACHINERY,
        INTELLECTUAL_PROPERTY,
        MEDIA,
        CERTIFICATE,
        IDENTITY,
        FINANCIAL_ASSET,
        CUSTOM
    }

    // =============================================================
    //                      REPRESENTATION TYPE
    // =============================================================

    /**
     * @notice Describes what the on-chain asset represents.
     *
     * This is deliberately separate from AssetCategory.
     *
     * Example:
     *
     * category       = REAL_ESTATE
     * representation = FRACTIONAL_INTEREST
     */
    enum RepresentationType {
        UNSPECIFIED,
        DIGITAL_ASSET,
        PHYSICAL_REFERENCE,
        DIGITAL_TWIN,
        FRACTIONAL_INTEREST,
        OWNERSHIP_CLAIM,
        USAGE_RIGHT,
        REVENUE_RIGHT,
        CERTIFICATE,
        PRODUCT_PASSPORT,
        MEMBERSHIP,
        LICENSE,
        CUSTOM
    }

    // =============================================================
    //                         SUPPLY MODEL
    // =============================================================

    /**
     * @notice Supply policy for fungible or multi-token assets.
     */
    enum SupplyModel {
        NOT_APPLICABLE,
        FIXED,
        CAPPED,
        UNCAPPED
    }

    // =============================================================
    //                       PROPERTY VALUE TYPE
    // =============================================================

    /**
     * @notice Supported value types for extensible asset properties.
     *
     * Properties are intended for data such as:
     *
     * Weight      -> DECIMAL
     * Serial No.  -> TEXT
     * Certified   -> BOOLEAN
     * Manufacture -> DATE
     * Document    -> URI / HASH
     */
    enum PropertyValueType {
        TEXT,
        INTEGER,
        DECIMAL,
        BOOLEAN,
        DATE,
        URI,
        HASH,
        ADDRESS,
        BYTES
    }

    // =============================================================
    //                       ATTESTATION TYPE
    // =============================================================

    /**
     * @notice Semantic purpose of an attestation.
     *
     * An attestation means that an identifiable party made a claim.
     * It does not automatically make that claim true.
     */
    enum AttestationType {
        CUSTOM,
        ISSUER,
        MANUFACTURER,
        OWNERSHIP,
        ORIGIN,
        INSPECTION,
        APPRAISAL,
        CUSTODY,
        AUDIT,
        LEGAL,
        DOCUMENT,
        MODEL,
        SCAN
    }

    // =============================================================
    //                     VERIFICATION STATUS
    // =============================================================

    /**
     * @notice Generic lifecycle for an independently verifiable claim.
     */
    enum VerificationStatus {
        NONE,
        PENDING,
        VERIFIED,
        REJECTED,
        REVOKED,
        EXPIRED
    }

    // =============================================================
    //                       OBJECT LINK TYPE
    // =============================================================

    /**
     * @notice Relationship between an asset and an object record.
     *
     * Multiple assets may reference the same object.
     *
     * Example:
     *
     * Object
     *   ├── DIGITAL_TWIN       -> ERC721
     *   ├── FRACTIONALIZATION -> ERC20
     *   └── CERTIFICATE       -> ERC721
     */
    enum ObjectLinkType {
        UNSPECIFIED,
        PRIMARY,
        DIGITAL_TWIN,
        FRACTIONALIZATION,
        CERTIFICATE,
        OWNERSHIP,
        USAGE_RIGHT,
        PROVENANCE,
        CUSTOM
    }

    // =============================================================
    //                        ASSET IDENTITY
    // =============================================================

    /**
     * @notice Core registry identity for an asset.
     *
     * assetId:
     * Protocol-generated identifier.
     *
     * assetContract:
     * ERC20 / ERC721 / ERC1155 contract address when applicable.
     *
     * scope:
     * CONTRACT when the record represents the whole token contract
     * or collection.
     *
     * TOKEN when the record represents one specific ERC721 or
     * ERC1155 token ID.
     *
     * tokenId:
     * Must be 0 for CONTRACT-scoped records.
     *
     * For TOKEN-scoped ERC721 / ERC1155 records, this is the
     * corresponding token ID. Token ID 0 is valid and is distinct
     * from a CONTRACT-scoped record because scope is part of the
     * canonical identity.
     */
    struct AssetIdentity {
        bytes32 assetId;
        AssetClass assetClass;
        AssetStandard standard;
        AssetScope scope;
        AssetCategory category;
        RepresentationType representation;
        address assetContract;
        uint256 tokenId;
        address creator;
        uint64 createdAt;
    }

    // =============================================================
    //                         ASSET METADATA
    // =============================================================

    /**
     * @notice Human-readable and external metadata references.
     *
     * Large files and metadata should generally remain off-chain.
     * Hashes can be committed on-chain independently.
     */
    struct AssetMetadata {
        string name;
        string symbol;
        string description;
        string metadataURI;
        bytes32 metadataHash;
    }

    // =============================================================
    //                       CUSTOM PROPERTY
    // =============================================================

    /**
     * @notice Extensible property attached to an asset.
     *
     * The value is encoded as bytes so the registry can support
     * additional property semantics without redeploying every asset.
     *
     * Example:
     *
     * key       = keccak256("weight")
     * name      = "Weight"
     * valueType = DECIMAL
     * value     = abi.encode("1.75388")
     * unit      = "kg"
     */
    struct AssetProperty {
        bytes32 key;
        string name;
        PropertyValueType valueType;
        bytes value;
        string unit;
        address addedBy;
        uint64 createdAt;
        uint64 updatedAt;
    }

    // =============================================================
    //                         3D MODEL DATA
    // =============================================================

    /**
     * @notice Information about a digital 3D model associated
     * with an asset or object.
     *
     * modelHash commits to the exact model bytes.
     *
     * spectralFingerprint may reference a separately generated
     * asset-oriented geometric fingerprint.
     *
     * This MUST NOT be interpreted as the PoScan mining work hash
     * and MUST NOT by itself be represented as proof of physical
     * authenticity.
     */
    struct ModelData {
        string modelURI;
        bytes32 modelHash;
        bytes32 spectralFingerprint;
        string spectralVersion;
        address submittedBy;
        uint64 createdAt;
    }

    // =============================================================
    //                         OBJECT RECORD
    // =============================================================

    /**
     * @notice Registry record for an object that may later be
     * associated with one or more digital assets.
     *
     * objectId is a protocol-level identifier.
     *
     * The existence of an ObjectRecord means that an object record
     * exists on-chain. It does NOT automatically mean the physical
     * object has been independently authenticated.
     */
    struct ObjectRecord {
        bytes32 objectId;
        address creator;
        bytes32 primaryModelHash;
        bytes32 spectralFingerprint;
        string metadataURI;
        uint64 createdAt;
        bool active;
    }

    // =============================================================
    //                         OBJECT BINDING
    // =============================================================

    /**
     * @notice Relationship between an object and an asset.
     */
    struct ObjectBinding {
        bytes32 objectId;
        bytes32 assetId;
        ObjectLinkType linkType;
        address createdBy;
        uint64 createdAt;
        bool active;
    }

    // =============================================================
    //                          ATTESTATION
    // =============================================================

    /**
     * @notice Signed/registered claim made about an asset or object.
     *
     * subjectId may be an assetId or objectId depending on the
     * registry context.
     *
     * evidenceHash can commit to a report, certificate, scan,
     * inspection, legal document, or other evidence.
     */
    struct Attestation {
        bytes32 attestationId;
        bytes32 subjectId;
        AttestationType attestationType;
        address attester;
        bytes32 evidenceHash;
        string evidenceURI;
        VerificationStatus status;
        uint64 issuedAt;
        uint64 expiresAt;
    }

    // =============================================================
    //                           DOCUMENT
    // =============================================================

    /**
     * @notice Document reference associated with an asset or object.
     *
     * Sensitive documents do not need to expose their contents.
     * documentHash can be recorded without publishing documentURI.
     */
    struct DocumentReference {
        bytes32 documentId;
        bytes32 subjectId;
        string documentType;
        string documentURI;
        bytes32 documentHash;
        address submittedBy;
        uint64 createdAt;
    }

    // =============================================================
    //                         PROVENANCE
    // =============================================================

    /**
     * @notice Generic historical event for an asset or object.
     *
     * eventType is intentionally bytes32 so applications can define
     * additional event types without modifying this library.
     */
    struct ProvenanceEvent {
        bytes32 eventId;
        bytes32 subjectId;
        bytes32 eventType;
        address actor;
        bytes32 dataHash;
        string dataURI;
        uint64 timestamp;
    }

    // =============================================================
    //                     FUNGIBLE CONFIGURATION
    // =============================================================

    /**
     * @notice Configuration recorded for fungible assets.
     *
     * Feature flags describe the deployed asset's capabilities.
     * They do not themselves grant permissions.
     */
    struct FungibleConfig {
        SupplyModel supplyModel;
        uint8 decimals;
        uint256 initialSupply;
        uint256 maxSupply;
        bool mintable;
        bool burnable;
        bool pausable;
        bool permitEnabled;
        bool votesEnabled;
    }

    // =============================================================
    //                  NON-FUNGIBLE CONFIGURATION
    // =============================================================

    /**
     * @notice Configuration recorded for NFT / multi-token assets.
     */
    struct NonFungibleConfig {
        bool multiToken;
        bool burnable;
        bool pausable;
        bool enumerable;
        bool royaltyEnabled;
        uint96 royaltyBps;
        address royaltyReceiver;
    }
}