// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {CredditCore} from "./CredditCore.sol";
import {ZeroAddressProvided} from "./CredditErrors.sol";

/// @notice Custom errors for CredditInterestRateModel contract
error InvalidKink(uint256 kinkWad);

/// @title CredditInterestRateModel
/// @notice Standalone, independently testable kinked utilization-based interest
/// rate model. Rates are expressed as WAD-scaled annual rates.
contract CredditInterestRateModel is CredditCore {
    using WadMath for uint256;

    /// @notice
    Params public params;

    /// @notice Number of seconds in a 365-day year for annual interest calculation.
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    /// @notice All rates/kink are WAD fractions (1e18 = 100%).
    /// @param baseRateWad The annual base rate in WAD.
    /// @param kinkWad The utilization at which the slope changes in WAD.
    /// @param slope1Wad The annual rate added per unit of utilization below the kink in WAD.
    /// @param slope2Wad The annual rate added per unit of utilization above the kink in WAD.
    struct Params {
        uint256 baseRateWad;
        uint256 kinkWad;
        uint256 slope1Wad;
        uint256 slope2Wad;
    }

    /// @notice Emits when the interest rate model parameters are updated.
    /// @param baseRateWad The annual base rate in WAD.
    /// @param kinkWad The utilization at which the slope changes in WAD.
    /// @param slope1Wad The annual rate added per unit of utilization below the kink in WAD.
    /// @param slope2Wad The annual rate added per unit of utilization above the kink in WAD.
    event ParamsUpdated(
        uint256 baseRateWad,
        uint256 kinkWad,
        uint256 slope1Wad,
        uint256 slope2Wad
    );

    /// @notice Initializes the CredditInterestRateModel contract.
    /// @param admin The address of the admin (the deployer), also pauser and DEFAULT_ADMIN_ROLE.
    /// @param initialParams The initial parameters for the interest rate model.
    function initialize(
        address admin,
        Params memory initialParams
    ) public initializer {
        if (admin == address(0)) revert ZeroAddressProvided();

        // Initialize CredditCore contract
        __CredditCore_init(admin);

        // Grant POOL_ADMIN_ROLE to the admin
        _grantRole(CredditRoles.RISK_ADMIN_ROLE, admin);

        _setParams(initialParams);
    }

    /*********************************************************************
     * ADMIN WRITE FUNCTIONS
     *********************************************************************/

    /// @notice Updates the parameters for the interest rate model.
    /// @param newParams The new parameters for the interest rate model.
    function setParams(
        Params memory newParams
    ) external onlyRole(CredditRoles.RISK_ADMIN_ROLE) {
        _setParams(newParams);
    }

    /*********************************************************************
     * EXTERNAL VIEW FUNCTIONS (ILendingAdapter)
     *********************************************************************/

    /// @notice Utilization = borrowed / totalLiquidity, WAD-scaled. Returns 0
    /// when there is no liquidity at all (avoids division by zero).
    function utilization(
        uint256 totalBorrowsWad,
        uint256 totalLiquidityWad
    ) public pure returns (uint256) {
        if (totalLiquidityWad == 0) return 0;
        return totalBorrowsWad.wadDivDown(totalLiquidityWad);
    }

    /// @notice Annualized borrow rate (WAD) for a given utilization.
    function getBorrowRateWad(
        uint256 totalBorrowsWad,
        uint256 totalLiquidityWad
    ) public view returns (uint256) {
        uint256 u = utilization(totalBorrowsWad, totalLiquidityWad);
        Params memory p = params;

        if (u <= p.kinkWad) {
            return p.baseRateWad + u.wadMulDown(p.slope1Wad);
        }

        uint256 normalRate = p.baseRateWad + p.kinkWad.wadMulDown(p.slope1Wad);
        uint256 excessUtilization = u - p.kinkWad;
        return normalRate + excessUtilization.wadMulDown(p.slope2Wad);
    }

    /*********************************************************************
     * INTERNAL FUNCTIONS
     *********************************************************************/

    function _setParams(Params memory newParams) internal {
        if (newParams.kinkWad == 0 || newParams.kinkWad > WadMath.WAD)
            revert InvalidKink(newParams.kinkWad);
        params = newParams;
        emit ParamsUpdated(
            newParams.baseRateWad,
            newParams.kinkWad,
            newParams.slope1Wad,
            newParams.slope2Wad
        );
    }
}
