// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IPriceOracle} from "../interfaces/IPriceOracle.sol";

/// @notice Test-only mock implementation of IPriceOracle
/// @dev Used for testing purposes only. Do not use in production.
contract MockOracle is IPriceOracle {
    mapping(address => uint256) public pricesWad;

    function setPrice(address asset, uint256 priceWad) external {
        pricesWad[asset] = priceWad;
    }

    function getUsdPrice(
        address asset
    ) external view override returns (uint256) {
        return pricesWad[asset];
    }

    function getUsdPriceSafe(
        address asset
    )
        external
        view
        override
        returns (uint256 priceWad, bool isStale, bool isValid)
    {
        return (pricesWad[asset], false, true);
    }
}
