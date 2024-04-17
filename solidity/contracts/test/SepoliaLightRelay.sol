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

pragma solidity 0.8.17;

import {MEWCUtils} from "@zachchan105/meowcoin-spv-sol/contracts/MEWCUtils.sol";

import "../relay/LightRelay.sol";

/// @title Sepolia Light Relay
/// @notice SepoliaLightRelay is a stub version of LightRelay intended to be
///         used on the Sepolia test network. It allows to set the relay's
///         difficulty based on arbitrary Meowcoin headers thus effectively
///         bypass the validation of difficulties of Meowcoin testnet blocks.
///         Since difficulty in Meowcoin testnet often falls to `1` it would not
///         be possible to validate blocks with the real LightRelay.
/// @dev Notice that SepoliaLightRelay is derived from LightRelay so that the two
///      contracts have the same API and correct bindings can be generated.
contract SepoliaLightRelay is LightRelay {
    using MEWCUtils for bytes;
    using MEWCUtils for uint256;

    /// @notice Sets the current and previous difficulty based on the difficulty
    ///         inferred from the provided Meowcoin headers.
    function setDifficultyFromHeaders(bytes memory bitcoinHeaders)
        external
        onlyOwner
    {
        uint256 firstHeaderDiff = bitcoinHeaders
            .extractTarget()
            .calculateDifficulty();

        currentEpochDifficulty = firstHeaderDiff;
        prevEpochDifficulty = firstHeaderDiff;
    }
}
