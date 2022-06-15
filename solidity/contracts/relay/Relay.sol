// SPDX-License-Identifier: MIT

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

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

import {BytesLib} from "@keep-network/bitcoin-spv-sol/contracts/BytesLib.sol";
import {BTCUtils} from "@keep-network/bitcoin-spv-sol/contracts/BTCUtils.sol";
import {ValidateSPV} from "@keep-network/bitcoin-spv-sol/contracts/ValidateSPV.sol";

import "../bridge/IRelay.sol";

struct Epoch {
    uint32 timestamp;
    // By definition, bitcoin targets have at least 32 leading zero bits.
    // Thus we can only store the bits that aren't guaranteed to be 0.
    uint224 target;
}

library RelayUtils {
    using BytesLib for bytes;

    /// @notice Extract the timestamp of the header at the given position.
    /// @param headers Byte array containing the header of interest.
    /// @param at The start of the header in the array.
    /// @return The timestamp of the header.
    /// @dev Assumes that the specified position contains a valid header.
    /// Performs no validation whatsoever.
    function extractTimestampAt(bytes memory headers, uint256 at)
        internal
        pure
        returns (uint32)
    {
        return BTCUtils.reverseUint32(uint32(headers.slice4(68 + at)));
    }
}

interface ILightRelay is IRelay {
    event Genesis(uint256 blockHeight);
    event Retarget(uint256 oldDifficulty, uint256 newDifficulty);
    event ProofLengthChanged(uint256 newLength);

    function retarget(bytes memory headers) external;

    function validateChain(bytes memory headers)
        external
        view
        returns (bool valid);

    function getBlockDifficulty(uint256 blockNumber)
        external
        view
        returns (uint256);

    function getEpochDifficulty(uint256 epochNumber)
        external
        view
        returns (uint256);

    function getRelayRange()
        external
        view
        returns (uint256 relayGenesis, uint256 currentEpochEnd);
}

