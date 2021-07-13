// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.8;

/**
 * @title Interface for OrderBook
 */
interface IOrderBook {
    struct Order {
        address maker;
        uint256 amount;
        uint256 amountMatched;
    }

    struct Step {
        uint256 higherPrice;
        uint256 lowerPrice;
        uint256 amount;
    }

    function placeBuyOrder (
        uint256 price,
        uint256 amountOfBaseToken
    ) external returns (bool);

    function placeSellOrder (
        uint256 price,
        uint256 amountOfTradeToken
    ) external returns (bool);
}