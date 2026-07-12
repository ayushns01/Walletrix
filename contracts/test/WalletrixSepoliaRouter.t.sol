// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {WalletrixMockERC20} from "../src/mocks/WalletrixMockERC20.sol";
import {WalletrixSepoliaRouter} from "../src/WalletrixSepoliaRouter.sol";

contract WalletrixSepoliaRouterTest is Test {
    uint256 internal constant WUSD_WEI_PER_TOKEN = 500000000000000;
    uint256 internal constant WDAI_WEI_PER_TOKEN = 500000000000000;
    uint256 internal constant WLINK_WEI_PER_TOKEN = 400000000000000;
    uint256 internal constant WWBTC_WEI_PER_TOKEN = 12500000000000000;
    uint256 internal constant WGLD_WEI_PER_TOKEN = 1250000000000000;

    uint256 internal constant WUSD_MINT = 100000 ether;
    uint256 internal constant WDAI_MINT = 100000 ether;
    uint256 internal constant WLINK_MINT = 50000 ether;
    uint256 internal constant WWBTC_MINT = 1000 ether;
    uint256 internal constant WGLD_MINT = 20000 ether;

    address internal owner;
    address internal recipient;
    address internal sender;
    address internal attacker;

    WalletrixSepoliaRouter internal router;
    WalletrixMockERC20 internal wusd;
    WalletrixMockERC20 internal wdai;
    WalletrixMockERC20 internal wlink;
    WalletrixMockERC20 internal wwbtc;
    WalletrixMockERC20 internal wgld;

    function setUp() public {
        owner = makeAddr("owner");
        recipient = makeAddr("recipient");
        sender = makeAddr("sender");
        attacker = makeAddr("attacker");
        vm.txGasPrice(0);

        wusd = new WalletrixMockERC20("Walletrix USD", "WUSD", owner);
        wdai = new WalletrixMockERC20("Walletrix DAI", "WDAI", owner);
        wlink = new WalletrixMockERC20("Walletrix LINK", "WLINK", owner);
        wwbtc = new WalletrixMockERC20("Walletrix BTC", "WWBTC", owner);
        wgld = new WalletrixMockERC20("Walletrix Gold", "WGLD", owner);

        address[] memory supportedTokens = new address[](5);
        supportedTokens[0] = address(wusd);
        supportedTokens[1] = address(wdai);
        supportedTokens[2] = address(wlink);
        supportedTokens[3] = address(wwbtc);
        supportedTokens[4] = address(wgld);

        uint256[] memory weiPerToken = new uint256[](5);
        weiPerToken[0] = WUSD_WEI_PER_TOKEN;
        weiPerToken[1] = WDAI_WEI_PER_TOKEN;
        weiPerToken[2] = WLINK_WEI_PER_TOKEN;
        weiPerToken[3] = WWBTC_WEI_PER_TOKEN;
        weiPerToken[4] = WGLD_WEI_PER_TOKEN;

        router = new WalletrixSepoliaRouter(owner, supportedTokens, weiPerToken);

        vm.startPrank(owner);
        wusd.mint(address(router), WUSD_MINT);
        wdai.mint(address(router), WDAI_MINT);
        wlink.mint(address(router), WLINK_MINT);
        wwbtc.mint(address(router), WWBTC_MINT);
        wgld.mint(address(router), WGLD_MINT);
        vm.stopPrank();
    }

    function test_QuoteRequiredWeiMatchesCanonicalRates() public view {
        _assertQuote(address(wusd), 1.5 ether, 750000000000000);
        _assertQuote(address(wdai), 2.25 ether, 1125000000000000);
        _assertQuote(address(wlink), 0.5 ether, 200000000000000);
        _assertQuote(address(wwbtc), 0.1 ether, 1250000000000000);
        _assertQuote(address(wgld), 3.2 ether, 4000000000000000);
    }

    function test_QuoteRequiredWeiRoundsUpForSingleBaseUnit() public view {
        assertEq(router.quoteRequiredWei(address(wusd), 1), 1);
        assertEq(router.quoteRequiredWei(address(wdai), 1), 1);
        assertEq(router.quoteRequiredWei(address(wlink), 1), 1);
        assertEq(router.quoteRequiredWei(address(wwbtc), 1), 1);
        assertEq(router.quoteRequiredWei(address(wgld), 1), 1);
    }

    function test_MockTokenDecimalsAreFixedAt18() public view {
        assertEq(wusd.decimals(), 18, "WUSD decimals");
        assertEq(wdai.decimals(), 18, "WDAI decimals");
        assertEq(wlink.decimals(), 18, "WLINK decimals");
        assertEq(wwbtc.decimals(), 18, "WWBTC decimals");
        assertEq(wgld.decimals(), 18, "WGLD decimals");
    }

    function test_MockTokenOwnerCanMint() public {
        vm.prank(owner);
        wusd.mint(recipient, 123 ether);

        assertEq(wusd.balanceOf(recipient), 123 ether);
    }

    function test_MockTokenNonOwnerCannotMint() public {
        vm.prank(attacker);
        vm.expectRevert();
        wusd.mint(recipient, 1 ether);
    }

    function test_SwapAndSendTransfersTokensToRecipient() public {
        uint256 amount = 1.5 ether;
        uint256 requiredWei = router.quoteRequiredWei(address(wusd), amount);
        vm.deal(sender, 10 ether);

        vm.prank(sender);
        router.swapAndSend{value: requiredWei}(address(wusd), recipient, amount);

        assertEq(wusd.balanceOf(recipient), amount);
        assertEq(wusd.balanceOf(address(router)), WUSD_MINT - amount);
        assertEq(address(router).balance, requiredWei);
    }

    function test_SwapAndSendRefundsExcessETH() public {
        uint256 amount = 2.25 ether;
        uint256 requiredWei = router.quoteRequiredWei(address(wdai), amount);
        uint256 value = requiredWei + 12345;

        vm.deal(sender, 10 ether);
        uint256 senderBalanceBefore = sender.balance;

        vm.prank(sender);
        router.swapAndSend{value: value}(address(wdai), recipient, amount);

        assertEq(wdai.balanceOf(recipient), amount);
        assertEq(address(router).balance, requiredWei);
        assertEq(sender.balance, senderBalanceBefore - requiredWei);
    }

    function test_SwapAndSendRevertsOnInsufficientETH() public {
        uint256 amount = 1.5 ether;
        uint256 requiredWei = router.quoteRequiredWei(address(wusd), amount);
        vm.deal(sender, 10 ether);

        vm.expectRevert();
        vm.prank(sender);
        router.swapAndSend{value: requiredWei - 1}(address(wusd), recipient, amount);
    }

    function test_SwapAndSendRevertsOnUnsupportedToken() public {
        WalletrixMockERC20 unsupported = new WalletrixMockERC20(
            "Rogue Token",
            "ROGUE",
            owner
        );

        vm.prank(owner);
        unsupported.mint(address(router), 1 ether);

        vm.deal(sender, 10 ether);
        vm.expectRevert();
        vm.prank(sender);
        router.swapAndSend{value: 1 ether}(address(unsupported), recipient, 1 ether);
    }

    function test_SwapAndSendRevertsOnInsufficientRouterInventory() public {
        uint256 amount = WWBTC_MINT + 1;
        uint256 requiredWei = router.quoteRequiredWei(address(wwbtc), amount);
        vm.deal(sender, 100 ether);

        vm.expectRevert();
        vm.prank(sender);
        router.swapAndSend{value: requiredWei}(address(wwbtc), recipient, amount);
    }

    function _assertQuote(
        address token,
        uint256 amountBaseUnits,
        uint256 expectedWei
    ) internal view {
        assertEq(router.quoteRequiredWei(token, amountBaseUnits), expectedWei);
    }
}
