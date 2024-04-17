// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.17;

import "@thesis/solidity-contracts/contracts/token/ERC20WithPermit.sol";
import "@thesis/solidity-contracts/contracts/token/MisfundRecovery.sol";

contract TMEWC is ERC20WithPermit, MisfundRecovery {
    constructor() ERC20WithPermit("tMEWC", "tMEWC") {}
}
