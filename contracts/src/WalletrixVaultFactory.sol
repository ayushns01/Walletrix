// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {
    ERC1967Proxy
} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {WalletrixVault} from "./WalletrixVault.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";

/**
 * @title WalletrixVaultFactory
 * @author Walletrix Team
 * @notice Factory for deploying WalletrixVault instances via CREATE2.
 * @dev Uses ERC-1967 proxies pointing to a single WalletrixVault implementation.
 *      CREATE2 ensures deterministic addresses — the same owner + salt always
 *      produces the same vault address across all EVM chains.
 *      This is critical for the Hybrid architecture: the frontend can predict
 *      the vault address before it is even deployed.
 */
contract WalletrixVaultFactory {
    /// @notice The singleton WalletrixVault implementation that all proxies delegate to.
    WalletrixVault public immutable VAULT_IMPLEMENTATION;

    /// @notice Emitted when a new vault is deployed.
    event VaultCreated(
        address indexed vault,
        address indexed owner,
        uint256 salt
    );

    /// @notice Error when vault already exists at the predicted address.
    error VaultAlreadyExists();

    /**
     * @dev Deploy the factory with a reference to the WalletrixVault implementation.
     * @param entryPoint The ERC-4337 EntryPoint singleton address.
     */
    constructor(IEntryPoint entryPoint) {
        VAULT_IMPLEMENTATION = new WalletrixVault(entryPoint);
    }

    /**
     * @notice Deploy a new WalletrixVault for the given owner using CREATE2.
     * @dev If the vault already exists at the predicted address, returns the existing one.
     *      This makes the function idempotent — calling it twice with the same params is safe.
     * @param owner The EOA address (from BIP-39) that will own the vault.
     * @param salt A unique salt for deterministic address generation.
     * @return vault The deployed (or existing) WalletrixVault proxy.
     */
    function createAccount(
        address owner,
        uint256 salt
    ) external returns (WalletrixVault vault) {
        address predicted = getAddress(owner, salt);

        // If vault already exists, return it without redeploying
        if (predicted.code.length > 0) {
            return WalletrixVault(payable(predicted));
        }

        // Deploy a new ERC-1967 proxy pointing to the vault implementation
        vault = WalletrixVault(
            payable(
                new ERC1967Proxy{salt: bytes32(salt)}(
                    address(VAULT_IMPLEMENTATION),
                    abi.encodeCall(WalletrixVault.initialize, (owner))
                )
            )
        );

        emit VaultCreated(address(vault), owner, salt);
    }

    /**
     * @notice Predict the deterministic address of a vault before deployment.
     * @dev Uses CREATE2 address derivation. The frontend calls this to display
     *      the vault address to the user before they even deploy it.
     * @param owner The EOA address that will own the vault.
     * @param salt A unique salt.
     * @return The predicted vault proxy address.
     */
    function getAddress(
        address owner,
        uint256 salt
    ) public view returns (address) {
        return
            address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                bytes1(0xff),
                                address(this),
                                bytes32(salt),
                                keccak256(
                                    abi.encodePacked(
                                        type(ERC1967Proxy).creationCode,
                                        abi.encode(
                                            address(VAULT_IMPLEMENTATION),
                                            abi.encodeCall(
                                                WalletrixVault.initialize,
                                                (owner)
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            );
    }
}
