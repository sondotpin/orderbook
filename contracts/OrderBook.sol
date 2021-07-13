// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.8;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { Math } from "@openzeppelin/contracts/math/Math.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IOrderBook } from "./interfaces/IOrderBook.sol";
import "hardhat/console.sol";

contract OrderBook is IOrderBook, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeMath for uint8;
    using Math for uint256;
    using SafeERC20 for IERC20;

    IERC20 public tradeToken;
    IERC20 public baseToken;

    mapping(uint256 => mapping(uint8 => Order)) public buyOrdersInStep;
    mapping(uint256 => Step) public buySteps;
    mapping(uint256 => uint8) public buyOrdersInStepCounter;
    uint256 maxBuyPrice;

    mapping(uint256 => mapping(uint8 => Order)) public sellOrdersInStep;
    mapping(uint256 => Step) public sellSteps;
    mapping(uint256 => uint8) public sellOrdersInStepCounter;
    uint256 minSellPrice;

    /**
     * @notice Constructor
     */
    constructor(address _tradeToken, address _baseToken) public {
        tradeToken = IERC20(_tradeToken);
        baseToken = IERC20(_baseToken);
    }

    /**
     * @notice Place buy order.
     */
    function placeBuyOrder (
        uint256 price,
        uint256 amountOfBaseToken
    ) external override nonReentrant returns (bool) {
        baseToken.safeTransferFrom(msg.sender, address(this), amountOfBaseToken);

        if (minSellPrice == 0) {
            _drawToBuyBook(price, amountOfBaseToken);
        }

        // if (price >= minSellPrice && minSellPrice > 0) {

        // } else if (price < minSellPrice && price > maxBuyPrice) {

        // } else if (price <= minSellPrice) {

        // }
        return true;
    }

    /**
     * @notice Place buy order.
     */
    function placeSellOrder (
        uint256 price,
        uint256 amountOfTradeToken
    ) external override nonReentrant returns (bool) {
        tradeToken.safeTransferFrom(msg.sender, address(this), amountOfTradeToken);

        if (maxBuyPrice == 0) {
            _drawToSellBook(price, amountOfTradeToken);
        }

        // if (price >= minSellPrice && minSellPrice > 0) {

        // } else if (price < minSellPrice && price > maxBuyPrice) {

        // } else if (price <= minSellPrice) {

        // }
        return true;
    }

    /**
     * @notice draw buy order.
     */
    function _drawToBuyBook (
        uint256 price,
        uint256 amount
    ) internal {
        require(price > 0, "Can not place order with price equal 0");

        buyOrdersInStepCounter[price] += 1;
        buyOrdersInStep[price][buyOrdersInStepCounter[price]] = Order(msg.sender, amount, 0);
        buySteps[price].amount = buySteps[price].amount.add(amount);

        if (maxBuyPrice == 0) {
            maxBuyPrice = price;
            return;
        }

        if (price > maxBuyPrice) {
            buySteps[maxBuyPrice].higherPrice = price;
            buySteps[price].lowerPrice = maxBuyPrice;
            maxBuyPrice = price;
            return;
        }

        if (price == maxBuyPrice) {
            return;
        }

        uint256 buyPricePointer = maxBuyPrice;
        while (price <= buyPricePointer) {
            buyPricePointer = buySteps[buyPricePointer].lowerPrice;
        }

        if (price < buySteps[buyPricePointer].higherPrice) {
            buySteps[price].higherPrice = buySteps[buyPricePointer].higherPrice;
            buySteps[price].lowerPrice = buyPricePointer;

            buySteps[buySteps[buyPricePointer].higherPrice].lowerPrice = price;
            buySteps[buyPricePointer].higherPrice = price;
        }
    }

    /**
     * @notice draw sell order.
     */
    function _drawToSellBook (
        uint256 price,
        uint256 amount
    ) internal {
        require(price > 0, "Can not place order with price equal 0");

        sellOrdersInStepCounter[price] += 1;
        sellOrdersInStep[price][sellOrdersInStepCounter[price]] = Order(msg.sender, amount, 0);
        sellSteps[price].amount += amount;

        if (minSellPrice == 0) {
            minSellPrice = price;
            return;
        }

        if (price < minSellPrice) {
            sellSteps[minSellPrice].lowerPrice = price;
            sellSteps[price].higherPrice = minSellPrice;
            minSellPrice = price;
            return;
        }

        if (price == minSellPrice) {
            return;
        }

        uint256 sellPricePointer = minSellPrice;
        while (price >= sellPricePointer && sellSteps[sellPricePointer].higherPrice != 0) {
            sellPricePointer = sellSteps[sellPricePointer].higherPrice;
        }

        if (sellPricePointer < price) {
            sellSteps[price].lowerPrice = sellPricePointer;
            sellSteps[sellPricePointer].higherPrice = price;
        }

        if (sellPricePointer > price && price > sellSteps[sellPricePointer].lowerPrice) {
            sellSteps[price].lowerPrice = sellSteps[sellPricePointer].lowerPrice;
            sellSteps[price].higherPrice = sellPricePointer;

            sellSteps[sellSteps[sellPricePointer].lowerPrice].higherPrice = price;
            sellSteps[sellPricePointer].lowerPrice = price;
        }
    }
    
}
