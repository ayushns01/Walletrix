// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract WalletrixSepoliaRouter is Ownable {
    uint256 internal constant WAD = 1e18;

    mapping(address => uint256) public weiPerToken;
    mapping(address => bool) public supportedToken;

    error UnsupportedToken();
    error InsufficientETH();
    error EthTransferFailed();

    constructor(
        address owner_,
        address[] memory supportedTokens_,
        uint256[] memory weiPerToken_
    ) Ownable(owner_) {
        require(supportedTokens_.length == weiPerToken_.length, "length mismatch");

        for (uint256 i = 0; i < supportedTokens_.length; i++) {
            address token = supportedTokens_[i];
            supportedToken[token] = true;
            weiPerToken[token] = weiPerToken_[i];
        }
    }

    function quoteRequiredWei(
        address token,
        uint256 amountBaseUnits
    ) public view returns (uint256) {
        uint256 rate = weiPerToken[token];
        if (!supportedToken[token] || rate == 0) revert UnsupportedToken();
        return Math.mulDiv(amountBaseUnits, rate, WAD, Math.Rounding.Ceil);
    }

    function swapAndSend(
        address token,
        address recipient,
        uint256 amountBaseUnits
    ) external payable {
        uint256 requiredWei = quoteRequiredWei(token, amountBaseUnits);
        if (msg.value < requiredWei) revert InsufficientETH();

        bool success = IERC20(token).transfer(recipient, amountBaseUnits);
        if (!success) revert();

        uint256 refund = msg.value - requiredWei;
        if (refund > 0) {
            (bool sent, ) = payable(msg.sender).call{value: refund}("");
            if (!sent) revert EthTransferFailed();
        }
    }
}
