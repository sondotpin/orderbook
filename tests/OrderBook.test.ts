import chai, { expect } from 'chai';
import { Signer } from 'ethers';
import asPromised from "chai-as-promised";
// @ts-ignore
import { ethers } from "hardhat";
import { OrderBookFactory } from '../typechain/OrderBookFactory';
import { Erc20TestFactory } from '../typechain/Erc20TestFactory';
import { OrderBook } from '../typechain/OrderBook';
import { Erc20Test } from '../typechain/Erc20Test';
import { parseAmount } from '../utils';

chai.use(asPromised);

describe("OrderBook", () => {
  let deployer: Signer;
  let acc1: Signer;
  let acc2: Signer;
  let acc3: Signer;
  let acc4: Signer;
  let acc5: Signer;
  let tradeToken: Erc20Test;
  let baseToken: Erc20Test;
  let book: OrderBook;

  async function deployErc20(name: string, symbol: string) {
    const token = await (await new Erc20TestFactory(deployer).deploy(name, symbol)).deployed();
    return token;
  }

  async function deploy() {
    baseToken = await deployErc20('baseToken', 'baseToken');
    tradeToken = await deployErc20('tradeToken', 'tradeToken');
    book = await (await new OrderBookFactory(deployer).deploy(tradeToken.address, baseToken.address)).deployed();
  }

  beforeEach(async () => {
    [deployer, acc1, acc2, acc3, acc4, acc5] = await ethers.getSigners();
    await deploy();
    await baseToken.connect(deployer).transfer(await acc1.getAddress(), parseAmount(1000, 18));
    await baseToken.connect(deployer).transfer(await acc2.getAddress(), parseAmount(1000, 18));
    await baseToken.connect(deployer).transfer(await acc3.getAddress(), parseAmount(1000, 18));
    await baseToken.connect(deployer).transfer(await acc4.getAddress(), parseAmount(1000, 18));

    await tradeToken.connect(deployer).transfer(await acc1.getAddress(), parseAmount(1000, 18));
    await tradeToken.connect(deployer).transfer(await acc2.getAddress(), parseAmount(1000, 18));
    await tradeToken.connect(deployer).transfer(await acc3.getAddress(), parseAmount(1000, 18));
    await tradeToken.connect(deployer).transfer(await acc4.getAddress(), parseAmount(1000, 18));

    await baseToken.connect(acc1).approve(book.address, parseAmount(1000, 18));
    await baseToken.connect(acc2).approve(book.address, parseAmount(1000, 18));
    await baseToken.connect(acc3).approve(book.address, parseAmount(1000, 18));
    await baseToken.connect(acc4).approve(book.address, parseAmount(1000, 18));

    await tradeToken.connect(acc1).approve(book.address, parseAmount(1000, 18));
    await tradeToken.connect(acc2).approve(book.address, parseAmount(1000, 18));
    await tradeToken.connect(acc3).approve(book.address, parseAmount(1000, 18));
    await tradeToken.connect(acc4).approve(book.address, parseAmount(1000, 18));
  });

  describe("#place buy order not matching", () => {
    it("should not buy if not enough money", async() => {
      await expect(book.connect(acc1).placeBuyOrder(0, parseAmount(1001, 18))).eventually.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
    });

    it("should not buy with price 0", async() => {
      await expect(book.connect(acc1).placeBuyOrder(0, parseAmount(1000, 18))).eventually.rejectedWith('Can not place order with price equal 0');
    });

    it("should place first buy", async() => {
      await book.connect(acc1).placeBuyOrder(1, parseAmount(1000, 18));

      const [
        buyOrdersInStepCounter,
        step,
      ] = await Promise.all([
        book.buyOrdersInStepCounter(1),
        book.buySteps(1),
      ]);

      expect(buyOrdersInStepCounter).to.eq(1);
      expect(step.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step.lowerPrice.toNumber()).to.eq(0);
    });

    it("should place second buy", async() => {
      await book.connect(acc1).placeBuyOrder(1, parseAmount(1000, 18));
      await book.connect(acc2).placeBuyOrder(2, parseAmount(1000, 18));
      await book.connect(acc3).placeBuyOrder(3, parseAmount(1000, 18));
      await book.connect(acc4).placeBuyOrder(2, parseAmount(500, 18));

      const [
        buyOrdersInStepCounter1,
        buyOrdersInStepCounter2,
        buyOrdersInStepCounter3,
        step1,
        step2,
        step3,
        order1InStep2,
        order2InStep2,
      ] = await Promise.all([
        book.buyOrdersInStepCounter(1),
        book.buyOrdersInStepCounter(2),
        book.buyOrdersInStepCounter(3),
        book.buySteps(1),
        book.buySteps(2),
        book.buySteps(3),
        book.buyOrdersInStep(2, 1),
        book.buyOrdersInStep(2, 2),
      ]);

      expect(buyOrdersInStepCounter1).to.eq(1);
      expect(buyOrdersInStepCounter2).to.eq(2);
      expect(buyOrdersInStepCounter3).to.eq(1);

      expect(step1.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step1.lowerPrice.toNumber()).to.eq(0);
      expect(step1.higherPrice.toNumber()).to.eq(2);

      expect(step2.amount.toString()).to.eq(parseAmount(1500, 18).toString());
      expect(step2.lowerPrice.toNumber()).to.eq(1);
      expect(step2.higherPrice.toNumber()).to.eq(3);

      expect(step3.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step3.lowerPrice.toNumber()).to.eq(2);
      expect(step3.higherPrice.toNumber()).to.eq(0);

      expect(order1InStep2.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(order1InStep2.amountMatched.toNumber()).to.eq(0);
      expect(order1InStep2.maker).to.eq(await acc2.getAddress());

      expect(order2InStep2.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(order2InStep2.amountMatched.toNumber()).to.eq(0);
      expect(order2InStep2.maker).to.eq(await acc4.getAddress());
    });
  });

  describe("#place sell order not matching", () => {
    it("should not sell if not enough money", async() => {
      await expect(book.connect(acc1).placeSellOrder(0, parseAmount(1001, 18))).eventually.rejectedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
    });

    it("should not buy with price 0", async() => {
      await expect(book.connect(acc1).placeSellOrder(0, parseAmount(1000, 18))).eventually.rejectedWith('Can not place order with price equal 0');
    });

    it("should place first sell", async() => {
      await book.connect(acc1).placeSellOrder(1, parseAmount(1000, 18));

      const [
        sellOrdersInStepCounter,
        step,
      ] = await Promise.all([
        book.sellOrdersInStepCounter(1),
        book.sellSteps(1),
      ]);

      expect(sellOrdersInStepCounter).to.eq(1);
      expect(step.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step.lowerPrice.toNumber()).to.eq(0);
    });

    it("should place second sell", async() => {
      await book.connect(acc1).placeSellOrder(1, parseAmount(1000, 18));
      await book.connect(acc2).placeSellOrder(2, parseAmount(1000, 18));
      await book.connect(acc3).placeSellOrder(3, parseAmount(1000, 18));
      await book.connect(acc4).placeSellOrder(2, parseAmount(500, 18));

      const [
        sellOrdersInStepCounter1,
        sellOrdersInStepCounter2,
        sellOrdersInStepCounter3,
        step1,
        step2,
        step3,
        order1InStep2,
        order2InStep2,
      ] = await Promise.all([
        book.sellOrdersInStepCounter(1),
        book.sellOrdersInStepCounter(2),
        book.sellOrdersInStepCounter(3),
        book.sellSteps(1),
        book.sellSteps(2),
        book.sellSteps(3),
        book.sellOrdersInStep(2, 1),
        book.sellOrdersInStep(2, 2),
      ]);

      expect(sellOrdersInStepCounter1).to.eq(1);
      expect(sellOrdersInStepCounter2).to.eq(2);
      expect(sellOrdersInStepCounter3).to.eq(1);

      expect(step1.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step1.lowerPrice.toNumber()).to.eq(0);
      expect(step1.higherPrice.toNumber()).to.eq(2);

      expect(step2.amount.toString()).to.eq(parseAmount(1500, 18).toString());
      expect(step2.lowerPrice.toNumber()).to.eq(1);
      expect(step2.higherPrice.toNumber()).to.eq(3);

      expect(step3.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(step3.lowerPrice.toNumber()).to.eq(2);
      expect(step3.higherPrice.toNumber()).to.eq(0);

      expect(order1InStep2.amount.toString()).to.eq(parseAmount(1000, 18).toString());
      expect(order1InStep2.amountMatched.toNumber()).to.eq(0);
      expect(order1InStep2.maker).to.eq(await acc2.getAddress());

      expect(order2InStep2.amount.toString()).to.eq(parseAmount(500, 18).toString());
      expect(order2InStep2.amountMatched.toNumber()).to.eq(0);
      expect(order2InStep2.maker).to.eq(await acc4.getAddress());
    });
  });
});