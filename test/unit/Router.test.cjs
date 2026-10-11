const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenDEXRouter", function () {
  let owner;
  let user;
  let other;

  let factory;
  let router;

  let tokenA;
  let tokenB;
  let tokenC;

  const INITIAL_SUPPLY =
    ethers.parseEther("1000000");

  const MAX_UINT =
    ethers.MaxUint256;

  // ===========================================================
  // HELPERS
  // ===========================================================

  async function latestDeadline(
    secondsFromNow = 3600
  ) {
    const block =
      await ethers.provider.getBlock(
        "latest"
      );

    return BigInt(
      block.timestamp +
      secondsFromNow
    );
  }

  async function getPair(
    firstToken,
    secondToken
  ) {
    const firstAddress =
      await firstToken.getAddress();

    const secondAddress =
      await secondToken.getAddress();

    const pairAddress =
      await factory.getPair(
        firstAddress,
        secondAddress
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

  async function approveRouter(
    token,
    signer = owner
  ) {
    await token
      .connect(signer)
      .approve(
        await router.getAddress(),
        MAX_UINT
      );
  }

  async function addLiquidity(
    firstToken,
    secondToken,
    amountA,
    amountB,
    recipient = owner.address,
    signer = owner
  ) {
    await approveRouter(
      firstToken,
      signer
    );

    await approveRouter(
      secondToken,
      signer
    );

    const deadline =
      await latestDeadline();

    return router
      .connect(signer)
      .addLiquidity(
        await firstToken.getAddress(),
        await secondToken.getAddress(),
        amountA,
        amountB,
        0n,
        0n,
        recipient,
        deadline
      );
  }

  async function seedAB() {
    await addLiquidity(
      tokenA,
      tokenB,
      ethers.parseEther("10000"),
      ethers.parseEther("10000")
    );
  }

  async function seedBC() {
    await addLiquidity(
      tokenB,
      tokenC,
      ethers.parseEther("10000"),
      ethers.parseEther("20000")
    );
  }

  // ===========================================================
  // SETUP
  // ===========================================================

  beforeEach(async function () {
    [
      owner,
      user,
      other
    ] = await ethers.getSigners();

    // ---------------------------------------------------------
    // TOKENS
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

    // Give user some tokens too.
    await tokenA.transfer(
      user.address,
      ethers.parseEther("10000")
    );

    await tokenB.transfer(
      user.address,
      ethers.parseEther("10000")
    );

    await tokenC.transfer(
      user.address,
      ethers.parseEther("10000")
    );

    // ---------------------------------------------------------
    // FACTORY
    // ---------------------------------------------------------

    const NumenDEXFactory =
      await ethers.getContractFactory(
        "NumenDEXFactory"
      );

    factory =
      await NumenDEXFactory.deploy(
        owner.address
      );

    await factory.waitForDeployment();

    // ---------------------------------------------------------
    // ROUTER
    // ---------------------------------------------------------

    const NumenDEXRouter =
      await ethers.getContractFactory(
        "NumenDEXRouter"
      );

    router =
      await NumenDEXRouter.deploy(
        await factory.getAddress()
      );

    await router.waitForDeployment();
  });

  // ===========================================================
  // DEPLOYMENT
  // ===========================================================

  describe("Deployment", function () {
    it(
      "factory adresini doğru saklamalı",
      async function () {
        expect(
          await router.factory()
        ).to.equal(
          await factory.getAddress()
        );
      }
    );

    it(
      "zero factory ile deploy edilememeli",
      async function () {
        const NumenDEXRouter =
          await ethers.getContractFactory(
            "NumenDEXRouter"
          );

        await expect(
          NumenDEXRouter.deploy(
            ethers.ZeroAddress
          )
        ).to.be.revertedWith(
          "NumenDEXRouter: ZERO_FACTORY"
        );
      }
    );
  });

  // ===========================================================
  // ADD LIQUIDITY
  // ===========================================================

  describe("addLiquidity", function () {
    it(
      "pair yoksa otomatik oluşturmalı",
      async function () {
        const tokenAAddress =
          await tokenA.getAddress();

        const tokenBAddress =
          await tokenB.getAddress();

        expect(
          await factory.getPair(
            tokenAAddress,
            tokenBAddress
          )
        ).to.equal(
          ethers.ZeroAddress
        );

        await addLiquidity(
          tokenA,
          tokenB,
          ethers.parseEther("1000"),
          ethers.parseEther("1000")
        );

        expect(
          await factory.getPair(
            tokenAAddress,
            tokenBAddress
          )
        ).to.not.equal(
          ethers.ZeroAddress
        );
      }
    );

    it(
      "ilk likidite reserve değerlerini doğru oluşturmalı",
      async function () {
        const amountA =
          ethers.parseEther("1000");

        const amountB =
          ethers.parseEther("2000");

        await addLiquidity(
          tokenA,
          tokenB,
          amountA,
          amountB
        );

        const pair =
          await getPair(
            tokenA,
            tokenB
          );

        const reserves =
          await pair.getReserves();

        const token0Address =
          await pair.token0();

        const tokenAAddress =
          await tokenA.getAddress();

        if (
          token0Address.toLowerCase() ===
          tokenAAddress.toLowerCase()
        ) {
          expect(
            reserves[0]
          ).to.equal(
            amountA
          );

          expect(
            reserves[1]
          ).to.equal(
            amountB
          );
        } else {
          expect(
            reserves[0]
          ).to.equal(
            amountB
          );

          expect(
            reserves[1]
          ).to.equal(
            amountA
          );
        }
      }
    );

    it(
      "LP token kullanıcıya mint edilmeli",
      async function () {
        await addLiquidity(
          tokenA,
          tokenB,
          ethers.parseEther("1000"),
          ethers.parseEther("1000")
        );

        const pair =
          await getPair(
            tokenA,
            tokenB
          );

        expect(
          await pair.balanceOf(
            owner.address
          )
        ).to.be.gt(0n);
      }
    );

    it(
      "mevcut havuz oranına göre optimum miktar kullanmalı",
      async function () {
        await addLiquidity(
          tokenA,
          tokenB,
          ethers.parseEther("1000"),
          ethers.parseEther("2000")
        );

        const ownerBBefore =
          await tokenB.balanceOf(
            owner.address
          );

        await addLiquidity(
          tokenA,
          tokenB,
          ethers.parseEther("100"),
          ethers.parseEther("500")
        );

        const ownerBAfter =
          await tokenB.balanceOf(
            owner.address
          );

        // Havuz oranı 1 A : 2 B.
        // 100 A için yalnızca 200 B kullanılmalı.
        expect(
          ownerBBefore -
          ownerBAfter
        ).to.equal(
          ethers.parseEther("200")
        );
      }
    );

    it(
      "amountAMin sağlanmazsa revert etmeli",
      async function () {
        await addLiquidity(
          tokenA,
          tokenB,
          ethers.parseEther("1000"),
          ethers.parseEther("2000")
        );

        await approveRouter(
          tokenA
        );

        await approveRouter(
          tokenB
        );

        const deadline =
          await latestDeadline();

        await expect(
          router.addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            ethers.parseEther("500"),
            ethers.parseEther("200"),
            ethers.parseEther("101"),
            0n,
            owner.address,
            deadline
          )
        ).to.be.revertedWith(
          "NumenDEXRouter: INSUFFICIENT_A_AMOUNT"
        );
      }
    );

    it(
      "amountBMin sağlanmazsa revert etmeli",
      async function () {
        await addLiquidity(
          tokenA,
          tokenB,
          ethers.parseEther("1000"),
          ethers.parseEther("2000")
        );

        await approveRouter(
          tokenA
        );

        await approveRouter(
          tokenB
        );

        const deadline =
          await latestDeadline();

        await expect(
          router.addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            ethers.parseEther("100"),
            ethers.parseEther("500"),
            0n,
            ethers.parseEther("201"),
            owner.address,
            deadline
          )
        ).to.be.revertedWith(
          "NumenDEXRouter: INSUFFICIENT_B_AMOUNT"
        );
      }
    );

    it(
      "aynı token ile liquidity eklenememeli",
      async function () {
        await approveRouter(
          tokenA
        );

        const deadline =
          await latestDeadline();

        await expect(
          router.addLiquidity(
            await tokenA.getAddress(),
            await tokenA.getAddress(),
            ethers.parseEther("100"),
            ethers.parseEther("100"),
            0n,
            0n,
            owner.address,
            deadline
          )
        ).to.be.revertedWith(
          "NumenDEXRouter: IDENTICAL_ADDRESSES"
        );
      }
    );

    it(
      "zero recipient ile liquidity eklenememeli",
      async function () {
        await approveRouter(
          tokenA
        );

        await approveRouter(
          tokenB
        );

        const deadline =
          await latestDeadline();

        await expect(
          router.addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            ethers.parseEther("100"),
            ethers.parseEther("100"),
            0n,
            0n,
            ethers.ZeroAddress,
            deadline
          )
        ).to.be.revertedWith(
          "NumenDEXRouter: ZERO_TO"
        );
      }
    );

    it(
      "deadline geçmişse revert etmeli",
      async function () {
        await approveRouter(
          tokenA
        );

        await approveRouter(
          tokenB
        );

        const block =
          await ethers.provider.getBlock(
            "latest"
          );

        const expiredDeadline =
          BigInt(
            block.timestamp - 1
          );

        await expect(
          router.addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            ethers.parseEther("100"),
            ethers.parseEther("100"),
            0n,
            0n,
            owner.address,
            expiredDeadline
          )
        ).to.be.revertedWith(
          "NumenDEXRouter: EXPIRED"
        );
      }
    );
  });

  // ===========================================================
  // GET AMOUNTS OUT
  // ===========================================================

  describe("getAmountsOut", function () {
    beforeEach(async function () {
      await seedAB();
    });

    it(
      "swap output miktarını %0.30 fee ile hesaplamalı",
      async function () {
        const amountIn =
          ethers.parseEther("100");

        const path = [
          await tokenA.getAddress(),
          await tokenB.getAddress()
        ];

        const amounts =
          await router.getAmountsOut(
            amountIn,
            path
          );

        const expected =
          (
            amountIn *
            997n *
            ethers.parseEther("10000")
          ) /
          (
            ethers.parseEther("10000") *
            1000n +
            amountIn *
            997n
          );

        expect(
          amounts[0]
        ).to.equal(
          amountIn
        );

        expect(
          amounts[1]
        ).to.equal(
          expected
        );
      }
    );

    it(
      "geçersiz path reddedilmeli",
      async function () {
        await expect(
          router.getAmountsOut(
            ethers.parseEther("1"),
            [
              await tokenA.getAddress()
            ]
          )
        ).to.be.revertedWith(
          "NumenDEXLibrary: INVALID_PATH"
        );
      }
    );
  });

  // ===========================================================
  // EXACT INPUT SWAP
  // ===========================================================

  describe(
    "swapExactTokensForTokens",
    function () {
      beforeEach(async function () {
        await seedAB();

        await approveRouter(
          tokenA,
          user
        );

        await approveRouter(
          tokenB,
          user
        );
      });

      it(
        "A -> B exact input swap çalışmalı",
        async function () {
          const amountIn =
            ethers.parseEther("100");

          const path = [
            await tokenA.getAddress(),
            await tokenB.getAddress()
          ];

          const amounts =
            await router.getAmountsOut(
              amountIn,
              path
            );

          const before =
            await tokenB.balanceOf(
              user.address
            );

          await router
            .connect(user)
            .swapExactTokensForTokens(
              amountIn,
              0n,
              path,
              user.address,
              await latestDeadline()
            );

          const after =
            await tokenB.balanceOf(
              user.address
            );

          expect(
            after -
            before
          ).to.equal(
            amounts[1]
          );
        }
      );

      it(
        "amountOutMin yüksekse swap revert etmeli",
        async function () {
          const amountIn =
            ethers.parseEther("100");

          const path = [
            await tokenA.getAddress(),
            await tokenB.getAddress()
          ];

          const amounts =
            await router.getAmountsOut(
              amountIn,
              path
            );

          await expect(
            router
              .connect(user)
              .swapExactTokensForTokens(
                amountIn,
                amounts[1] + 1n,
                path,
                user.address,
                await latestDeadline()
              )
          ).to.be.revertedWith(
            "NumenDEXRouter: INSUFFICIENT_OUTPUT_AMOUNT"
          );
        }
      );

      it(
        "swap zero recipient'e yapılamamalı",
        async function () {
          const path = [
            await tokenA.getAddress(),
            await tokenB.getAddress()
          ];

          await expect(
            router
              .connect(user)
              .swapExactTokensForTokens(
                ethers.parseEther("10"),
                0n,
                path,
                ethers.ZeroAddress,
                await latestDeadline()
              )
          ).to.be.revertedWith(
            "NumenDEXRouter: ZERO_TO"
          );
        }
      );
    }
  );

  // ===========================================================
  // EXACT OUTPUT SWAP
  // ===========================================================

  describe(
    "swapTokensForExactTokens",
    function () {
      beforeEach(async function () {
        await seedAB();

        await approveRouter(
          tokenA,
          user
        );
      });

      it(
        "istenen exact output miktarını vermeli",
        async function () {
          const amountOut =
            ethers.parseEther("50");

          const path = [
            await tokenA.getAddress(),
            await tokenB.getAddress()
          ];

          const amounts =
            await router.getAmountsIn(
              amountOut,
              path
            );

          const tokenABefore =
            await tokenA.balanceOf(
              user.address
            );

          const tokenBBefore =
            await tokenB.balanceOf(
              user.address
            );

          await router
            .connect(user)
            .swapTokensForExactTokens(
              amountOut,
              amounts[0],
              path,
              user.address,
              await latestDeadline()
            );

          const tokenAAfter =
            await tokenA.balanceOf(
              user.address
            );

          const tokenBAfter =
            await tokenB.balanceOf(
              user.address
            );

          expect(
            tokenABefore -
            tokenAAfter
          ).to.equal(
            amounts[0]
          );

          expect(
            tokenBAfter -
            tokenBBefore
          ).to.equal(
            amountOut
          );
        }
      );

      it(
        "amountInMax düşükse revert etmeli",
        async function () {
          const amountOut =
            ethers.parseEther("50");

          const path = [
            await tokenA.getAddress(),
            await tokenB.getAddress()
          ];

          const amounts =
            await router.getAmountsIn(
              amountOut,
              path
            );

          await expect(
            router
              .connect(user)
              .swapTokensForExactTokens(
                amountOut,
                amounts[0] - 1n,
                path,
                user.address,
                await latestDeadline()
              )
          ).to.be.revertedWith(
            "NumenDEXRouter: EXCESSIVE_INPUT_AMOUNT"
          );
        }
      );
    }
  );

  // ===========================================================
  // MULTI-HOP
  // ===========================================================

  describe("Multi-hop swap", function () {
    beforeEach(async function () {
      await seedAB();
      await seedBC();

      await approveRouter(
        tokenA,
        user
      );
    });

    it(
      "A -> B -> C swap çalışmalı",
      async function () {
        const amountIn =
          ethers.parseEther("100");

        const path = [
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          await tokenC.getAddress()
        ];

        const amounts =
          await router.getAmountsOut(
            amountIn,
            path
          );

        expect(
          amounts.length
        ).to.equal(3);

        const before =
          await tokenC.balanceOf(
            user.address
          );

        await router
          .connect(user)
          .swapExactTokensForTokens(
            amountIn,
            amounts[2],
            path,
            user.address,
            await latestDeadline()
          );

        const after =
          await tokenC.balanceOf(
            user.address
          );

        expect(
          after -
          before
        ).to.equal(
          amounts[2]
        );
      }
    );

    it(
      "multi-hop sonrası iki havuzun reserve değerleri değişmeli",
      async function () {
        const pairAB =
          await getPair(
            tokenA,
            tokenB
          );

        const pairBC =
          await getPair(
            tokenB,
            tokenC
          );

        const beforeAB =
          await pairAB.getReserves();

        const beforeBC =
          await pairBC.getReserves();

        const path = [
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          await tokenC.getAddress()
        ];

        await router
          .connect(user)
          .swapExactTokensForTokens(
            ethers.parseEther("100"),
            0n,
            path,
            user.address,
            await latestDeadline()
          );

        const afterAB =
          await pairAB.getReserves();

        const afterBC =
          await pairBC.getReserves();

        expect(
          afterAB[0] !== beforeAB[0] ||
          afterAB[1] !== beforeAB[1]
        ).to.equal(
          true
        );

        expect(
          afterBC[0] !== beforeBC[0] ||
          afterBC[1] !== beforeBC[1]
        ).to.equal(
          true
        );
      }
    );
  });

  // ===========================================================
  // REMOVE LIQUIDITY
  // ===========================================================

  describe("removeLiquidity", function () {
    beforeEach(async function () {
      await seedAB();
    });

    it(
      "LP token karşılığında iki tokenı geri vermeli",
      async function () {
        const pair =
          await getPair(
            tokenA,
            tokenB
          );

        const liquidity =
          await pair.balanceOf(
            owner.address
          );

        await pair.approve(
          await router.getAddress(),
          liquidity
        );

        const tokenABefore =
          await tokenA.balanceOf(
            owner.address
          );

        const tokenBBefore =
          await tokenB.balanceOf(
            owner.address
          );

        await router.removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          liquidity,
          0n,
          0n,
          owner.address,
          await latestDeadline()
        );

        const tokenAAfter =
          await tokenA.balanceOf(
            owner.address
          );

        const tokenBAfter =
          await tokenB.balanceOf(
            owner.address
          );

        expect(
          tokenAAfter
        ).to.be.gt(
          tokenABefore
        );

        expect(
          tokenBAfter
        ).to.be.gt(
          tokenBBefore
        );
      }
    );

    it(
      "remove sonrası yalnızca minimum liquidity kalmalı",
      async function () {
        const pair =
          await getPair(
            tokenA,
            tokenB
          );

        const liquidity =
          await pair.balanceOf(
            owner.address
          );

        await pair.approve(
          await router.getAddress(),
          liquidity
        );

        await router.removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          liquidity,
          0n,
          0n,
          owner.address,
          await latestDeadline()
        );

        expect(
          await pair.totalSupply()
        ).to.equal(
          1000n
        );
      }
    );

    it(
      "amountAMin yüksekse revert etmeli",
      async function () {
        const pair =
          await getPair(
            tokenA,
            tokenB
          );

        const liquidity =
          await pair.balanceOf(
            owner.address
          );

        await pair.approve(
          await router.getAddress(),
          liquidity
        );

        await expect(
          router.removeLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            liquidity,
            ethers.parseEther("20000"),
            0n,
            owner.address,
            await latestDeadline()
          )
        ).to.be.revertedWith(
          "NumenDEXRouter: INSUFFICIENT_A_AMOUNT"
        );
      }
    );

    it(
      "zero recipient ile remove yapılamamalı",
      async function () {
        const pair =
          await getPair(
            tokenA,
            tokenB
          );

        const liquidity =
          await pair.balanceOf(
            owner.address
          );

        await pair.approve(
          await router.getAddress(),
          liquidity
        );

        await expect(
          router.removeLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            liquidity,
            0n,
            0n,
            ethers.ZeroAddress,
            await latestDeadline()
          )
        ).to.be.revertedWith(
          "NumenDEXRouter: ZERO_TO"
        );
      }
    );
  });
});