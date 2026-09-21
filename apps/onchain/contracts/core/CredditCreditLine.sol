// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {CredditCore} from "./CredditCore.sol";
import {CredditAssetRegistry} from "./CredditAssetRegistry.sol";
import {CredditRiskEngine} from "./CredditRiskEngine.sol";
import {WadMath} from "../libraries/WadMath.sol";
import {CredditRoles} from "../libraries/CredditRole.sol";
import {ZeroAddressProvided, ZeroAmount, AssetNotEnabled} from "./CredditErrors.sol";

/// @notice Custom Errors for the CredditCore contract
error MaxExposureExceeded(address asset, uint256 newTotal, uint256 maxExposure);
error TooManyCollateralAssets();
error InsufficientCollateralBalance(
    address asset,
    uint256 requested,
    uint256 balance
);

/// @title CredditCreditLine
/// @notice The central CredditLink protocol contract. Lets a user
/// deposit one or more registered Stock Tokens as collateral and draw a single,
/// unified USDG credit line against their combined, risk-adjusted portfolio value
contract CredditCreditLine is CredditCore {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;
    using WadMath for uint256;

    /// @dev Reference to the asset registry contract.
    CredditAssetRegistry public registry;

    /// @dev Reference to the risk engine contract.
    CredditRiskEngine public riskEngine;

    /// @dev The USDG token contract.
    IERC20 public usdg;
    /// @dev The number of decimals of the USDG token.
    uint8 public usdgDecimals;

    /// @dev The debt index for USDG. Initialized to 1e18 in `initialize`.
    uint256 public debtIndexWad = WadMath.WAD;
    /// @dev Total number of debt shares across all users.
    uint256 public totalDebtShares;
    /// @dev Timestamp of the last interest accrual.
    uint256 public lastAccrualTimestamp;

    /// @notice Emitted when collateral is deposited.
    /// @param user The address of the user.
    /// @param asset The asset that was deposited.
    /// @param amount The amount of the asset that was deposited.
    event CollateralDeposited(
        address indexed user,
        address indexed asset,
        uint256 amount
    );

    /// @notice Emitted when collateral is withdrawn.
    /// @param user The address of the user.
    /// @param asset The asset that was withdrawn.
    /// @param amount The amount of the asset that was withdrawn.
    event CollateralWithdrawn(
        address indexed user,
        address indexed asset,
        uint256 amount
    );

    /// @dev user => debt balance (in USDG) issued against collateral.
    mapping(address => uint256) public debtShares;
    /// @dev user => collateral asset => raw token amount deposited.
    mapping(address => mapping(address => uint256))
        public userCollateralBalance;
    /// @dev user => bounded list of assets they currently (or previously) hold,
    /// used only to bound iteration; membership also tracked in `_userHasAsset`.
    mapping(address => EnumerableSet.AddressSet) private _userCollateralAssets;
    /// @dev user => asset => true if user currently holds that asset.
    /// used to check if an asset has been deposited by a user.
    mapping(address => mapping(address => bool)) internal _userHasAsset;
    /// @dev running total deposited per asset across all users, checked against
    /// the registry's maxExposure.
    mapping(address => uint256) public totalDeposited;

    /// @notice Initialized only once when the contract is deployed.
    /// @param admin The address of the admin (the deployer), also pauser and DEFAULT_ADMIN_ROLE.
    /// @param _assetRegistry The address of the asset registry contract.
    /// @param _usdg The address of the USDG token contract.
    /// @dev These roles allow the admin to add, update, or remove assets from the registry.
    function initialize(
        address admin,
        address _assetRegistry,
        address _usdg,
        address _riskEngine
    ) external initializer {
        if (
            admin == address(0) ||
            _assetRegistry == address(0) ||
            _usdg == address(0)
        ) revert ZeroAddressProvided();

        // Initialize CredditCore contract
        __CredditCore_init(admin);

        // Grant roles to admin
        _grantRole(CredditRoles.PAUSER_ROLE, admin);
        _grantRole(CredditRoles.RISK_ADMIN_ROLE, admin);

        // Initialize Asset Registry and USDG
        registry = CredditAssetRegistry(_assetRegistry);
        riskEngine = CredditRiskEngine(_riskEngine);
        usdg = IERC20(_usdg);
        usdgDecimals = IERC20Metadata(_usdg).decimals();

        // Initialize timestamp to contract deployment block
        lastAccrualTimestamp = block.timestamp;
    }

    /// @notice Deposits collateral into the protocol.
    /// @param asset The asset to deposit.
    /// @param amount The amount of the asset to deposit.
    function depositCollateral(
        address asset,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();

        CredditAssetRegistry.AssetConfig memory cfg = registry.getAsset(
            asset
        );
        if (!cfg.isEnabled) revert AssetNotEnabled(asset);

        uint256 newTotal = totalDeposited[asset] + amount;
        if (cfg.maxExposure != 0 && newTotal > cfg.maxExposure) {
            revert MaxExposureExceeded(asset, newTotal, cfg.maxExposure);
        }

        if (!_userHasAsset[msg.sender][asset]) {
            if (
                _userCollateralAssets[msg.sender].length() >=
                riskEngine.maxCollateralAssetsPerUser()
            ) revert TooManyCollateralAssets();

            _userHasAsset[msg.sender][asset] = true;
            _userCollateralAssets[msg.sender].add(asset);
        }

        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(asset).balanceOf(address(this)) -
            balanceBefore;
        if (received == 0) revert ZeroAmount();

        uint256 receivedTotal = totalDeposited[asset] + received;
        if (cfg.maxExposure != 0 && receivedTotal > cfg.maxExposure) {
            revert MaxExposureExceeded(asset, receivedTotal, cfg.maxExposure);
        }

        userCollateralBalance[msg.sender][asset] += received;
        totalDeposited[asset] = receivedTotal;

        emit CollateralDeposited(msg.sender, asset, received);
    }

    /// @notice Withdraws collateral from the protocol.
    /// @param asset The asset to withdraw.
    /// @param amount The amount of the asset to withdraw.
    function withdrawCollateral(
        address asset,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 currentBalance = userCollateralBalance[msg.sender][asset];
        if (amount > currentBalance)
            revert InsufficientCollateralBalance(asset, amount, currentBalance);

        uint256 newBalance = currentBalance - amount;
        userCollateralBalance[msg.sender][asset] = newBalance;
        totalDeposited[asset] -= amount;

        // If fully withdrawn, remove from active set to free up a slot for the user
        if (newBalance == 0) {
            _userCollateralAssets[msg.sender].remove(asset);
        }

        // TODO: Add solvency check here

        IERC20(asset).safeTransfer(msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, asset, amount);
    }

    /// @notice Borrows USDG against collateral.
    /// @param amount The amount of USDG to borrow.
    function borrow(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _syncDebtIndex();

        uint256 amountWad = amount.toWad(usdgDecimals);
        uint256 currentUserDebt = _userDebtWad(msg.sender);
        uint256 newDebt = currentUserDebt + amountWad;
    }

    /*********************************************************************
     * INTERNAL FUNCTIONS
     *********************************************************************/

    /// @notice Calculates the debt of the specified user.
    /// @param user The address of the user.
    /// @return The debt balance of the specified user in USDG.
    function _userDebtWad(address user) internal view returns (uint256) {
        return debtShares[user].wadMulUp(debtIndexWad);
    }

    /// @notice Syncs the debt index to the current time.
    /// @dev This function is called by the user when they deposit or withdraw collateral.
    function _syncDebtIndex() internal {}
}