contract Relay is Ownable, ILightRelay {
    using BytesLib for bytes;
    using BTCUtils for bytes;
    using ValidateSPV for bytes;
    using RelayUtils for bytes;

    bool public ready;
    // Number of blocks required for a retarget proof.
    // Governable
    // Should be set to a fairly high number (e.g. 20-50) in production.
    uint64 public proofLength;
    // The number of the first epoch recorded by the relay.
    // This should equal the height of the block starting the genesis epoch,
    // divided by 2016, but this is not enforced as the relay has no
    // information about block numbers.
    uint64 public genesisEpoch;
    // The number of the latest epoch whose difficulty is proven to the relay.
    // If the genesis epoch's number is set correctly, and retargets along the
    // way have been legitimate, this equals the height of the block starting
    // the most recent epoch, divided by 2016.
    uint64 public currentEpoch;

    uint256 internal currentEpochDifficulty;
    uint256 internal prevEpochDifficulty;

    // Each epoch from genesis to the current one, keyed by their numbers.
    mapping(uint256 => Epoch) internal epochs;

    /// @notice Establish a starting point for the relay by providing the
    /// target, timestamp and blockheight of the first block of the relay
    /// genesis epoch.
    /// @param genesisHeader The first block header of the genesis epoch.
    /// @param genesisHeight The block number of the first block of the epoch.
    /// @param genesisProofLength The number of blocks required to accept a
    /// proof.
    function genesis(
        bytes calldata genesisHeader,
        uint256 genesisHeight,
        uint64 genesisProofLength
    ) external onlyOwner {
        require(!ready, "Genesis already performed");

        require(genesisHeader.length == 80, "Invalid genesis header length");

        require(
            genesisHeight % 2016 == 0,
            "Invalid height of relay genesis block"
        );

        require(genesisProofLength < 2016, "Proof length excessive");
        require(genesisProofLength > 0, "Proof length may not be zero");

        genesisEpoch = uint64(genesisHeight / 2016);
        currentEpoch = genesisEpoch;
        uint256 genesisTarget = genesisHeader.extractTarget();
        uint256 genesisTimestamp = genesisHeader.extractTimestamp();
        epochs[genesisEpoch] = Epoch(
            uint32(genesisTimestamp),
            uint224(genesisTarget)
        );
        proofLength = genesisProofLength;
        currentEpochDifficulty = BTCUtils.calculateDifficulty(genesisTarget);
        ready = true;

        emit Genesis(genesisHeight);
    }

    /// @notice Set the number of blocks required to accept a header chain.
    /// @param newLength The required number of blocks. Must be less than 2016.
    /// @dev For production, a high number (e.g. 20-50) is recommended.
    /// Small numbers are accepted but should only be used for testing.
    function setProofLength(uint64 newLength) external relayActive onlyOwner {
        require(newLength < 2016, "Proof length excessive");
        require(newLength > 0, "Proof length may not be zero");
        require(newLength != proofLength, "Proof length unchanged");
        proofLength = newLength;
        emit ProofLengthChanged(newLength);
    }

    /// @notice Add a new epoch to the relay by providing a proof
    /// of the difficulty before and after the retarget.
    /// @param headers A chain of headers including the last X blocks before
    /// the retarget, followed by the first X blocks after the retarget,
    /// where X equals the current proof length.
    /// @dev Checks that the first X blocks are valid in the most recent epoch,
    /// that the difficulty of the new epoch is calculated correctly according
    /// to the block timestamps, and that the next X blocks would be valid in
    /// the new epoch.
    /// We have no information of block heights, so we cannot enforce that
    /// retargets only happen every 2016 blocks; instead, we assume that this
    /// is the case if a valid proof of work is provided.
    /// It is possible to cheat the relay by providing X blocks from earlier in
    /// the most recent epoch, and then mining X new blocks after them.
    /// However, each of these malicious blocks would have to be mined to a
    /// higher difficulty than the legitimate ones.
    /// Alternatively, if the retarget has not been performed yet, one could
    /// first mine X blocks in the old difficulty with timestamps set far in
    /// the future, and then another X blocks at a greatly reduced difficulty.
    /// In either case, cheating the realy requires more work than mining X
    /// legitimate blocks.
    /// Only the most recent epoch is vulnerable to these attacks; once a
    /// retarget has been proven to the relay, the epoch is immutable even if a
    /// contradictory proof were to be presented later.
    function retarget(bytes memory headers) external relayActive {
        require(
            // Require proofLength headers on both sides of the retarget
            headers.length == (proofLength * 2 * 80),
            "Invalid header length"
        );

        Epoch storage latest = epochs[currentEpoch];

        uint256 oldTarget = latest.target;

        bytes32 previousHeaderDigest = bytes32(0);

        // Validate old chain
        for (uint256 i = 0; i < proofLength; i++) {
            (
                bytes32 currentDigest,
                uint256 currentHeaderTarget
            ) = validateHeader(headers, i * 80, previousHeaderDigest);

            require(
                currentHeaderTarget == oldTarget,
                "Invalid target in pre-retarget headers"
            );

            previousHeaderDigest = currentDigest;
        }

        // get timestamp of retarget block
        uint256 epochEndTimestamp = headers.extractTimestampAt(
            (proofLength - 1) * 80
        );

        // Expected target is the full-length target
        uint256 expectedTarget = BTCUtils.retargetAlgorithm(
            oldTarget,
            latest.timestamp,
            epochEndTimestamp
        );

        // Mined target is the header-encoded target
        uint256 minedTarget = 0;

        uint256 epochStartTimestamp = headers.extractTimestampAt(
            proofLength * 80
        );

        // validate new chain
        for (uint256 j = proofLength; j < proofLength * 2; j++) {
            (
                bytes32 _currentDigest,
                uint256 _currentHeaderTarget
            ) = validateHeader(headers, j * 80, previousHeaderDigest);

            if (minedTarget == 0) {
                // The new target has not been set, so check its correctness
                minedTarget = _currentHeaderTarget;
                require(
                    // Mask full-length target with header-encoded target
                    // (full & truncated) == truncated
                    _currentHeaderTarget ==
                        (expectedTarget & _currentHeaderTarget),
                    "Invalid target in new epoch"
                );
            } else {
                // The new target has been set, so remaining targets should match
                require(
                    _currentHeaderTarget == minedTarget,
                    "Unexpected target change after retarget"
                );
            }

            previousHeaderDigest = _currentDigest;
        }

        currentEpoch = currentEpoch + 1;

        epochs[currentEpoch] = Epoch(
            uint32(epochStartTimestamp),
            uint224(minedTarget)
        );

        uint256 oldDifficulty = currentEpochDifficulty;
        uint256 newDifficulty = BTCUtils.calculateDifficulty(minedTarget);

        prevEpochDifficulty = oldDifficulty;
        currentEpochDifficulty = newDifficulty;

        emit Retarget(oldDifficulty, newDifficulty);
    }

    /// @notice Check whether a given chain of headers should be accepted as
    /// valid within the rules of the relay.
    /// @param headers A chain of 2-2016 bitcoin headers.
    /// @return valid True if the headers are valid according to the relay.
    /// If the validation fails, this function throws an exception.
    /// @dev A chain of headers is accepted as valid if:
    /// - It has the correct length required for a proof.
    /// - Headers in the chain are sequential and refer to previous digests.
    /// - Each header is mined with the correct amount of work.
    /// - The difficulty in each header matches an epoch of the relay,
    ///   as determined by the headers' timestamps. The headers must be between
    ///   the genesis epoch and the latest proven epoch (inclusive).
    /// If the chain contains a retarget, it is accepted if the retarget has
    /// already been proven to the relay.
    /// If the chain contains blocks of an epoch that has not been proven to
    /// the relay (after a retarget within the header chain, or when the entire
    /// chain falls within an epoch that has not been proven yet), it will be
    /// rejected.
    /// One exception to this is when two subsequent epochs have exactly the
    /// same difficulty; headers from the latter epoch will be accepted if the
    /// previous epoch has been proven to the relay.
    /// This is because it is not possible to distinguish such headers from
    /// headers of the previous epoch.
    ///
    /// If the difficulty increases significantly between relay genesis and the
    /// present, creating fraudulent proofs for earlier epochs becomes easier.
    /// Users of the relay should check the timestamps of valid headers and
    /// only accept appropriately recent ones.
    function validateChain(bytes memory headers)
        external
        view
        relayActive
        returns (bool valid)
    {
        require(headers.length % 80 == 0, "Invalid header length");

        uint256 headerCount = headers.length / 80;

        require(
            headerCount > 1 && headerCount < 2016,
            "Invalid number of headers"
        );

        uint256 currentHeaderTimestamp = headers.extractTimestamp();

        uint256 relevantEpoch = currentEpoch;

        // timestamp of the epoch the header chain starts in
        uint256 startingEpochTimestamp = epochs[currentEpoch].timestamp;
        // timestamp of the next epoch after that
        uint256 nextEpochTimestamp = 0;

        // Find the correct epoch for the given chain
        // Fastest with recent epochs, but able to handle anything after genesis
        while (currentHeaderTimestamp < startingEpochTimestamp) {
            relevantEpoch -= 1;
            nextEpochTimestamp = startingEpochTimestamp;
            startingEpochTimestamp = epochs[relevantEpoch].timestamp;
            require(
                // This works because every epoch starting from genesis has
                // a recorded timestamp, so a timestamp of zero means we have
                // reached before the genesis.
                startingEpochTimestamp > 0,
                "Cannot validate chains before relay genesis"
            );
        }

        uint256 relevantTarget = epochs[relevantEpoch].target;

        // Short-circuit the first header's validation.
        (
            bytes32 previousHeaderDigest,
            uint256 currentHeaderTarget
        ) = validateHeader(headers, 0, bytes32(0));

        require(
            currentHeaderTarget == relevantTarget,
            "Invalid target in header chain"
        );
         
        for (uint256 i = 1; i < headerCount; i++) {
            uint256 previousHeaderTimestamp = currentHeaderTimestamp;
            bytes32 currentDigest;
            (
                currentDigest,
                currentHeaderTarget
            ) = validateHeader(headers, i * 80, previousHeaderDigest);

            currentHeaderTimestamp = headers.extractTimestampAt(i * 80);

            require(
                currentHeaderTimestamp > previousHeaderTimestamp,
                "Invalid timestamp in header chain"
            );

            // If next epoch timestamp exists, a valid retarget is possible
            // (if next epoch timestamp doesn't exist, either a retarget has
            // already happened in this chain, or the relay needs a retarget
            // before this chain can be validated).
            // If current header's timestamp equals the next epoch timestamp,
            // it can be a valid retarget.
            if (
                currentHeaderTimestamp == nextEpochTimestamp &&
                nextEpochTimestamp != 0
            ) {
                // Set the expected target for all remaining headers, including
                // this one, and zero out the next epoch timestamp to signify
                // that no further retarget is acceptable.
                relevantTarget = epochs[relevantEpoch + 1].target;
                nextEpochTimestamp = 0;
            }

            require(
                currentHeaderTarget == relevantTarget,
                "Invalid target in header chain"
            );

            previousHeaderDigest = currentDigest;
        }

        return true;
    }

    /// @notice Get the difficulty of the specified block.
    /// @param blockNumber The number of the block. Must fall within the relay
    /// range (at or after the relay genesis, and at or before the end of the
    /// most recent epoch proven to the relay).
    /// @return The difficulty of the epoch.
    function getBlockDifficulty(uint256 blockNumber)
        external
        view
        relayActive
        returns (uint256)
    {
        return getEpochDifficulty(blockNumber / 2016);
    }

    /// @notice Get the difficulty of the specified epoch.
    /// @param epochNumber The number of the epoch (the height of the first
    /// block of the epoch, divided by 2016). Must fall within the relay range.
    /// @return The difficulty of the epoch.
    function getEpochDifficulty(uint256 epochNumber)
        public
        view
        relayActive
        returns (uint256)
    {
        require(epochNumber >= genesisEpoch, "Epoch is before relay genesis");
        require(
            epochNumber <= currentEpoch,
            "Epoch is not proven to the relay yet"
        );
        return BTCUtils.calculateDifficulty(epochs[epochNumber].target);
    }

    /// @notice Get the range of blocks the relay can accept proofs for.
    /// @dev Assumes that the genesis has been set correctly.
    /// Additionally, if the next epoch after the current one has the exact
    /// same difficulty, headers for it can be validated as well.
    /// This function should be used for informative purposes,
    /// e.g. to determine whether a retarget must be provided before submitting
    /// a header chain for validation.
    /// @return relayGenesis The height of the earliest block that can be
    /// included in header chains for the relay to validate.
    /// @return currentEpochEnd The height of the last block that can be
    /// included in header chains for the relay to validate.
    function getRelayRange()
        external
        view
        relayActive
        returns (uint256 relayGenesis, uint256 currentEpochEnd)
    {
        relayGenesis = genesisEpoch * 2016;
        currentEpochEnd = (currentEpoch * 2016) + 2015;
    }

    /// @notice Returns the difficulty of the current epoch.
    /// @dev returns 0 if the relay is not ready.
    /// @return The difficulty of the current epoch.
    function getCurrentEpochDifficulty() external view returns (uint256) {
        return currentEpochDifficulty;
    }

    /// @notice Returns the difficulty of the previous epoch.
    /// @dev Returns 0 if the relay is not ready or has not had a retarget.
    /// @return The difficulty of the previous epoch.
    function getPrevEpochDifficulty() external view returns (uint256) {
        return prevEpochDifficulty;
    }

    function getCurrentAndPrevEpochDifficulty()
        external
        view
        returns (uint256 current, uint256 previous)
    {
        return (currentEpochDifficulty, prevEpochDifficulty);
    }

    /// @notice Check that the specified header forms a correct chain with the
    /// digest of the previous header (if provided), and has sufficient work.
    /// @param headers The byte array containing the header of interest.
    /// @param start The start of the header in the array.
    /// @param prevDigest The digest of the previous header
    /// (optional; providing zeros for the digest skips the check).
    /// @return digest The digest of the current header.
    /// @return target The PoW target of the header.
    /// @dev Throws an exception if the header's chain or PoW are invalid.
    /// Performs no other validation.
    function validateHeader(
        bytes memory headers,
        uint256 start,
        bytes32 prevDigest
    ) internal view returns (bytes32 digest, uint256 target) {
        // If previous block digest has been provided, require that it matches
        if (prevDigest != bytes32(0)) {
            require(
                headers.validateHeaderPrevHash(start, prevDigest),
                "Invalid chain"
            );
        }

        // Require that the header has sufficient work for its stated target
        target = headers.extractTargetAt(start);
        digest = headers.hash256Slice(start, 80);
        require(ValidateSPV.validateHeaderWork(digest, target), "Invalid work");

        return (digest, target);
    }

    modifier relayActive() {
        require(ready, "Relay is not ready for use");
        _;
    }
}
