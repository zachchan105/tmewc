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

/// @notice Interface of the TMEWCVault contract.
/// @dev See vault/TMEWCVault.sol
interface ITMEWCVault {
    /// @dev See {TMEWCVault#optimisticMintingRequests}
    function optimisticMintingRequests(uint256 depositKey)
        external
        returns (uint64 requestedAt, uint64 finalizedAt);

    /// @dev See {TMEWCVault#optimisticMintingFeeDivisor}
    function optimisticMintingFeeDivisor() external view returns (uint32);

    /// @dev See {TMEWCVault#tmewcToken}
    function tmewcToken() external view returns (address);
}
