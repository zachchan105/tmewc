// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../token/TMEWC.sol";

/// @title VendingMachineV3
/// @notice VendingMachineV3 is used to exchange tMEWC v1 to tMEWC in a 1:1
///         ratio after the tMEWC v1 bridge sunsetting is completed. Since
///         tMEWC v1 bridge is no longer working, tMEWC v1 tokens can not be used
///         to perform MEWC redemptions. This contract allows tMEWC v1 owners to
///         upgrade to tMEWC without any deadline. This way, tMEWC v1 tokens
///         left on the market are always backed by Meowcoin. The governance will
///         deposit tMEWC into the contract in the amount equal to tMEWC v1
///         supply. The governance is allowed to withdraw tMEWC only if tMEWC
///         v2 left in this contract is enough to cover the upgrade of all tMEWC
///         v1 left on the market. This contract is owned by the governance.
contract VendingMachineV3 is Ownable {
    using SafeERC20 for IERC20;
    using SafeERC20 for TMEWC;

    IERC20 public immutable tmewcV1;
    TMEWC public immutable tmewcV2;

    event Exchanged(address indexed to, uint256 amount);
    event Deposited(address from, uint256 amount);
    event TmewcV2Withdrawn(address to, uint256 amount);
    event FundsRecovered(address token, address to, uint256 amount);

    constructor(IERC20 _tmewcV1, TMEWC _tmewcV2) {
        tmewcV1 = _tmewcV1;
        tmewcV2 = _tmewcV2;
    }

    /// @notice Exchange tMEWC v1 for tMEWC in a 1:1 ratio.
    ///         The caller needs to have at least `amount` of tMEWC v1 balance
    ///         approved for transfer to the `VendingMachineV3` before calling
    ///         this function.
    /// @param amount The amount of tMEWC v1 to exchange for tMEWC.
    function exchange(uint256 amount) external {
        _exchange(msg.sender, amount);
    }

    /// @notice Exchange tMEWC v1 for tMEWC in a 1:1 ratio.
    ///         The caller needs to have at least `amount` of tMEWC v1 balance
    ///         approved for transfer to the `VendingMachineV3` before calling
    ///         this function.
    /// @dev This function is a shortcut for `approve` + `exchange`. Only tMEWC
    ///      v1 caller is allowed and only tMEWC v1 is allowed as a token to
    ///      transfer.
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
    ///         `VendingMachineV3` can not mint tMEWC tokens so tMEWC needs
    ///         to be deposited into the contract so that tMEWC v1 to tMEWC
    ///         exchange can happen.
    ///         The caller needs to have at least `amount` of tMEWC balance
    ///         approved for transfer to the `VendingMachineV3` before calling
    ///         this function.
    /// @dev This function is for the redeemer and tMEWC v1 operators. This is
    ///      NOT a function for tMEWC v1 token holders.
    /// @param amount The amount of tMEWC to deposit into the contract.
    function depositTmewcV2(uint256 amount) external {
        emit Deposited(msg.sender, amount);
        tmewcV2.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Allows the governance to withdraw tMEWC deposited into this
    ///         contract. The governance is allowed to withdraw tMEWC
    ///         only if tMEWC left in this contract is enough to cover the
    ///         upgrade of all tMEWC v1 left on the market.
    /// @param recipient The address which should receive withdrawn tokens.
    /// @param amount The amount to withdraw.
    function withdrawTmewcV2(address recipient, uint256 amount)
        external
        onlyOwner
    {
        require(
            tmewcV1.totalSupply() <= tmewcV2.balanceOf(address(this)) - amount,
            "tMEWC v1 must not be left unbacked"
        );

        emit TmewcV2Withdrawn(recipient, amount);
        tmewcV2.safeTransfer(recipient, amount);
    }

    /// @notice Allows the governance to recover ERC20 sent to this contract
    ///         by mistake or tMEWC v1 locked in the contract to exchange to
    ///         tMEWC. No tMEWC can be withdrawn using this function.
    /// @param token The address of a token to recover.
    /// @param recipient The address which should receive recovered tokens.
    /// @param amount The amount to recover.
    function recoverFunds(
        IERC20 token,
        address recipient,
        uint256 amount
    ) external onlyOwner {
        require(
            address(token) != address(tmewcV2),
            "tMEWC tokens can not be recovered, use withdrawTmewcV2 instead"
        );

        emit FundsRecovered(address(token), recipient, amount);
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
