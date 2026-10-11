// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../assets/interfaces/INumenAssetRegistry.sol";
import "../assets/libraries/NumenAssetTypes.sol";

/**
 * @title RegistryMockAsset
 * @notice Test helper for NumenAssetRegistry.
 *
 * @dev
 * NumenAssetRegistry requires canonical self-registration:
 *
 *     msg.sender == request.assetContract
 *
 * Therefore registry tests cannot register this mock directly
 * from an EOA. Instead, tests call this contract and this contract
 * performs the registry call itself.
 *
 * This mock deliberately contains no token logic.
 * It only exists to test registry behavior.
 */
contract RegistryMockAsset {
    /**
     * @notice Registers this mock contract in a NumenAssetRegistry.
     *
     * @dev
     * assetContract is always address(this), so callers cannot use
     * this helper to register another contract.
     */
    function registerSelf(
        address registry,
        NumenAssetTypes.AssetClass assetClass,
        NumenAssetTypes.AssetStandard standard,
        NumenAssetTypes.AssetScope scope,
        NumenAssetTypes.AssetCategory category,
        NumenAssetTypes.RepresentationType representation,
        uint256 tokenId,
        address creator,
        address controller,
        string calldata metadataURI,
        bytes32 metadataHash
    )
        external
        returns (bytes32 assetId)
    {
        INumenAssetRegistry.RegisterAssetRequest
            memory request =
            INumenAssetRegistry.RegisterAssetRequest({
                assetClass: assetClass,
                standard: standard,
                scope: scope,
                category: category,
                representation: representation,
                assetContract: address(this),
                tokenId: tokenId,
                creator: creator,
                controller: controller,
                metadataURI: metadataURI,
                metadataHash: metadataHash
            });

        assetId =
            INumenAssetRegistry(registry)
                .registerAsset(request);
    }
}