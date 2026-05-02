// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @notice Implements 0G Agent ID standard. Each agent has on-chain identity,
 *         metadata pointer (0G Storage hash), and reputation score.
 */
contract AgentRegistry is Ownable {
    struct AgentProfile {
        bytes32 agentId;
        address owner;
        bytes32 metadataHash;
        uint256 reputationScore;
        uint256 totalTasks;
        uint256 successfulTasks;
        uint256 disputedTasks;
        uint256 registeredAt;
        bool isActive;
    }

    mapping(bytes32 => AgentProfile) public agents;
    mapping(address => bytes32[]) public ownerAgents;

    address public reputationOracle;

    event AgentRegistered(bytes32 indexed agentId, address indexed owner);
    event ReputationUpdated(bytes32 indexed agentId, uint256 newScore);
    event MetadataUpdated(bytes32 indexed agentId, bytes32 newHash);

    constructor() Ownable(msg.sender) {}

    function registerAgent(bytes32 agentId, bytes32 metadataHash) external {
        require(agents[agentId].registeredAt == 0, "Agent exists");
        agents[agentId] = AgentProfile({
            agentId: agentId,
            owner: msg.sender,
            metadataHash: metadataHash,
            reputationScore: 5000,
            totalTasks: 0,
            successfulTasks: 0,
            disputedTasks: 0,
            registeredAt: block.timestamp,
            isActive: true
        });
        ownerAgents[msg.sender].push(agentId);
        emit AgentRegistered(agentId, msg.sender);
    }

    function recordTaskOutcome(bytes32 agentId, bool success, bool disputed) external {
        require(msg.sender == reputationOracle, "Only oracle");
        AgentProfile storage a = agents[agentId];
        require(a.registeredAt != 0, "Not registered");
        a.totalTasks++;
        if (success) a.successfulTasks++;
        if (disputed) a.disputedTasks++;

        uint256 successRate = a.totalTasks == 0
            ? 5000
            : (a.successfulTasks * 10000) / a.totalTasks;
        uint256 disputePenalty = (a.disputedTasks * 500) / (a.totalTasks + 1);
        a.reputationScore = successRate > disputePenalty ? successRate - disputePenalty : 0;
        emit ReputationUpdated(agentId, a.reputationScore);
    }

    function setReputationOracle(address _oracle) external onlyOwner {
        reputationOracle = _oracle;
    }

    function updateMetadata(bytes32 agentId, bytes32 newHash) external {
        require(agents[agentId].owner == msg.sender, "Not owner");
        agents[agentId].metadataHash = newHash;
        emit MetadataUpdated(agentId, newHash);
    }
}
