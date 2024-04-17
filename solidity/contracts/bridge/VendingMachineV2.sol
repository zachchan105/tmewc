// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../token/TMEWC.sol";

/// @title VendingMachineV2
/// @notice VendingMachineV2 is used to exchange tMEWC v1 to tMEWC in a 1:1
///         ratio during the process of tMEWC v1 bridge sunsetting. The redeemer
///         selected by the DAO based on the "TIP-027b tMEWC v1: The Sunsetting"
///         proposal will deposit tMEWC tokens into VendingMachineV2 so that
///         outstanding tMEWC v1 token owners can  upgrade to tMEWC tokens.
///         The redeemer will withdraw the tMEWC v1 tokens deposited into the
///         contract to perform tMEWC v1 redemptions.
///         The redeemer may decide to withdraw their deposited tMEWC at any
///         moment in time. The amount withdrawable is lower than the amount
///         deposited in case tMEWC v1 was exchanged for tMEWC.
///         This contract is owned by the redeemer.
contract VendingMachineV2 is Ownable {
    using SafeERC20 for IERC20;
    using SafeERC20 for TMEWC;

    IERC20 public immutable tmewcV1;
    TMEWC public immutable tmewcV2;

    event Exchanged(address indexed to, uint256 amount);
    event Deposited(address from, uint256 amount);
    event Withdrawn(address token, address to, uint256 amount);

    constructor(IERC20 _tmewcV1, TMEWC _tmewcV2) {
        tmewcV1 = _tmewcV1;
        tmewcV2 = _tmewcV2;
    }

    /// @notice Exchange tMEWC v1 for tMEWC in a 1:1 ratio.
    ///         The caller needs to have at least `amount` of tMEWC v1 balance
    ///         approved for transfer to the `VendingMachineV2` before calling
    ///         this function.
    /// @param amount The amount of tMEWC v1 to exchange for tMEWC.
    function exchange(uint256 amount) external {
        _exchange(msg.sender, amount);
    }

    /// @notice Exchange tMEWC v1 for tMEWC in a 1:1 ratio.
    ///         The caller needs to have at least `amount` of tMEWC v1 balance
    ///         approved for transfer to the `VendingMachineV2` before calling
    ///         this function.
    /// @dev This function is a shortcut for `approve` + `exchange`. Only tMEWC
    ///      v1 token caller is allowed and only tMEWC v1 is allowed as a token
    ///      to transfer.
    /// @param from tMEWC v1 token holder exchanging tMEWC v1 to tMEWC.
    /// @param amount The amount of tMEWC v1 to exchange for tMEWC.
    /// @param token tMEWC v1 token address.
    function receiveApproval(
        address from,
        uint256 amount,
        address token,
        bytes calldata
    ) external {
        require(token == address(tmewcV1), "Token is not tMEWC v1");
        require(msg.sender == address(tmewcV1), "Only tMEWC v1 caller allowed");
        _exchange(from, amount);
    }

    /// @notice Allows to deposit tMEWC tokens to the contract.
    ///         VendingMachineV2 can not mint tMEWC tokens so tMEWC needs
    ///         to be deposited into the contract so that tMEWC v1 to tMEWC
    ///         exchange can happen.
    ///         The caller needs to have at least `amount` of tMEWC balance
    ///         approved for transfer to the `VendingMachineV2` before calling
    ///         this function.
    /// @dev This function is for the redeemer and tMEWC v1 operators. This is
    ///      NOT a function for tMEWC v1 token holders.
    /// @param amount The amount of tMEWC to deposit into the contract.
    function depositTmewcV2(uint256 amount) external {
        emit Deposited(msg.sender, amount);
        tmewcV2.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Allows the contract owner to withdraw tokens. This function is
    ///         used in two cases: 1) when the redeemer wants to redeem tMEWC v1
    ///         tokens to perform tMEWC redemptions; 2) when the deadline for
    ///         tMEWC v1 -> tMEWC exchange passed and the redeemer wants their
    ///         tMEWC back.
    /// @dev This function is for the redeemer. This is NOT a function for
    ///      tMEWC v1 token holders.
    /// @param token The address of a token to withdraw.
    /// @param recipient The address which should receive withdrawn tokens.
    /// @param amount The amount to withdraw.
    function withdrawFunds(
        IERC20 token,
        address recipient,
        uint256 amount
    ) external onlyOwner {
        emit Withdrawn(address(token), recipient, amount);
        token.safeTransfer(recipient, amount);
    }

    function _exchange(address tokenOwner, uint256 amount) internal {
        require(
            tmewcV2.balanceOf(address(this)) >= amount,
            "Not enough tMEWC available in the Vending Machine"
        );

        emit Exchanged(tokenOwner, amount);
        tmewcV1.safeTransferFrom(tokenOwner, address(this), amount);

        tmewcV2.safeTransfer(tokenOwner, amount);
    }
}
