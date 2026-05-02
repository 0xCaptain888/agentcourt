// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title TaskRegistry
 * @notice Anchors execution log Merkle root hashes from 0G Storage on-chain.
 *         Each task records: taskId, agentId, logRootHash, teeAttestation, timestamp.
 */
contract TaskRegistry is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct TaskRecord {
        bytes32 taskId;
        address agentAddress;
        bytes32 agentId;
        bytes32 logRootHash;
        bytes32 kvIndexHash;
        bytes teeAttestation;
        uint256 timestamp;
        TaskStatus status;
    }

    enum TaskStatus { Active, Disputed, Resolved, Invalidated }

    mapping(bytes32 => TaskRecord) public tasks;
    mapping(address => bytes32[]) public agentTasks;
    mapping(bytes32 => bytes32[]) public agentIdTasks;

    address public teeSigner;
    address public disputeResolver;

    event TaskAnchored(
        bytes32 indexed taskId,
        address indexed agent,
        bytes32 indexed agentId,
        bytes32 logRootHash
    );
    event TaskStatusChanged(bytes32 indexed taskId, TaskStatus newStatus);
    event TeeSignerUpdated(address indexed oldSigner, address indexed newSigner);

    constructor(address _teeSigner) Ownable(msg.sender) {
        teeSigner = _teeSigner;
    }

    function anchorTask(
        bytes32 taskId,
        bytes32 agentId,
        bytes32 logRootHash,
        bytes32 kvIndexHash,
        bytes calldata teeAttestation
    ) external {
        require(tasks[taskId].timestamp == 0, "Task already anchored");
        require(logRootHash != bytes32(0), "Invalid logRootHash");

        bytes32 messagePayload = keccak256(
            abi.encodePacked(taskId, agentId, logRootHash, kvIndexHash)
        );
        bytes32 ethSigned = messagePayload.toEthSignedMessageHash();
        address recovered = ECDSA.recover(ethSigned, teeAttestation);
        require(recovered == teeSigner, "Invalid TEE signature");

        tasks[taskId] = TaskRecord({
            taskId: taskId,
            agentAddress: msg.sender,
            agentId: agentId,
            logRootHash: logRootHash,
            kvIndexHash: kvIndexHash,
            teeAttestation: teeAttestation,
            timestamp: block.timestamp,
            status: TaskStatus.Active
        });

        agentTasks[msg.sender].push(taskId);
        agentIdTasks[agentId].push(taskId);

        emit TaskAnchored(taskId, msg.sender, agentId, logRootHash);
    }

    function setStatus(bytes32 taskId, TaskStatus newStatus) external {
        require(msg.sender == disputeResolver || msg.sender == owner(), "Unauthorized");
        require(tasks[taskId].timestamp != 0, "Task not found");
        tasks[taskId].status = newStatus;
        emit TaskStatusChanged(taskId, newStatus);
    }

    function setDisputeResolver(address _resolver) external onlyOwner {
        disputeResolver = _resolver;
    }

    function setTeeSigner(address _newSigner) external onlyOwner {
        emit TeeSignerUpdated(teeSigner, _newSigner);
        teeSigner = _newSigner;
    }

    function getTaskCount(address agent) external view returns (uint256) {
        return agentTasks[agent].length;
    }

    function getAgentIdTasks(bytes32 agentId) external view returns (bytes32[] memory) {
        return agentIdTasks[agentId];
    }
}
