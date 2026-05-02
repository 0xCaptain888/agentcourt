// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./TaskRegistry.sol";

/**
 * @title DisputeResolution
 * @notice Decentralized arbitration for AI agent task disputes.
 *         Holds escrow, listens to disputes, awaits TEE-arbiter verdict, distributes funds.
 */
contract DisputeResolution is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    enum DisputeStatus { Pending, UnderReview, Resolved, Cancelled }
    enum Verdict { None, FavorClient, FavorExecutor, Split, Invalid }

    struct Dispute {
        bytes32 disputeId;
        bytes32 taskId;
        address client;
        address executor;
        uint256 escrow;
        bytes32 evidenceHash;
        DisputeStatus status;
        Verdict verdict;
        uint256 splitClientBps;
        bytes verdictAttestation;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    TaskRegistry public taskRegistry;
    address public arbiterTeeSigner;
    uint256 public minEscrow = 0.01 ether;
    uint256 public arbitrationFeeBps = 200;

    mapping(bytes32 => Dispute) public disputes;
    bytes32[] public disputeIds;

    event DisputeSubmitted(
        bytes32 indexed disputeId,
        bytes32 indexed taskId,
        address indexed client,
        address executor,
        uint256 escrow
    );
    event DisputeResolved(
        bytes32 indexed disputeId,
        Verdict verdict,
        uint256 clientAmount,
        uint256 executorAmount,
        uint256 protocolFee
    );

    constructor(address _taskRegistry, address _arbiterTeeSigner) Ownable(msg.sender) {
        taskRegistry = TaskRegistry(_taskRegistry);
        arbiterTeeSigner = _arbiterTeeSigner;
    }

    function submitDispute(
        bytes32 taskId,
        address executor,
        bytes32 evidenceHash
    ) external payable nonReentrant returns (bytes32) {
        require(msg.value >= minEscrow, "Escrow too low");
        require(executor != address(0) && executor != msg.sender, "Invalid executor");

        bytes32 disputeId = keccak256(
            abi.encodePacked(taskId, msg.sender, executor, block.timestamp, block.prevrandao)
        );
        require(disputes[disputeId].createdAt == 0, "Dispute exists");

        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            taskId: taskId,
            client: msg.sender,
            executor: executor,
            escrow: msg.value,
            evidenceHash: evidenceHash,
            status: DisputeStatus.Pending,
            verdict: Verdict.None,
            splitClientBps: 0,
            verdictAttestation: "",
            createdAt: block.timestamp,
            resolvedAt: 0
        });
        disputeIds.push(disputeId);

        try taskRegistry.setStatus(taskId, TaskRegistry.TaskStatus.Disputed) {} catch {}

        emit DisputeSubmitted(disputeId, taskId, msg.sender, executor, msg.value);
        return disputeId;
    }

    function resolveDispute(
        bytes32 disputeId,
        Verdict verdict,
        uint256 splitClientBps,
        bytes calldata teeAttestation
    ) external nonReentrant {
        Dispute storage d = disputes[disputeId];
        require(d.createdAt != 0, "Dispute not found");
        require(d.status == DisputeStatus.Pending, "Already resolved");
        require(verdict != Verdict.None, "Invalid verdict");
        if (verdict == Verdict.Split) {
            require(splitClientBps <= 10000, "Bps overflow");
        }

        bytes32 payload = keccak256(
            abi.encodePacked(disputeId, uint8(verdict), splitClientBps)
        );
        bytes32 ethSigned = payload.toEthSignedMessageHash();
        require(ECDSA.recover(ethSigned, teeAttestation) == arbiterTeeSigner, "Bad arbiter sig");

        d.status = DisputeStatus.Resolved;
        d.verdict = verdict;
        d.splitClientBps = splitClientBps;
        d.verdictAttestation = teeAttestation;
        d.resolvedAt = block.timestamp;

        uint256 fee = (d.escrow * arbitrationFeeBps) / 10000;
        uint256 distributable = d.escrow - fee;
        uint256 clientAmount;
        uint256 executorAmount;

        if (verdict == Verdict.FavorClient) {
            clientAmount = distributable;
        } else if (verdict == Verdict.FavorExecutor) {
            executorAmount = distributable;
        } else if (verdict == Verdict.Split) {
            clientAmount = (distributable * splitClientBps) / 10000;
            executorAmount = distributable - clientAmount;
        } else {
            clientAmount = distributable;
        }

        if (clientAmount > 0) {
            (bool ok1, ) = d.client.call{value: clientAmount}("");
            require(ok1, "Pay client failed");
        }
        if (executorAmount > 0) {
            (bool ok2, ) = d.executor.call{value: executorAmount}("");
            require(ok2, "Pay executor failed");
        }

        try taskRegistry.setStatus(d.taskId, TaskRegistry.TaskStatus.Resolved) {} catch {}

        emit DisputeResolved(disputeId, verdict, clientAmount, executorAmount, fee);
    }

    function setArbiterSigner(address _signer) external onlyOwner {
        arbiterTeeSigner = _signer;
    }

    function setMinEscrow(uint256 _amount) external onlyOwner {
        minEscrow = _amount;
    }

    function withdrawProtocolFees(address payable to) external onlyOwner {
        uint256 bal = address(this).balance;
        (bool ok, ) = to.call{value: bal}("");
        require(ok, "Withdraw failed");
    }

    function getDisputeCount() external view returns (uint256) {
        return disputeIds.length;
    }
}
