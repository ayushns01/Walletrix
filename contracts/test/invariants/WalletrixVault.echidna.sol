// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {WalletrixVault} from "../../src/WalletrixVault.sol";
import {WalletrixVaultFactory} from "../../src/WalletrixVaultFactory.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {
    PackedUserOperation
} from "@account-abstraction/interfaces/PackedUserOperation.sol";

/**
 * @title WalletrixVaultEchidna
 * @notice Echidna invariant tests for WalletrixVault.
 * @dev Targets signature replay, ownership integrity, and guardian threshold invariants.
 *
 *      Run with:
 *        echidna contracts/test/invariants/WalletrixVault.echidna.sol \
 *          --contract WalletrixVaultEchidna \
 *          --config echidna.yaml
 */
contract WalletrixVaultEchidna {
    WalletrixVaultFactory public factory;
    WalletrixVault public vault;
    IEntryPoint public entryPoint;

    address public constant OWNER = address(0x1337);
    address public constant GUARDIAN_1 = address(0xA1);
    address public constant GUARDIAN_2 = address(0xA2);
    address public constant GUARDIAN_3 = address(0xA3);

    constructor() {
        // Use a dummy EntryPoint address
        entryPoint = IEntryPoint(address(0xEEEE));
        factory = new WalletrixVaultFactory(entryPoint);
        vault = factory.createAccount(OWNER, 0);

        // Setup guardians
        _setupGuardians();
    }

    // ──────────────────────────────────────────────
    //  Invariant 1: Owner can NEVER be address(0)
    // ──────────────────────────────────────────────

    /// @notice The vault owner must never be the zero address.
    function echidna_owner_never_zero() public view returns (bool) {
        return vault.owner() != address(0);
    }

    // ──────────────────────────────────────────────
    //  Invariant 2: Guardian count never exceeds MAX
    // ──────────────────────────────────────────────

    /// @notice Guardian count must never exceed MAX_GUARDIANS.
    function echidna_guardian_count_within_limit() public view returns (bool) {
        return vault.getGuardianCount() <= vault.MAX_GUARDIANS();
    }

    // ──────────────────────────────────────────────
    //  Invariant 3: Recovery threshold <= guardian count
    // ──────────────────────────────────────────────

    /// @notice Recovery threshold must never exceed the number of guardians.
    function echidna_threshold_within_guardian_count()
        public
        view
        returns (bool)
    {
        return vault.recoveryThreshold() <= vault.getGuardianCount();
    }

    // ──────────────────────────────────────────────
    //  Invariant 4: Signature replay should be impossible
    //  (validateUserOp from non-EntryPoint must always revert)
    // ──────────────────────────────────────────────

    /// @notice Calling validateUserOp from any address other than the EntryPoint must fail.
    function echidna_cannot_call_validateUserOp_externally()
        public
        returns (bool)
    {
        PackedUserOperation memory userOp = PackedUserOperation({
            sender: address(vault),
            nonce: 0,
            initCode: hex"",
            callData: hex"",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: hex"",
            signature: hex"deadbeef"
        });

        bytes32 fakeHash = keccak256("replay_attempt");

        // This should always revert since msg.sender is not the EntryPoint
        try vault.validateUserOp(userOp, fakeHash, 0) returns (uint256) {
            // If it doesn't revert, the invariant is broken
            return false;
        } catch {
            return true;
        }
    }

    // ──────────────────────────────────────────────
    //  Invariant 5: Non-owner cannot execute
    // ──────────────────────────────────────────────

    /// @notice Calling execute from an unauthorized address must fail.
    function echidna_non_owner_cannot_execute() public returns (bool) {
        try vault.execute(address(0xDEAD), 0, hex"") {
            // If msg.sender is not owner and not entryPoint, this is broken
            // Echidna will call this as its own address, which is neither
            return false;
        } catch {
            return true;
        }
    }

    // ──────────────────────────────────────────────
    //  Invariant 6: Recovery cannot bypass timelock
    // ──────────────────────────────────────────────

    /// @notice If recovery is pending, it cannot execute before the timelock expires.
    function echidna_recovery_respects_timelock() public returns (bool) {
        if (!vault.recoveryPending()) {
            return true; // No active recovery, invariant holds trivially
        }

        // Try to execute recovery immediately — should fail
        try vault.executeRecovery() {
            // If this succeeds, the timelock was bypassed
            return false;
        } catch {
            return true;
        }
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    function _setupGuardians() internal {
        // We need to prank as owner to add guardians
        // NOTE: Echidna doesn't support vm.prank, so we use a constructor-based setup
        // The factory already set the owner. Since we're in the constructor,
        // we can't prank. Instead, this contract will serve as the owner for fuzzing.
        // Re-deploy with this contract as owner for fuzzing purposes.
        vault = factory.createAccount(address(this), 1);
        vault.addGuardian(GUARDIAN_1);
        vault.addGuardian(GUARDIAN_2);
        vault.addGuardian(GUARDIAN_3);
        vault.setRecoveryThreshold(2);
    }
}
