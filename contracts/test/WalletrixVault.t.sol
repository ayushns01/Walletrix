// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {WalletrixVault} from "../src/WalletrixVault.sol";
import {WalletrixVaultFactory} from "../src/WalletrixVaultFactory.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {
    PackedUserOperation
} from "@account-abstraction/interfaces/PackedUserOperation.sol";
import {
    MessageHashUtils
} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title WalletrixVaultTest
 * @notice Comprehensive Foundry tests for WalletrixVault and WalletrixVaultFactory.
 *         Covers: deployment, EIP-712 signature validation, batch execution,
 *         role-based permissions, guardian management, social recovery with timelock.
 */
contract WalletrixVaultTest is Test {
    using MessageHashUtils for bytes32;

    // ── Test Actors ──
    WalletrixVaultFactory public factory;
    WalletrixVault public vault;
    IEntryPoint public entryPoint;

    address public owner;
    uint256 public ownerKey;

    address public guardian1;
    address public guardian2;
    address public guardian3;

    address public attacker;
    uint256 public attackerKey;

    address public newOwner;

    uint256 public constant SALT = 0;

    // ── Setup ──

    function setUp() public {
        // Generate deterministic test accounts
        (owner, ownerKey) = makeAddrAndKey("owner");
        guardian1 = makeAddr("guardian1");
        guardian2 = makeAddr("guardian2");
        guardian3 = makeAddr("guardian3");
        (attacker, attackerKey) = makeAddrAndKey("attacker");
        newOwner = makeAddr("newOwner");

        // Use the canonical ERC-4337 v0.7 EntryPoint address
        entryPoint = IEntryPoint(0x0000000071727De22E5E9d8BAf0edAc6f37da032);

        // Deploy the EntryPoint mock bytecode at the canonical address
        vm.etch(address(entryPoint), hex"00");

        // Deploy factory (which deploys the implementation internally)
        factory = new WalletrixVaultFactory(entryPoint);

        // Deploy a vault for our test owner
        vault = factory.createAccount(owner, SALT);

        // Fund the vault with ETH
        vm.deal(address(vault), 10 ether);
    }

    // ──────────────────────────────────────────────
    //  Deployment Tests
    // ──────────────────────────────────────────────

    function test_DeploymentSetsOwner() public view {
        assertEq(vault.owner(), owner, "Owner should be set to the EOA");
    }

    function test_DeploymentSetsEntryPoint() public view {
        assertEq(
            address(vault.entryPoint()),
            address(entryPoint),
            "EntryPoint should match"
        );
    }

    function test_FactoryDeterministicAddress() public view {
        address predicted = factory.getAddress(owner, SALT);
        assertEq(
            address(vault),
            predicted,
            "Deployed address should match predicted CREATE2 address"
        );
    }

    function test_FactoryIdempotent() public {
        // Calling createAccount again with same params returns existing vault
        WalletrixVault vault2 = factory.createAccount(owner, SALT);
        assertEq(
            address(vault),
            address(vault2),
            "Second deployment should return existing vault"
        );
    }

    function test_FactoryDifferentSalts() public {
        WalletrixVault vault2 = factory.createAccount(owner, 1);
        assertTrue(
            address(vault) != address(vault2),
            "Different salts should produce different addresses"
        );
    }

    function test_CannotReinitialize() public {
        vm.expectRevert();
        vault.initialize(attacker);
    }

    // ──────────────────────────────────────────────
    //  Signature Validation Tests
    // ──────────────────────────────────────────────

    function test_ValidSignatureReturnsZero() public {
        // Simulate a userOpHash
        bytes32 userOpHash = keccak256("test_operation");
        bytes32 ethSignedHash = userOpHash.toEthSignedMessageHash();

        // Owner signs the hash
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Build a minimal PackedUserOperation
        PackedUserOperation memory userOp = _buildUserOp(signature);

        // Call validateUserOp as the EntryPoint
        vm.prank(address(entryPoint));
        uint256 result = vault.validateUserOp(userOp, userOpHash, 0);

        assertEq(result, 0, "Valid signature should return 0");
    }

    function test_InvalidSignatureReturnsFailed() public {
        bytes32 userOpHash = keccak256("test_operation");
        bytes32 ethSignedHash = userOpHash.toEthSignedMessageHash();

        // Attacker signs
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attackerKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        PackedUserOperation memory userOp = _buildUserOp(signature);

        vm.prank(address(entryPoint));
        uint256 result = vault.validateUserOp(userOp, userOpHash, 0);

        assertEq(
            result,
            1,
            "Invalid signature should return SIG_VALIDATION_FAILED (1)"
        );
    }

    function test_ValidateUserOpOnlyFromEntryPoint() public {
        bytes32 userOpHash = keccak256("test_operation");
        PackedUserOperation memory userOp = _buildUserOp(hex"");

        vm.prank(attacker);
        vm.expectRevert();
        vault.validateUserOp(userOp, userOpHash, 0);
    }

    // ──────────────────────────────────────────────
    //  Execution Tests
    // ──────────────────────────────────────────────

    function test_OwnerCanExecute() public {
        address recipient = makeAddr("recipient");

        vm.prank(owner);
        vault.execute(recipient, 1 ether, "");

        assertEq(recipient.balance, 1 ether, "Recipient should receive 1 ETH");
    }

    function test_NonOwnerCannotExecute() public {
        vm.prank(attacker);
        vm.expectRevert(WalletrixVault.OnlyOwnerOrEntryPoint.selector);
        vault.execute(attacker, 1 ether, "");
    }

    function test_EntryPointCanExecute() public {
        address recipient = makeAddr("recipient");

        vm.prank(address(entryPoint));
        vault.execute(recipient, 0.5 ether, "");

        assertEq(
            recipient.balance,
            0.5 ether,
            "Recipient should receive 0.5 ETH"
        );
    }

    // ──────────────────────────────────────────────
    //  Role-Based Permission Tests
    // ──────────────────────────────────────────────

    function test_OwnerCanAssignRole() public {
        vm.prank(owner);
        vault.assignRole(guardian1, WalletrixVault.Role.EXECUTOR);

        assertEq(
            uint256(vault.roles(guardian1)),
            uint256(WalletrixVault.Role.EXECUTOR),
            "Role should be EXECUTOR"
        );
    }

    function test_NonOwnerCannotAssignRole() public {
        vm.prank(attacker);
        vm.expectRevert(WalletrixVault.OnlyOwner.selector);
        vault.assignRole(guardian1, WalletrixVault.Role.EXECUTOR);
    }

    function test_OwnerCanRevokeRole() public {
        vm.prank(owner);
        vault.assignRole(guardian1, WalletrixVault.Role.EXECUTOR);

        vm.prank(owner);
        vault.revokeRole(guardian1);

        assertEq(
            uint256(vault.roles(guardian1)),
            uint256(WalletrixVault.Role.NONE),
            "Role should be NONE after revocation"
        );
    }

    // ──────────────────────────────────────────────
    //  Guardian Management Tests
    // ──────────────────────────────────────────────

    function test_AddGuardian() public {
        vm.prank(owner);
        vault.addGuardian(guardian1);

        assertEq(vault.getGuardianCount(), 1, "Should have 1 guardian");
        assertEq(
            uint256(vault.roles(guardian1)),
            uint256(WalletrixVault.Role.GUARDIAN),
            "Guardian should have GUARDIAN role"
        );
    }

    function test_CannotAddOwnerAsGuardian() public {
        vm.prank(owner);
        vm.expectRevert(WalletrixVault.InvalidGuardian.selector);
        vault.addGuardian(owner);
    }

    function test_CannotAddDuplicateGuardian() public {
        vm.prank(owner);
        vault.addGuardian(guardian1);

        vm.prank(owner);
        vm.expectRevert(WalletrixVault.GuardianAlreadyExists.selector);
        vault.addGuardian(guardian1);
    }

    function test_RemoveGuardian() public {
        vm.prank(owner);
        vault.addGuardian(guardian1);

        vm.prank(owner);
        vault.removeGuardian(guardian1);

        assertEq(vault.getGuardianCount(), 0, "Should have 0 guardians");
        assertEq(
            uint256(vault.roles(guardian1)),
            uint256(WalletrixVault.Role.NONE),
            "Role should be NONE"
        );
    }

    function test_SetRecoveryThreshold() public {
        _addThreeGuardians();

        vm.prank(owner);
        vault.setRecoveryThreshold(2);

        assertEq(vault.recoveryThreshold(), 2, "Threshold should be 2");
    }

    function test_InvalidThreshold() public {
        _addThreeGuardians();

        // Threshold > guardian count
        vm.prank(owner);
        vm.expectRevert(WalletrixVault.InvalidThreshold.selector);
        vault.setRecoveryThreshold(4);

        // Threshold == 0
        vm.prank(owner);
        vm.expectRevert(WalletrixVault.InvalidThreshold.selector);
        vault.setRecoveryThreshold(0);
    }

    // ──────────────────────────────────────────────
    //  Social Recovery Tests (with Timelock)
    // ──────────────────────────────────────────────

    function test_GuardianCanInitiateRecovery() public {
        _setupRecovery();

        vm.prank(guardian1);
        vault.initiateRecovery(newOwner);

        assertTrue(vault.recoveryPending(), "Recovery should be pending");
    }

    function test_NonGuardianCannotInitiateRecovery() public {
        _setupRecovery();

        vm.prank(attacker);
        vm.expectRevert(WalletrixVault.OnlyGuardian.selector);
        vault.initiateRecovery(newOwner);
    }

    function test_FullRecoveryFlow() public {
        _setupRecovery();

        // Guardian 1 initiates
        vm.prank(guardian1);
        vault.initiateRecovery(newOwner);

        // Guardian 2 approves
        vm.prank(guardian2);
        vault.approveRecovery();

        // Fast-forward past the 48-hour timelock
        vm.warp(block.timestamp + 48 hours + 1);

        // Anyone can execute once conditions are met
        vault.executeRecovery();

        assertEq(vault.owner(), newOwner, "Owner should be the new owner");
        assertFalse(
            vault.recoveryPending(),
            "Recovery should no longer be pending"
        );
    }

    function test_RecoveryFailsBeforeTimelock() public {
        _setupRecovery();

        vm.prank(guardian1);
        vault.initiateRecovery(newOwner);

        vm.prank(guardian2);
        vault.approveRecovery();

        // Try to execute immediately (before timelock)
        vm.expectRevert(WalletrixVault.RecoveryTimelockNotExpired.selector);
        vault.executeRecovery();
    }

    function test_RecoveryFailsWithInsufficientApprovals() public {
        _setupRecovery();

        vm.prank(guardian1);
        vault.initiateRecovery(newOwner);

        // Only 1 approval, but threshold is 2
        vm.warp(block.timestamp + 48 hours + 1);

        vm.expectRevert(WalletrixVault.RecoveryNotReady.selector);
        vault.executeRecovery();
    }

    function test_OwnerCanCancelRecovery() public {
        _setupRecovery();

        vm.prank(guardian1);
        vault.initiateRecovery(newOwner);

        // Owner cancels
        vm.prank(owner);
        vault.cancelRecovery();

        assertFalse(vault.recoveryPending(), "Recovery should be cancelled");
        assertEq(vault.owner(), owner, "Owner should remain unchanged");
    }

    function test_CannotDoubleApprove() public {
        _setupRecovery();

        vm.prank(guardian1);
        vault.initiateRecovery(newOwner);

        vm.prank(guardian1);
        vm.expectRevert(WalletrixVault.AlreadyApproved.selector);
        vault.approveRecovery();
    }

    function test_CannotInitiateRecoveryWhilePending() public {
        _setupRecovery();

        vm.prank(guardian1);
        vault.initiateRecovery(newOwner);

        vm.prank(guardian2);
        vm.expectRevert(WalletrixVault.RecoveryAlreadyPending.selector);
        vault.initiateRecovery(makeAddr("anotherOwner"));
    }

    // ──────────────────────────────────────────────
    //  ETH Receive Test
    // ──────────────────────────────────────────────

    function test_VaultCanReceiveETH() public {
        uint256 balanceBefore = address(vault).balance;
        vm.deal(address(this), 1 ether);
        (bool ok, ) = address(vault).call{value: 1 ether}("");
        assertTrue(ok, "Vault should accept ETH");
        assertEq(
            address(vault).balance,
            balanceBefore + 1 ether,
            "Balance should increase"
        );
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    function _buildUserOp(
        bytes memory signature
    ) internal view returns (PackedUserOperation memory) {
        return
            PackedUserOperation({
                sender: address(vault),
                nonce: 0,
                initCode: hex"",
                callData: hex"",
                accountGasLimits: bytes32(0),
                preVerificationGas: 0,
                gasFees: bytes32(0),
                paymasterAndData: hex"",
                signature: signature
            });
    }

    function _addThreeGuardians() internal {
        vm.startPrank(owner);
        vault.addGuardian(guardian1);
        vault.addGuardian(guardian2);
        vault.addGuardian(guardian3);
        vm.stopPrank();
    }

    function _setupRecovery() internal {
        _addThreeGuardians();
        vm.prank(owner);
        vault.setRecoveryThreshold(2);
    }
}
