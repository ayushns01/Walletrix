// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {BaseAccount} from "@account-abstraction/core/BaseAccount.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {
    PackedUserOperation
} from "@account-abstraction/interfaces/PackedUserOperation.sol";
import {SIG_VALIDATION_FAILED} from "@account-abstraction/core/Helpers.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {
    MessageHashUtils
} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {
    Initializable
} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {
    UUPSUpgradeable
} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title WalletrixVault
 * @author Walletrix Team
 * @notice ERC-4337 compliant Smart Account with EIP-712 signature validation,
 *         batch execution, role-based permissions, and social recovery.
 * @dev Inherits BaseAccount from eth-infinitism's account-abstraction v0.7.
 *      Deployed via WalletrixVaultFactory using CREATE2 for deterministic addresses.
 *      The user's BIP-39 derived EOA acts as the "owner" (signer) of this vault.
 */
contract WalletrixVault is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ──────────────────────────────────────────────
    //  Constants & Immutables
    // ──────────────────────────────────────────────

    /// @dev ERC-4337 EntryPoint singleton (immutable per deployment)
    IEntryPoint private immutable _ENTRY_POINT;

    /// @dev Recovery timelock duration (48 hours)
    uint256 public constant RECOVERY_TIMELOCK = 48 hours;

    /// @dev Maximum number of guardians allowed
    uint256 public constant MAX_GUARDIANS = 10;

    // ──────────────────────────────────────────────
    //  Storage
    // ──────────────────────────────────────────────

    /// @notice The EOA address that owns and controls this vault
    address public owner;

    // ── Role-Based Permissions ──

    /// @notice Role definitions
    enum Role {
        NONE,
        EXECUTOR, // Can execute transactions via the vault
        GUARDIAN // Can participate in social recovery
    }

    /// @notice Mapping of address => assigned role
    mapping(address => Role) public roles;

    // ── Guardian / Social Recovery ──

    /// @notice List of guardian addresses
    address[] public guardians;

    /// @notice Required number of guardian signatures for recovery
    uint256 public recoveryThreshold;

    /// @notice Pending recovery request
    struct RecoveryRequest {
        address newOwner;
        uint256 executeAfter; // Timestamp after which recovery can execute
        uint256 approvalCount;
        mapping(address => bool) approvals;
    }

    RecoveryRequest private _pendingRecovery;

    /// @notice Whether a recovery is currently pending
    bool public recoveryPending;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event VaultInitialized(address indexed entryPoint, address indexed owner);
    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event RoleAssigned(address indexed account, Role role);
    event RoleRevoked(address indexed account);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event RecoveryThresholdSet(uint256 threshold);
    event RecoveryInitiated(address indexed newOwner, uint256 executeAfter);
    event RecoveryApproved(address indexed guardian, address indexed newOwner);
    event RecoveryExecuted(address indexed oldOwner, address indexed newOwner);
    event RecoveryCancelled();

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error OnlyOwner();
    error OnlyOwnerOrEntryPoint();
    error OnlyGuardian();
    error InvalidOwner();
    error InvalidGuardian();
    error GuardianAlreadyExists();
    error GuardianNotFound();
    error MaxGuardiansReached();
    error InvalidThreshold();
    error NoRecoveryPending();
    error RecoveryAlreadyPending();
    error RecoveryTimelockNotExpired();
    error AlreadyApproved();
    error RecoveryNotReady();

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function _onlyOwner() internal view {
        if (msg.sender != owner) revert OnlyOwner();
    }

    modifier onlyOwnerOrEntryPoint() {
        _onlyOwnerOrEntryPoint();
        _;
    }

    function _onlyOwnerOrEntryPoint() internal view {
        if (msg.sender != owner && msg.sender != address(entryPoint())) {
            revert OnlyOwnerOrEntryPoint();
        }
    }

    modifier onlyGuardian() {
        _onlyGuardian();
        _;
    }

    function _onlyGuardian() internal view {
        if (roles[msg.sender] != Role.GUARDIAN) revert OnlyGuardian();
    }

    // ──────────────────────────────────────────────
    //  Constructor & Initialization
    // ──────────────────────────────────────────────

    /// @dev EntryPoint is set once at deploy time (immutable).
    ///      The proxy pattern means `initialize` is called separately.
    constructor(IEntryPoint entryPointAddr) {
        _ENTRY_POINT = entryPointAddr;
        _disableInitializers();
    }

    /**
     * @notice Initialize the vault with an owner EOA.
     * @dev Called once by the Factory after CREATE2 deployment.
     * @param initialOwner The EOA address derived from the user's BIP-39 mnemonic.
     */
    function initialize(address initialOwner) external initializer {
        if (initialOwner == address(0)) revert InvalidOwner();
        owner = initialOwner;
        emit VaultInitialized(address(_ENTRY_POINT), initialOwner);
    }

    // ──────────────────────────────────────────────
    //  ERC-4337: Core Interface
    // ──────────────────────────────────────────────

    /// @inheritdoc BaseAccount
    function entryPoint() public view override returns (IEntryPoint) {
        return _ENTRY_POINT;
    }

    /**
     * @notice Validate the EIP-712 signature provided in the UserOperation.
     * @dev The `userOpHash` is produced by the EntryPoint and includes:
     *      hash(userOp) + entryPointAddress + chainId
     *      This prevents cross-chain and cross-entrypoint replay attacks.
     *      We recover the signer from the signature and verify it matches `owner`.
     * @param userOp The packed user operation containing the signature.
     * @param userOpHash The hash of the user operation (produced by EntryPoint).
     * @return validationData 0 if valid, SIG_VALIDATION_FAILED (1) otherwise.
     */
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        // Convert the hash to an Ethereum Signed Message hash (EIP-191)
        bytes32 ethSignedHash = userOpHash.toEthSignedMessageHash();

        // Recover the signer from the signature
        address recovered = ethSignedHash.recover(userOp.signature);

        // If signer is not the owner, return failure
        if (recovered != owner) {
            return SIG_VALIDATION_FAILED;
        }

        return 0;
    }

    // ──────────────────────────────────────────────
    //  Execution (Override for role-based access)
    // ──────────────────────────────────────────────

    /**
     * @notice Override the execution guard to allow owner OR EntryPoint.
     * @dev BaseAccount defaults to only allowing EntryPoint. We extend this
     *      so the owner EOA can also call execute/executeBatch directly.
     */
    function _requireForExecute() internal view override {
        if (msg.sender != owner && msg.sender != address(entryPoint())) {
            revert OnlyOwnerOrEntryPoint();
        }
    }

    // ──────────────────────────────────────────────
    //  Role-Based Permissions
    // ──────────────────────────────────────────────

    /**
     * @notice Assign a role to an address.
     * @param account The address to assign the role to.
     * @param role The role to assign (EXECUTOR or GUARDIAN).
     */
    function assignRole(address account, Role role) external onlyOwner {
        if (account == address(0)) revert InvalidGuardian();
        roles[account] = role;
        emit RoleAssigned(account, role);
    }

    /**
     * @notice Revoke a role from an address.
     * @param account The address to revoke the role from.
     */
    function revokeRole(address account) external onlyOwner {
        roles[account] = Role.NONE;
        emit RoleRevoked(account);
    }

    // ──────────────────────────────────────────────
    //  Guardian Management
    // ──────────────────────────────────────────────

    /**
     * @notice Add a guardian for social recovery.
     * @param guardian The guardian's address.
     */
    function addGuardian(address guardian) external onlyOwner {
        if (guardian == address(0) || guardian == owner)
            revert InvalidGuardian();
        if (roles[guardian] == Role.GUARDIAN) revert GuardianAlreadyExists();
        if (guardians.length >= MAX_GUARDIANS) revert MaxGuardiansReached();

        guardians.push(guardian);
        roles[guardian] = Role.GUARDIAN;

        emit GuardianAdded(guardian);
    }

    /**
     * @notice Remove a guardian.
     * @param guardian The guardian's address to remove.
     */
    function removeGuardian(address guardian) external onlyOwner {
        if (roles[guardian] != Role.GUARDIAN) revert GuardianNotFound();

        // Remove from the guardians array (swap & pop)
        uint256 len = guardians.length;
        for (uint256 i = 0; i < len; ) {
            if (guardians[i] == guardian) {
                guardians[i] = guardians[len - 1];
                guardians.pop();
                break;
            }
            unchecked {
                ++i;
            }
        }

        roles[guardian] = Role.NONE;

        // If threshold is now higher than guardian count, adjust it
        if (recoveryThreshold > guardians.length) {
            recoveryThreshold = guardians.length;
            emit RecoveryThresholdSet(recoveryThreshold);
        }

        emit GuardianRemoved(guardian);
    }

    /**
     * @notice Set the number of guardian approvals required for recovery.
     * @param threshold The M-of-N threshold.
     */
    function setRecoveryThreshold(uint256 threshold) external onlyOwner {
        if (threshold == 0 || threshold > guardians.length)
            revert InvalidThreshold();
        recoveryThreshold = threshold;
        emit RecoveryThresholdSet(threshold);
    }

    /**
     * @notice Get the current number of guardians.
     */
    function getGuardianCount() external view returns (uint256) {
        return guardians.length;
    }

    /**
     * @notice Get the list of all guardian addresses.
     */
    function getGuardians() external view returns (address[] memory) {
        return guardians;
    }

    // ──────────────────────────────────────────────
    //  Social Recovery (with Timelock)
    // ──────────────────────────────────────────────

    /**
     * @notice Initiate a recovery request to change the vault owner.
     * @dev Only callable by a guardian. Starts a 48-hour timelock.
     *      Recovery must be approved by `recoveryThreshold` guardians.
     * @param newOwner The proposed new owner address.
     */
    function initiateRecovery(address newOwner) external onlyGuardian {
        if (newOwner == address(0)) revert InvalidOwner();
        if (recoveryPending) revert RecoveryAlreadyPending();
        if (recoveryThreshold == 0) revert InvalidThreshold();

        _pendingRecovery.newOwner = newOwner;
        _pendingRecovery.executeAfter = block.timestamp + RECOVERY_TIMELOCK;
        _pendingRecovery.approvalCount = 1;
        _pendingRecovery.approvals[msg.sender] = true;
        recoveryPending = true;

        emit RecoveryInitiated(newOwner, _pendingRecovery.executeAfter);
        emit RecoveryApproved(msg.sender, newOwner);
    }

    /**
     * @notice Approve a pending recovery request.
     * @dev Only callable by guardians who haven't already approved.
     */
    function approveRecovery() external onlyGuardian {
        if (!recoveryPending) revert NoRecoveryPending();
        if (_pendingRecovery.approvals[msg.sender]) revert AlreadyApproved();

        _pendingRecovery.approvals[msg.sender] = true;
        _pendingRecovery.approvalCount++;

        emit RecoveryApproved(msg.sender, _pendingRecovery.newOwner);
    }

    /**
     * @notice Execute a recovery after the timelock has expired and threshold is met.
     * @dev Anyone can call this once conditions are met (timelock + approvals).
     */
    function executeRecovery() external {
        if (!recoveryPending) revert NoRecoveryPending();
        if (block.timestamp < _pendingRecovery.executeAfter) {
            revert RecoveryTimelockNotExpired();
        }
        if (_pendingRecovery.approvalCount < recoveryThreshold) {
            revert RecoveryNotReady();
        }

        address oldOwner = owner;
        address newOwner = _pendingRecovery.newOwner;

        // Transfer ownership
        owner = newOwner;

        // Clear recovery state
        _clearRecovery();

        emit RecoveryExecuted(oldOwner, newOwner);
        emit OwnerChanged(oldOwner, newOwner);
    }

    /**
     * @notice Cancel a pending recovery. Only the current owner can cancel.
     * @dev This is the safety mechanism — if the owner still has their key,
     *      they can cancel a malicious recovery attempt within the timelock period.
     */
    function cancelRecovery() external onlyOwner {
        if (!recoveryPending) revert NoRecoveryPending();
        _clearRecovery();
        emit RecoveryCancelled();
    }

    /**
     * @dev Internal helper to clear all recovery state.
     */
    function _clearRecovery() internal {
        // Clear guardian approvals
        uint256 len = guardians.length;
        for (uint256 i = 0; i < len; ) {
            _pendingRecovery.approvals[guardians[i]] = false;
            unchecked {
                ++i;
            }
        }

        _pendingRecovery.newOwner = address(0);
        _pendingRecovery.executeAfter = 0;
        _pendingRecovery.approvalCount = 0;
        recoveryPending = false;
    }

    // ──────────────────────────────────────────────
    //  UUPS Upgrade Authorization
    // ──────────────────────────────────────────────

    /// @dev Only the owner can authorize contract upgrades.
    function _authorizeUpgrade(address) internal view override onlyOwner {}

    // ──────────────────────────────────────────────
    //  ETH Receive
    // ──────────────────────────────────────────────

    /// @notice Allow the vault to receive ETH directly.
    receive() external payable {}
}
