// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, stdJson, console2} from "forge-std/Script.sol";

import {WalletrixSepoliaRouter} from "../src/WalletrixSepoliaRouter.sol";
import {WalletrixMockERC20} from "../src/mocks/WalletrixMockERC20.sol";

contract DeploySepoliaAutoSwap is Script {
    using stdJson for string;

    struct TokenConfig {
        string name;
        string symbol;
        uint8 decimals;
        string displayPriceUsd;
        uint256 weiPerToken;
        string availabilityLabel;
        string shortDescription;
        uint256 initialMintWholeTokens;
        uint256 seededRouterInventoryWholeTokens;
    }

    struct OutputPaths {
        string contractsRoot;
        string repoRoot;
        string catalogPath;
        string deploymentPath;
        string frontendManifestPath;
    }

    struct CatalogConfig {
        string network;
        string ethUsdReference;
        TokenConfig[] tokenConfigs;
    }

    function run() external {
        OutputPaths memory paths = _resolvePaths();
        CatalogConfig memory catalog = _loadCatalog(paths.catalogPath);
        uint256 deployerPrivateKey = vm.envUint(
            "SEPOLIA_AUTO_SWAP_DEPLOYER_PRIVATE_KEY"
        );
        bool writeOutputs = vm.envOr("SEPOLIA_AUTO_SWAP_WRITE_OUTPUTS", false);
        address deployer = vm.addr(deployerPrivateKey);
        (
            address routerAddress,
            address[] memory tokenAddresses
        ) = _deployContracts(catalog.tokenConfigs, deployer, deployerPrivateKey);

        _logDeployment(catalog.tokenConfigs, routerAddress, tokenAddresses);

        if (!writeOutputs) {
            console2.log(
                "SEPOLIA_AUTO_SWAP_WRITE_OUTPUTS=false, skipping deployment artifact writes."
            );
            return;
        }

        vm.createDir(string.concat(paths.contractsRoot, "/deployments"), true);
        vm.createDir(string.concat(paths.repoRoot, "/frontend/lib/generated"), true);

        string memory deploymentJson = _buildOutputJson({
            network: catalog.network,
            ethUsdReference: catalog.ethUsdReference,
            routerAddress: routerAddress,
            tokenConfigs: catalog.tokenConfigs,
            tokenAddresses: tokenAddresses
        });

        vm.writeFile(paths.deploymentPath, deploymentJson);
        vm.writeFile(paths.frontendManifestPath, deploymentJson);
    }

    function _resolvePaths() internal view returns (OutputPaths memory paths) {
        paths.contractsRoot = vm.projectRoot();
        paths.repoRoot = string.concat(paths.contractsRoot, "/..");
        paths.catalogPath = string.concat(
            paths.contractsRoot,
            "/config/sepoliaAutoSwapCatalog.json"
        );
        paths.deploymentPath = string.concat(
            paths.contractsRoot,
            "/deployments/sepolia-auto-swap.sepolia.json"
        );
        paths.frontendManifestPath = string.concat(
            paths.repoRoot,
            "/frontend/lib/generated/sepoliaAutoSwapManifest.json"
        );
    }

    function _loadCatalog(
        string memory catalogPath
    ) internal view returns (CatalogConfig memory catalog) {
        string memory catalogJson = vm.readFile(catalogPath);
        catalog.network = catalogJson.readString(".network");
        require(
            keccak256(bytes(catalog.network)) ==
                keccak256(bytes("ethereum-sepolia")),
            "Catalog must target ethereum-sepolia"
        );

        catalog.ethUsdReference = catalogJson.readString(".ethUsdReference");
        catalog.tokenConfigs = _readTokenConfigs(catalogJson);
    }

    function _deployContracts(
        TokenConfig[] memory tokenConfigs,
        address deployer,
        uint256 deployerPrivateKey
    ) internal returns (address routerAddress, address[] memory tokenAddresses) {
        WalletrixMockERC20[] memory deployedTokens = new WalletrixMockERC20[](
            tokenConfigs.length
        );
        tokenAddresses = new address[](tokenConfigs.length);
        uint256[] memory weiPerTokenValues = new uint256[](tokenConfigs.length);

        vm.startBroadcast(deployerPrivateKey);

        for (uint256 i = 0; i < tokenConfigs.length; i++) {
            TokenConfig memory config = tokenConfigs[i];
            WalletrixMockERC20 token = new WalletrixMockERC20(
                config.name,
                config.symbol,
                deployer
            );

            deployedTokens[i] = token;
            tokenAddresses[i] = address(token);
            weiPerTokenValues[i] = config.weiPerToken;
        }

        WalletrixSepoliaRouter router = new WalletrixSepoliaRouter(
            deployer,
            tokenAddresses,
            weiPerTokenValues
        );

        for (uint256 i = 0; i < tokenConfigs.length; i++) {
            TokenConfig memory config = tokenConfigs[i];
            uint256 oneWholeToken = 10 ** uint256(config.decimals);
            uint256 mintAmount = config.initialMintWholeTokens * oneWholeToken;
            uint256 routerInventory = config.seededRouterInventoryWholeTokens *
                oneWholeToken;

            deployedTokens[i].mint(deployer, mintAmount);
            require(
                deployedTokens[i].transfer(address(router), routerInventory),
                "Router inventory transfer failed"
            );
        }

        vm.stopBroadcast();
        routerAddress = address(router);
    }

    function _logDeployment(
        TokenConfig[] memory tokenConfigs,
        address routerAddress,
        address[] memory tokenAddresses
    ) internal view {
        console2.log("Sepolia auto-swap router:", routerAddress);
        for (uint256 i = 0; i < tokenConfigs.length; i++) {
            console2.log(tokenConfigs[i].symbol, tokenAddresses[i]);
        }
    }

    function _readTokenConfigs(
        string memory catalogJson
    ) internal view returns (TokenConfig[] memory configs) {
        uint256 count = 0;
        while (catalogJson.keyExists(_jsonKeyForToken(count, "name"))) {
            count++;
        }

        configs = new TokenConfig[](count);

        for (uint256 i = 0; i < count; i++) {
            string memory baseKey = string.concat(".tokens[", vm.toString(i), "]");

            configs[i] = TokenConfig({
                name: catalogJson.readString(string.concat(baseKey, ".name")),
                symbol: catalogJson.readString(string.concat(baseKey, ".symbol")),
                decimals: uint8(
                    catalogJson.readUint(string.concat(baseKey, ".decimals"))
                ),
                displayPriceUsd: catalogJson.readString(
                    string.concat(baseKey, ".displayPriceUsd")
                ),
                weiPerToken: vm.parseUint(
                    catalogJson.readString(string.concat(baseKey, ".weiPerToken"))
                ),
                availabilityLabel: catalogJson.readString(
                    string.concat(baseKey, ".availabilityLabel")
                ),
                shortDescription: catalogJson.readString(
                    string.concat(baseKey, ".shortDescription")
                ),
                initialMintWholeTokens: vm.parseUint(
                    catalogJson.readString(
                        string.concat(baseKey, ".initialMintWholeTokens")
                    )
                ),
                seededRouterInventoryWholeTokens: vm.parseUint(
                    catalogJson.readString(
                        string.concat(baseKey, ".seededRouterInventoryWholeTokens")
                    )
                )
            });
        }
    }

    function _jsonKeyForToken(
        uint256 index,
        string memory field
    ) internal view returns (string memory) {
        return string.concat(".tokens[", vm.toString(index), "].", field);
    }

    function _buildOutputJson(
        string memory network,
        string memory ethUsdReference,
        address routerAddress,
        TokenConfig[] memory tokenConfigs,
        address[] memory tokenAddresses
    ) internal view returns (string memory) {
        bytes memory json = abi.encodePacked(
            '{"network":"',
            network,
            '","ethUsdReference":"',
            ethUsdReference,
            '","router":{"address":"',
            vm.toString(routerAddress),
            '"},"tokens":['
        );

        for (uint256 i = 0; i < tokenConfigs.length; i++) {
            if (i > 0) {
                json = abi.encodePacked(json, ",");
            }

            json = abi.encodePacked(
                json,
                _buildTokenJson(tokenConfigs[i], tokenAddresses[i])
            );
        }

        json = abi.encodePacked(json, "]}");
        return string(json);
    }

    function _buildTokenJson(
        TokenConfig memory config,
        address tokenAddress
    ) internal view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '{"name":"',
                    config.name,
                    '","symbol":"',
                    config.symbol,
                    '","decimals":',
                    vm.toString(uint256(config.decimals)),
                    ',"displayPriceUsd":"',
                    config.displayPriceUsd,
                    '","weiPerToken":"',
                    vm.toString(config.weiPerToken),
                    '","availabilityLabel":"',
                    config.availabilityLabel,
                    '","shortDescription":"',
                    config.shortDescription,
                    '","address":"',
                    vm.toString(tokenAddress),
                    '","initialMintWholeTokens":"',
                    vm.toString(config.initialMintWholeTokens),
                    '","seededRouterInventoryWholeTokens":"',
                    vm.toString(config.seededRouterInventoryWholeTokens),
                    '"}'
                )
            );
    }
}
