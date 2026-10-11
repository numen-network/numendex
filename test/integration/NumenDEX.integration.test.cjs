const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenDEX Integration", function () {
  let deployer;
  let alice;
  let bob;

  let factory;
  let router;

  let tokenA;
  let tokenB;
  let tokenC;

  const INITIAL_SUPPLY =
    ethers.parseEther("1000000");

  // ===========================================================
  // HELPERS
  // ===========================================================

  async function deadline(
    seconds = 3600
  ) {
    const block =
      await ethers.provider.getBlock(
        "latest"
      );

    return BigInt(
      block.timestamp + seconds
    );
  }

  async function approveRouter(
    token,
    signer,
    amount = ethers.MaxUint256
  ) {
    await token
      .connect(signer)
      .approve(
        await router.getAddress(),
        amount
      );
  }

  async function getPair(
    tokenX,
    tokenY
  ) {
    const pairAddress =
      await factory.getPair(
        await tokenX.getAddress(),
        await tokenY.getAddress()
      );

    expect(
      pairAddress
    ).to.not.equal(
      ethers.ZeroAddress
    );

    return ethers.getContractAt(
      "NumenDEXPair",
      pairAddress
    );
  }

  async function addLiquidity(
    tokenX,
    tokenY,
    amountX,
    amountY,
    signer = deployer
  ) {
    await approveRouter(
      tokenX,
      signer
    );

    await approveRouter(
      tokenY,
      signer
    );

    return router
      .connect(signer)
      .addLiquidity(
        await tokenX.getAddress(),
        await tokenY.getAddress(),
        amountX,
        amountY,
        0n,
        0n,
        signer.address,
        await deadline()
      );
  }

  // ===========================================================
  // DEPLOYMENT
  // ===========================================================

  beforeEach(async function () {
    [
      deployer,
      alice,
      bob
    ] = await ethers.getSigners();

    // ---------------------------------------------------------
    // MOCK TOKENS
    // ---------------------------------------------------------

    const MockERC20 =
      await ethers.getContractFactory(
        "MockERC20"
      );

    tokenA =
      await MockERC20.deploy(
        "Token A",
        "TKA",
        INITIAL_SUPPLY
      );

    await tokenA.waitForDeployment();

    tokenB =
      await MockERC20.deploy(
        "Token B",
        "TKB",
        INITIAL_SUPPLY
      );

    await tokenB.waitForDeployment();

    tokenC =
      await MockERC20.deploy(
        "Token C",
        "TKC",
        INITIAL_SUPPLY
      );

    await tokenC.waitForDeployment();

    // ---------------------------------------------------------
    // USER BALANCES
    // ---------------------------------------------------------

    await tokenA.transfer(
      alice.address,
      ethers.parseEther("10000")
    );

    await tokenB.transfer(
      alice.address,
      ethers.parseEther("10000")
    );

    await tokenC.transfer(
      alice.address,
      ethers.parseEther("10000")
    );

    await tokenA.transfer(
      bob.address,
      ethers.parseEther("10000")
    );

    await tokenB.transfer(
      bob.address,
      ethers.parseEther("10000")
    );

    await tokenC.transfer(
      bob.address,
      ethers.parseEther("10000")
    );

    // ---------------------------------------------------------
    // FACTORY
    // ---------------------------------------------------------

    const Factory =
      await ethers.getContractFactory(
        "NumenDEXFactory"
      );

    factory =
      await Factory.deploy(
        deployer.address
      );

    await factory.waitForDeployment();

    // ---------------------------------------------------------
    // ROUTER
    // ---------------------------------------------------------

    const Router =
      await ethers.getContractFactory(
        "NumenDEXRouter"
      );

    router =
      await Router.deploy(
        await factory.getAddress()
      );

    await router.waitForDeployment();
  });

  // ===========================================================
  // FULL DEX FLOW
  // ===========================================================

  it(
    "tam DEX yaşam döngüsü çalışmalı",
    async function () {
      // =======================================================
      // 1. DEPLOYMENT CHECK
      // =======================================================

      expect(
        await router.factory()
      ).to.equal(
        await factory.getAddress()
      );

      expect(
        await factory.allPairsLength()
      ).to.equal(
        0n
      );

      // =======================================================
      // 2. CREATE A/B POOL THROUGH ROUTER
      // =======================================================

      const abAmountA =
        ethers.parseEther("10000");

      const abAmountB =
        ethers.parseEther("10000");

      await addLiquidity(
        tokenA,
        tokenB,
        abAmountA,
        abAmountB
      );

      expect(
        await factory.allPairsLength()
      ).to.equal(
        1n
      );

      const pairAB =
        await getPair(
          tokenA,
          tokenB
        );

      const pairABAddress =
        await pairAB.getAddress();

      expect(
        pairABAddress
      ).to.not.equal(
        ethers.ZeroAddress
      );

      // =======================================================
      // 3. VERIFY A/B LIQUIDITY
      // =======================================================

      const reservesABBefore =
        await pairAB.getReserves();

      expect(
        reservesABBefore[0]
      ).to.be.gt(
        0n
      );

      expect(
        reservesABBefore[1]
      ).to.be.gt(
        0n
      );

      const deployerLP =
        await pairAB.balanceOf(
          deployer.address
        );

      expect(
        deployerLP
      ).to.be.gt(
        0n
      );

      // =======================================================
      // 4. ALICE A -> B SWAP
      // =======================================================

      await approveRouter(
        tokenA,
        alice
      );

      const aliceSwapIn =
        ethers.parseEther("100");

      const pathAB = [
        await tokenA.getAddress(),
        await tokenB.getAddress()
      ];

      const expectedAB =
        await router.getAmountsOut(
          aliceSwapIn,
          pathAB
        );

      const aliceABefore =
        await tokenA.balanceOf(
          alice.address
        );

      const aliceBBefore =
        await tokenB.balanceOf(
          alice.address
        );

      await router
        .connect(alice)
        .swapExactTokensForTokens(
          aliceSwapIn,
          expectedAB[1],
          pathAB,
          alice.address,
          await deadline()
        );

      const aliceAAfter =
        await tokenA.balanceOf(
          alice.address
        );

      const aliceBAfter =
        await tokenB.balanceOf(
          alice.address
        );

      expect(
        aliceABefore -
        aliceAAfter
      ).to.equal(
        aliceSwapIn
      );

      expect(
        aliceBAfter -
        aliceBBefore
      ).to.equal(
        expectedAB[1]
      );

      // =======================================================
      // 5. VERIFY RESERVES CHANGED
      // =======================================================

      const reservesABAfterSwap =
        await pairAB.getReserves();

      const reservesChanged =
        reservesABAfterSwap[0] !==
          reservesABBefore[0] ||
        reservesABAfterSwap[1] !==
          reservesABBefore[1];

      expect(
        reservesChanged
      ).to.equal(
        true
      );

      // =======================================================
      // 6. CREATE B/C POOL
      // =======================================================

      await addLiquidity(
        tokenB,
        tokenC,
        ethers.parseEther("10000"),
        ethers.parseEther("20000")
      );

      expect(
        await factory.allPairsLength()
      ).to.equal(
        2n
      );

      const pairBC =
        await getPair(
          tokenB,
          tokenC
        );

      expect(
        await pairBC.totalSupply()
      ).to.be.gt(
        0n
      );

      // =======================================================
      // 7. BOB A -> B -> C MULTI-HOP
      // =======================================================

      await approveRouter(
        tokenA,
        bob
      );

      const bobAmountIn =
        ethers.parseEther("50");

      const multiPath = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress()
      ];

      const multiAmounts =
        await router.getAmountsOut(
          bobAmountIn,
          multiPath
        );

      expect(
        multiAmounts.length
      ).to.equal(
        3
      );

      const bobCBefore =
        await tokenC.balanceOf(
          bob.address
        );

      await router
        .connect(bob)
        .swapExactTokensForTokens(
          bobAmountIn,
          multiAmounts[2],
          multiPath,
          bob.address,
          await deadline()
        );

      const bobCAfter =
        await tokenC.balanceOf(
          bob.address
        );

      expect(
        bobCAfter -
        bobCBefore
      ).to.equal(
        multiAmounts[2]
      );

      // =======================================================
      // 8. ALICE EXACT OUTPUT B -> A
      // =======================================================

      await approveRouter(
        tokenB,
        alice
      );

      const exactOutput =
        ethers.parseEther("10");

      const reversePath = [
        await tokenB.getAddress(),
        await tokenA.getAddress()
      ];

      const requiredAmounts =
        await router.getAmountsIn(
          exactOutput,
          reversePath
        );

      const aliceAExactBefore =
        await tokenA.balanceOf(
          alice.address
        );

      const aliceBExactBefore =
        await tokenB.balanceOf(
          alice.address
        );

      await router
        .connect(alice)
        .swapTokensForExactTokens(
          exactOutput,
          requiredAmounts[0],
          reversePath,
          alice.address,
          await deadline()
        );

      const aliceAExactAfter =
        await tokenA.balanceOf(
          alice.address
        );

      const aliceBExactAfter =
        await tokenB.balanceOf(
          alice.address
        );

      expect(
        aliceAExactAfter -
        aliceAExactBefore
      ).to.equal(
        exactOutput
      );

      expect(
        aliceBExactBefore -
        aliceBExactAfter
      ).to.equal(
        requiredAmounts[0]
      );

      // =======================================================
      // 9. REMOVE PART OF A/B LIQUIDITY
      // =======================================================

      const lpBeforeRemove =
        await pairAB.balanceOf(
          deployer.address
        );

      const liquidityToRemove =
        lpBeforeRemove /
        2n;

      expect(
        liquidityToRemove
      ).to.be.gt(
        0n
      );

      await pairAB.approve(
        await router.getAddress(),
        liquidityToRemove
      );

      const deployerABeforeRemove =
        await tokenA.balanceOf(
          deployer.address
        );

      const deployerBBeforeRemove =
        await tokenB.balanceOf(
          deployer.address
        );

      await router.removeLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidityToRemove,
        0n,
        0n,
        deployer.address,
        await deadline()
      );

      const deployerAAfterRemove =
        await tokenA.balanceOf(
          deployer.address
        );

      const deployerBAfterRemove =
        await tokenB.balanceOf(
          deployer.address
        );

      expect(
        deployerAAfterRemove
      ).to.be.gt(
        deployerABeforeRemove
      );

      expect(
        deployerBAfterRemove
      ).to.be.gt(
        deployerBBeforeRemove
      );

      // =======================================================
      // 10. LP BALANCE DECREASED
      // =======================================================

      const lpAfterRemove =
        await pairAB.balanceOf(
          deployer.address
        );

      expect(
        lpAfterRemove
      ).to.equal(
        lpBeforeRemove -
        liquidityToRemove
      );

      // =======================================================
      // 11. POOL STILL ACTIVE
      // =======================================================

      const reservesFinal =
        await pairAB.getReserves();

      expect(
        reservesFinal[0]
      ).to.be.gt(
        0n
      );

      expect(
        reservesFinal[1]
      ).to.be.gt(
        0n
      );

      // =======================================================
      // 12. FACTORY PAIR REGISTRY
      // =======================================================

      const pairABFromFactory =
        await factory.getPair(
          await tokenA.getAddress(),
          await tokenB.getAddress()
        );

      const pairBAFromFactory =
        await factory.getPair(
          await tokenB.getAddress(),
          await tokenA.getAddress()
        );

      expect(
        pairABFromFactory
      ).to.equal(
        pairBAFromFactory
      );

      expect(
        pairABFromFactory
      ).to.equal(
        pairABAddress
      );

      // =======================================================
      // 13. FINAL SANITY CHECK
      // =======================================================

      expect(
        await factory.allPairsLength()
      ).to.equal(
        2n
      );

      expect(
        await pairAB.totalSupply()
      ).to.be.gt(
        1000n
      );

      expect(
        await pairBC.totalSupply()
      ).to.be.gt(
        1000n
      );
    }
  );

  // ===========================================================
  // SLIPPAGE PROTECTION
  // ===========================================================

  it(
    "slippage koruması kötü fiyatlı swapı engellemeli",
    async function () {
      await addLiquidity(
        tokenA,
        tokenB,
        ethers.parseEther("10000"),
        ethers.parseEther("10000")
      );

      await approveRouter(
        tokenA,
        alice
      );

      const amountIn =
        ethers.parseEther("100");

      const path = [
        await tokenA.getAddress(),
        await tokenB.getAddress()
      ];

      const quote =
        await router.getAmountsOut(
          amountIn,
          path
        );

      await expect(
        router
          .connect(alice)
          .swapExactTokensForTokens(
            amountIn,
            quote[1] + 1n,
            path,
            alice.address,
            await deadline()
          )
      ).to.be.revertedWith(
        "NumenDEXRouter: INSUFFICIENT_OUTPUT_AMOUNT"
      );
    }
  );

  // ===========================================================
  // DEADLINE PROTECTION
  // ===========================================================

  it(
    "expired transaction router tarafından reddedilmeli",
    async function () {
      await approveRouter(
        tokenA,
        alice
      );

      await approveRouter(
        tokenB,
        alice
      );

      const latestBlock =
        await ethers.provider.getBlock(
          "latest"
        );

      const expired =
        BigInt(
          latestBlock.timestamp - 1
        );

      await expect(
        router
          .connect(alice)
          .addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            ethers.parseEther("100"),
            ethers.parseEther("100"),
            0n,
            0n,
            alice.address,
            expired
          )
      ).to.be.revertedWith(
        "NumenDEXRouter: EXPIRED"
      );
    }
  );

  // ===========================================================
  // FACTORY + ROUTER CONSISTENCY
  // ===========================================================

  it(
    "aynı pair Router üzerinden tekrar liquidity alınca yeniden oluşturulmamalı",
    async function () {
      await addLiquidity(
        tokenA,
        tokenB,
        ethers.parseEther("1000"),
        ethers.parseEther("1000")
      );

      expect(
        await factory.allPairsLength()
      ).to.equal(
        1n
      );

      const firstPair =
        await factory.getPair(
          await tokenA.getAddress(),
          await tokenB.getAddress()
        );

      await addLiquidity(
        tokenA,
        tokenB,
        ethers.parseEther("500"),
        ethers.parseEther("500")
      );

      expect(
        await factory.allPairsLength()
      ).to.equal(
        1n
      );

      const secondPair =
        await factory.getPair(
          await tokenA.getAddress(),
          await tokenB.getAddress()
        );

      expect(
        secondPair
      ).to.equal(
        firstPair
      );
    }
  );
});