// SPDX-License-Identifier: GPL-3.0-only

// ██████████████     ▐████▌     ██████████████
// ██████████████     ▐████▌     ██████████████
//               ▐████▌    ▐████▌
//               ▐████▌    ▐████▌
// ██████████████     ▐████▌     ██████████████
// ██████████████     ▐████▌     ██████████████
//               ▐████▌    ▐████▌
//               ▐████▌    ▐████▌
//               ▐████▌    ▐████▌
//               ▐████▌    ▐████▌
//               ▐████▌    ▐████▌
//               ▐████▌    ▐████▌

pragma solidity ^0.8.0;

import {MEWCUtils} from "@zachchan105/meowcoin-spv-sol/contracts/MEWCUtils.sol";

import "./IBridge.sol";
import "./ITMEWCVault.sol";

/// @title Abstract AbstractTMEWCDepositor contract.
/// @notice This abstract contract is meant to facilitate integration of protocols
///         aiming to use tMEWC as an underlying Meowcoin bridge.
///
///         Such an integrator is supposed to:
///         - Create a child contract inheriting from this abstract contract
///         - Call the `__AbstractTMEWCDepositor_initialize` initializer function
///         - Use the `_initializeDeposit` and `_finalizeDeposit` as part of their
///           business logic in order to initialize and finalize deposits.
///
/// @dev Example usage:
///      ```
///      // Example upgradeable integrator contract.
///      contract ExampleTMEWCIntegrator is AbstractTMEWCDepositor, Initializable {
///          /// @custom:oz-upgrades-unsafe-allow constructor
///          constructor() {
///              // Prevents the contract from being initialized again.
///              _disableInitializers();
///          }
///
///          function initialize(
///              address _bridge,
///              address _tmewcVault
///          ) external initializer {
///              __AbstractTMEWCDepositor_initialize(_bridge, _tmewcVault);
///          }
///
///          function startProcess(
///              IBridgeTypes.BitcoinTxInfo calldata fundingTx,
///              IBridgeTypes.DepositRevealInfo calldata reveal
///          ) external {
///              // Embed necessary context as extra data.
///              bytes32 extraData = ...;
///
///              (uint256 depositKey, uint256 initialDepositAmount) = _initializeDeposit(
///                  fundingTx,
///                  reveal,
///                  extraData
///              );
///
///              // Use the depositKey to track the process.
///          }
///
///          function finalizeProcess(uint256 depositKey) external {
///              // Ensure the function cannot be called for the same deposit
///              // twice.
///
///              (
///                  uint256 initialDepositAmount,
///                  uint256 tmewcAmount,
///                  bytes32 extraData
///              ) = _finalizeDeposit(depositKey);
///
///              // Do something with the minted TMEWC using context
///              // embedded in the extraData.
///          }
///      }
abstract contract AbstractTMEWCDepositor {
    using MEWCUtils for bytes;

    /// @notice Multiplier to convert satoshi to TMEWC token units.
    uint256 public constant SATOSHI_MULTIPLIER = 10**10;

    /// @notice Bridge contract address.
    IBridge public bridge;
    /// @notice TMEWCVault contract address.
    ITMEWCVault public tmewcVault;

    // Reserved storage space that allows adding more variables without affecting
    // the storage layout of the child contracts. The convention from OpenZeppelin
    // suggests the storage space should add up to 50 slots. If more variables are
    // added in the upcoming versions one need to reduce the array size accordingly.
    // See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
    // slither-disable-next-line unused-state
    uint256[47] private __gap;

    /// @notice Initializes the contract. MUST BE CALLED from the child
    ///         contract initializer.
    // slither-disable-next-line dead-code
    function __AbstractTMEWCDepositor_initialize(
        address _bridge,
        address _tmewcVault
    ) internal {
        require(
            address(bridge) == address(0) && address(tmewcVault) == address(0),
            "AbstractTMEWCDepositor already initialized"
        );

        require(_bridge != address(0), "Bridge address cannot be zero");
        require(_tmewcVault != address(0), "TMEWCVault address cannot be zero");

        bridge = IBridge(_bridge);
        tmewcVault = ITMEWCVault(_tmewcVault);
    }

    /// @notice Initializes a deposit by revealing it to the Bridge.
    /// @param fundingTx Meowcoin funding transaction data, see `IBridgeTypes.BitcoinTxInfo`.
    /// @param reveal Deposit reveal data, see `IBridgeTypes.DepositRevealInfo` struct.
    /// @param extraData 32-byte deposit extra data.
    /// @return depositKey Deposit key computed as
    ///         `keccak256(fundingTxHash | reveal.fundingOutputIndex)`. This
    ///         key can be used to refer to the deposit in the Bridge and
    ///         TMEWCVault contracts.
    /// @return initialDepositAmount Amount of funding transaction deposit. In
    ///         TMEWC token decimals precision.
    /// @dev Requirements:
    ///      - The revealed vault address must match the TMEWCVault address,
    ///      - All requirements from {Bridge#revealDepositWithExtraData}
    ///        function must be met.
    /// @dev This function doesn't validate if a deposit has been initialized before,
    ///      as the Bridge won't allow the same deposit to be revealed twice.
    // slither-disable-next-line dead-code
    function _initializeDeposit(
        IBridgeTypes.BitcoinTxInfo memory fundingTx,
        IBridgeTypes.DepositRevealInfo memory reveal,
        bytes32 extraData
    ) internal returns (uint256 depositKey, uint256 initialDepositAmount) {
        require(reveal.vault == address(tmewcVault), "Vault address mismatch");

        depositKey = _calculateDepositKey(
            _calculateBitcoinTxHash(fundingTx),
            reveal.fundingOutputIndex
        );

        // The Bridge does not allow to reveal the same deposit twice and
        // revealed deposits stay there forever. The transaction will revert
        // if the deposit has already been revealed so, there is no need to do
        // an explicit check here.
        bridge.revealDepositWithExtraData(fundingTx, reveal, extraData);

        initialDepositAmount =
            bridge.deposits(depositKey).amount *
            SATOSHI_MULTIPLIER;
    }

    /// @notice Finalizes a deposit by calculating the amount of TMEWC minted
    ///         for the deposit.
    /// @param depositKey Deposit key identifying the deposit.
    /// @return initialDepositAmount Amount of funding transaction deposit. In
    ///         TMEWC token decimals precision.
    /// @return tmewcAmount Approximate amount of TMEWC minted for the deposit. In
    ///         TMEWC token decimals precision.
    /// @return extraData 32-byte deposit extra data.
    /// @dev Requirements:
    ///      - The deposit must be initialized but not finalized
    ///        (in the context of this contract) yet.
    ///      - The deposit must be finalized on the Bridge side. That means the
    ///        deposit must be either swept or optimistically minted.
    /// @dev THIS FUNCTION DOESN'T VALIDATE IF A DEPOSIT HAS BEEN FINALIZED BEFORE,
    ///      IT IS A RESPONSIBILITY OF THE IMPLEMENTING CONTRACT TO ENSURE THIS
    ///      FUNCTION WON'T BE CALLED TWICE FOR THE SAME DEPOSIT.
    /// @dev IMPORTANT NOTE: The tmewcAmount returned by this function is an
    ///      approximation. See documentation of the `calculateTmewcAmount`
    ///      responsible for calculating this value for more details.
    // slither-disable-next-line dead-code
    function _finalizeDeposit(uint256 depositKey)
        internal
        returns (
            uint256 initialDepositAmount,
            uint256 tmewcAmount,
            bytes32 extraData
        )
    {
        IBridgeTypes.DepositRequest memory deposit = bridge.deposits(
            depositKey
        );
        require(deposit.revealedAt != 0, "Deposit not initialized");

        (, uint64 finalizedAt) = tmewcVault.optimisticMintingRequests(
            depositKey
        );

        require(
            deposit.sweptAt != 0 || finalizedAt != 0,
            "Deposit not finalized by the bridge"
        );

        initialDepositAmount = deposit.amount * SATOSHI_MULTIPLIER;

        tmewcAmount = _calculateTmewcAmount(deposit.amount, deposit.treasuryFee);

        extraData = deposit.extraData;
    }

    /// @notice Calculates the amount of TMEWC minted for the deposit.
    /// @param depositAmountSat Deposit amount in satoshi (1e8 precision).
    ///        This is the actual amount deposited by the deposit creator, i.e.
    ///        the gross amount the Bridge's fees are cut from.
    /// @param depositTreasuryFeeSat Deposit treasury fee in satoshi (1e8 precision).
    ///        This is an accurate value of the treasury fee that was actually
    ///        cut upon minting.
    /// @return tmewcAmount Approximate amount of TMEWC minted for the deposit.
    /// @dev IMPORTANT NOTE: The tmewcAmount returned by this function may
    ///      not correspond to the actual amount of TMEWC minted for the deposit.
    ///      Although the treasury fee cut upon minting is known precisely,
    ///      this is not the case for the optimistic minting fee and the Meowcoin
    ///      transaction fee. To overcome that problem, this function just takes
    ///      the current maximum allowed values of both fees, at the moment of deposit
    ///      finalization. For the great majority of the deposits, such an
    ///      algorithm will return a tmewcAmount slightly lesser than the
    ///      actual amount of TMEWC minted for the deposit. This will cause
    ///      some TMEWC to be left in the contract and ensure there is enough
    ///      liquidity to finalize the deposit. However, in some rare cases,
    ///      where the actual values of those fees change between the deposit
    ///      minting and finalization, the tmewcAmount returned by this function
    ///      may be greater than the actual amount of TMEWC minted for the deposit.
    ///      If this happens and the reserve coming from previous deposits
    ///      leftovers does not provide enough liquidity, the deposit will have
    ///      to wait for finalization until the reserve is refilled by subsequent
    ///      deposits or a manual top-up. The integrator is responsible for
    ///      handling such cases.
    // slither-disable-next-line dead-code
    function _calculateTmewcAmount(
        uint64 depositAmountSat,
        uint64 depositTreasuryFeeSat
    ) internal view virtual returns (uint256) {
        // Both deposit amount and treasury fee are in the 1e8 satoshi precision.
        // We need to convert them to the 1e18 TMEWC precision.
        uint256 amountSubTreasury = (depositAmountSat - depositTreasuryFeeSat) *
            SATOSHI_MULTIPLIER;

        uint256 omFeeDivisor = tmewcVault.optimisticMintingFeeDivisor();
        uint256 omFee = omFeeDivisor > 0
            ? (amountSubTreasury / omFeeDivisor)
            : 0;

        // The deposit transaction max fee is in the 1e8 satoshi precision.
        // We need to convert them to the 1e18 TMEWC precision.
        (, , uint64 depositTxMaxFee, ) = bridge.depositParameters();
        uint256 txMaxFee = depositTxMaxFee * SATOSHI_MULTIPLIER;

        return amountSubTreasury - omFee - txMaxFee;
    }

    /// @notice Calculates the deposit key for the given funding transaction
    ///         hash and funding output index.
    /// @param fundingTxHash Funding transaction hash.
    /// @param fundingOutputIndex Funding output index.
    /// @return depositKey Deposit key computed as
    ///         `keccak256(fundingTxHash | reveal.fundingOutputIndex)`. This
    ///         key can be used to refer to the deposit in the Bridge and
    ///         TMEWCVault contracts.
    // slither-disable-next-line dead-code
    function _calculateDepositKey(
        bytes32 fundingTxHash,
        uint32 fundingOutputIndex
    ) internal pure returns (uint256) {
        return
            uint256(
                keccak256(abi.encodePacked(fundingTxHash, fundingOutputIndex))
            );
    }

    /// @notice Calculates the Meowcoin transaction hash for the given Meowcoin
    ///         transaction data.
    /// @param txInfo Meowcoin transaction data, see `IBridgeTypes.BitcoinTxInfo` struct.
    /// @return txHash Meowcoin transaction hash.
    // slither-disable-next-line dead-code
    function _calculateBitcoinTxHash(IBridgeTypes.BitcoinTxInfo memory txInfo)
        internal
        view
        returns (bytes32)
    {
        return
            abi
                .encodePacked(
                    txInfo.version,
                    txInfo.inputVector,
                    txInfo.outputVector,
                    txInfo.locktime
                )
                .hash256View();
    }

    /// @notice Returns minimum deposit amount.
    /// @return Minimum deposit amount. In TMEWC token decimals precision.
    // slither-disable-next-line dead-code
    function _minDepositAmount() internal view returns (uint256) {
        // Read tMEWC Bridge Deposit Dust Threshold in satoshi precision.
        (uint64 bridgeDepositDustThresholdSat, , , ) = bridge
            .depositParameters();

        // Convert tMEWC Bridge Deposit Dust Threshold to TMEWC token precision.
        return bridgeDepositDustThresholdSat * SATOSHI_MULTIPLIER;
    }
}
