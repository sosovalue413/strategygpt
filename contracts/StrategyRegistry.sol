// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title StrategyGPT AI Strategy Registry
/// @notice Stores immutable attestations for generated strategy research reports.
contract StrategyRegistry {
    string public constant VERSION = "1.0.0";
    uint256 public constant MAX_SYMBOL_LENGTH = 16;
    uint256 public constant MAX_METADATA_URI_LENGTH = 2048;

    struct Attestation {
        address researcher;
        string symbol;
        string metadataURI;
        uint256 riskScore;
        uint256 createdAt;
    }

    mapping(bytes32 strategyHash => Attestation) public attestations;

    event StrategyRecorded(
        address indexed researcher,
        bytes32 indexed strategyHash,
        string symbol,
        string metadataURI,
        uint256 riskScore,
        uint256 createdAt
    );

    error EmptyStrategyHash();
    error AlreadyRecorded(bytes32 strategyHash);
    error RiskScoreTooHigh(uint256 riskScore);
    error SymbolTooLong();
    error MetadataURITooLong();

    function recordStrategy(bytes32 strategyHash, string calldata symbol, string calldata metadataURI, uint256 riskScore) external {
        if (strategyHash == bytes32(0)) revert EmptyStrategyHash();
        if (attestations[strategyHash].createdAt != 0) revert AlreadyRecorded(strategyHash);
        if (riskScore > 100) revert RiskScoreTooHigh(riskScore);
        if (bytes(symbol).length > MAX_SYMBOL_LENGTH) revert SymbolTooLong();
        if (bytes(metadataURI).length > MAX_METADATA_URI_LENGTH) revert MetadataURITooLong();

        attestations[strategyHash] = Attestation({
            researcher: msg.sender,
            symbol: symbol,
            metadataURI: metadataURI,
            riskScore: riskScore,
            createdAt: block.timestamp
        });

        emit StrategyRecorded(msg.sender, strategyHash, symbol, metadataURI, riskScore, block.timestamp);
    }

    function isRecorded(bytes32 strategyHash) external view returns (bool) {
        return attestations[strategyHash].createdAt != 0;
    }
}
