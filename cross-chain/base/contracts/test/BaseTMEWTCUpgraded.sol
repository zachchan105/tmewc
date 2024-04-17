// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.17;

import "@zachchan105/tmewc/contracts/l2/L2TMEWC.sol";

/// @notice Canonical tMEWC Token on Base - upgraded version.
/// @dev This contract is intended solely for testing purposes. As it currently
///      stands in the implementation of L2TMEWC.sol, there are no reserved
///      storage gap slots available, thereby limiting the upgradability to a
///      child contract only.
contract BaseTMEWCUpgraded is L2TMEWC {
    string public newVar;

    function initializeV2(string memory _newVar) public {
        newVar = _newVar;
    }
}
