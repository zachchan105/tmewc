// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.8.17;

import {MEWCUtils} from "@zachchan105/meowcoin-spv-sol/contracts/MEWCUtils.sol";

import "../bridge/Bridge.sol";

/// @notice Used only for system tests.
contract SystemTestRelay is IRelay {
    using MEWCUtils for bytes;
    using MEWCUtils for uint256;

    uint256 private currentEpochDifficulty;
    uint256 private prevEpochDifficulty;

    function setCurrentEpochDifficulty(uint256 _difficulty) external {
        currentEpochDifficulty = _difficulty;
    }

    function setPrevEpochDifficulty(uint256 _difficulty) external {
        prevEpochDifficulty = _difficulty;
    }

    function setCurrentEpochDifficultyFromHeaders(bytes memory bitcoinHeaders)
        external
    {
        uint256 firstHeaderDiff = bitcoinHeaders
            .extractTarget()
            .calculateDifficulty();

        currentEpochDifficulty = firstHeaderDiff;
    }

    function setPrevEpochDifficultyFromHeaders(bytes memory bitcoinHeaders)
        external
    {
        uint256 firstHeaderDiff = bitcoinHeaders
            .extractTarget()
            .calculateDifficulty();

        prevEpochDifficulty = firstHeaderDiff;
    }

    function getCurrentEpochDifficulty()
        external
        view
        override
        returns (uint256)
    {
        return currentEpochDifficulty;
    }

    function getPrevEpochDifficulty() external view override returns (uint256) {
        return prevEpochDifficulty;
    }
}
