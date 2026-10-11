const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumenDEXPair", function () {
  let owner;
  let user;
  let feeReceiver;

  let factory;
  let tokenA;
  let tokenB;
  let pair;

  let token0;
  let token1;

  const INITIAL_SUPPLY =
    ethers.parseEther("1000000");

  const LIQUIDITY_AMOUNT =
    ethers.parseEther("10000");

  async function deployPair() {
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

    const NumenDEXFactory =
      await ethers.getContractFactory(
        "NumenDEXFactory"
      );

    factory =
      await NumenDEXFactory.deploy(
        owner.address
      );

    await factory.waitForDeployment();

    const tokenAAddress =
      await tokenA.getAddress();

    const tokenBAddress =
      await tokenB.getAddress();

    await factory.createPair(
      tokenAAddress,
      tokenBAddress
    );

    const pairAddress =
      await factory.getPair(
        tokenAAddress,
        tokenBAddress
      );

    pair =
      await ethers.getContractAt(
        "NumenDEXPair",
        pairAddress
      );

    const token0Address =
      await pair.token0();

    if (
      token0Address.toLowerCase() ===
      tokenAAddress.toLowerCase()
    ) {
      token0 = tokenA;
      token1 = tokenB;
    } else {
      token0 = tokenB;
      token1 = tokenA;
    }
  }

  async function addLiquidity(
    amount0 = LIQUIDITY_AMOUNT,
    amount1 = LIQUIDITY_AMOUNT,
    recipient = owner.address
  ) {
    const pairAddress =
      await pair.getAddress();

    await token0.transfer(
      pairAddress,
      amount0
    );

    await token1.transfer(
      pairAddress,
      amount1
    );

    await pair.mint(
      recipient
    );
  }

  beforeEach(async function () {
    [
      owner,
      user,
      feeReceiver
    ] = await ethers.getSigners();

    await deployPair();
  });

  // ===========================================================
  // INITIAL STATE
  // ===========================================================

  describe("Initial state", function () {
    it(
      "reserve değerleri başlangıçta sıfır olmalı",
      async function () {
        const reserves =
          await pair.getReserves();

        expect(
          reserves[0]
        ).to.equal(0n);

        expect(
          reserves[1]
        ).to.equal(0n);
      }
    );

    it(
      "LP totalSupply başlangıçta sıfır olmalı",
      async function () {
        expect(
          await pair.totalSupply()
        ).to.equal(0n);
      }
    );

    it(
      "MINIMUM_LIQUIDITY 1000 olmalı",
      async function () {
        expect(
          await pair.MINIMUM_LIQUIDITY()
        ).to.equal(1000n);
      }
    );

    it(
      "LP token metadata doğru olmalı",
      async function () {
        expect(
          await pair.name()
        ).to.equal(
          "NumenDEX LP Token"
        );

        expect(
          await pair.symbol()
        ).to.equal(
          "NDEX-LP"
        );

        expect(
          await pair.decimals()
        ).to.equal(18n);
      }
    );
  });

  // ===========================================================
  // MINT
  // ===========================================================

  describe("Mint liquidity", function () {
    it(
      "ilk likidite eklemesi reserve değerlerini güncellemeli",
      async function () {
        await addLiquidity();

        const reserves =
          await pair.getReserves();

        expect(
          reserves[0]
        ).to.equal(
          LIQUIDITY_AMOUNT
        );

        expect(
          reserves[1]
        ).to.equal(
          LIQUIDITY_AMOUNT
        );
      }
    );

    it(
      "ilk likidite LP token üretmeli",
      async function () {
        await addLiquidity();

        expect(
          await pair.balanceOf(
            owner.address
          )
        ).to.be.gt(0n);
      }
    );

    it(
      "MINIMUM_LIQUIDITY kalıcı olarak address(0)'a mint edilmeli",
      async function () {
        await addLiquidity();

        expect(
          await pair.balanceOf(
            ethers.ZeroAddress
          )
        ).to.equal(
          1000n
        );
      }
    );

    it(
      "ilk LP miktarı sqrt(amount0 * amount1) - 1000 olmalı",
      async function () {
        await addLiquidity();

        const expected =
          LIQUIDITY_AMOUNT -
          1000n;

        expect(
          await pair.balanceOf(
            owner.address
          )
        ).to.equal(
          expected
        );
      }
    );

    it(
      "ikinci likidite eklemesi LP üretmeli",
      async function () {
        await addLiquidity();

        const before =
          await pair.balanceOf(
            owner.address
          );

        const secondAmount =
          ethers.parseEther("1000");

        await addLiquidity(
          secondAmount,
          secondAmount
        );

        const after =
          await pair.balanceOf(
            owner.address
          );

        expect(
          after
        ).to.be.gt(
          before
        );
      }
    );

    it(
      "sıfır adresine LP mint edilememeli",
      async function () {
        await expect(
          pair.mint(
            ethers.ZeroAddress
          )
        ).to.be.revertedWith(
          "NumenDEX: ZERO_TO"
        );
      }
    );
  });

  // ===========================================================
  // LP ERC20
  // ===========================================================

  describe("LP ERC20", function () {
    beforeEach(async function () {
      await addLiquidity();
    });

    it(
      "LP token transfer edilebilmeli",
      async function () {
        const amount =
          ethers.parseEther("100");

        await pair.transfer(
          user.address,
          amount
        );

        expect(
          await pair.balanceOf(
            user.address
          )
        ).to.equal(
          amount
        );
      }
    );

    it(
      "LP token approve ve transferFrom desteklemeli",
      async function () {
        const amount =
          ethers.parseEther("100");

        await pair.approve(
          user.address,
          amount
        );

        await pair
          .connect(user)
          .transferFrom(
            owner.address,
            user.address,
            amount
          );

        expect(
          await pair.balanceOf(
            user.address
          )
        ).to.equal(
          amount
        );
      }
    );

    it(
      "zero address'e transfer engellenmeli",
      async function () {
        await expect(
          pair.transfer(
            ethers.ZeroAddress,
            1n
          )
        ).to.be.revertedWith(
          "NumenDEX: TRANSFER_TO_ZERO"
        );
      }
    );
  });

  // ===========================================================
  // BURN
  // ===========================================================

  describe("Burn liquidity", function () {
    beforeEach(async function () {
      await addLiquidity();
    });

    it(
      "LP pair kontratına gönderilip burn edilebilmeli",
      async function () {
        const pairAddress =
          await pair.getAddress();

        const liquidity =
          await pair.balanceOf(
            owner.address
          );

        await pair.transfer(
          pairAddress,
          liquidity
        );

        const token0Before =
          await token0.balanceOf(
            owner.address
          );

        const token1Before =
          await token1.balanceOf(
            owner.address
          );

        await pair.burn(
          owner.address
        );

        const token0After =
          await token0.balanceOf(
            owner.address
          );

        const token1After =
          await token1.balanceOf(
            owner.address
          );

        expect(
          token0After
        ).to.be.gt(
          token0Before
        );

        expect(
          token1After
        ).to.be.gt(
          token1Before
        );
      }
    );

    it(
      "burn sonrası minimum liquidity pool içinde kalmalı",
      async function () {
        const pairAddress =
          await pair.getAddress();

        const liquidity =
          await pair.balanceOf(
            owner.address
          );

        await pair.transfer(
          pairAddress,
          liquidity
        );

        await pair.burn(
          owner.address
        );

        expect(
          await pair.totalSupply()
        ).to.equal(
          1000n
        );
      }
    );

    it(
      "pair üzerinde LP yoksa burn başarısız olmalı",
      async function () {
        await expect(
          pair.burn(
            owner.address
          )
        ).to.be.revertedWith(
          "NumenDEX: ZERO_LIQUIDITY"
        );
      }
    );

    it(
      "zero address'e burn engellenmeli",
      async function () {
        await expect(
          pair.burn(
            ethers.ZeroAddress
          )
        ).to.be.revertedWith(
          "NumenDEX: ZERO_TO"
        );
      }
    );
  });

  // ===========================================================
  // SWAP
  // ===========================================================

  describe("Swap", function () {
    beforeEach(async function () {
      await addLiquidity();
    });

    it(
      "token0 -> token1 swap çalışmalı",
      async function () {
        const pairAddress =
          await pair.getAddress();

        const amountIn =
          ethers.parseEther("100");

        const reservesBefore =
          await pair.getReserves();

        const reserve0 =
          reservesBefore[0];

        const reserve1 =
          reservesBefore[1];

        const amountInWithFee =
          amountIn *
          997n;

        const amountOut =
          (
            amountInWithFee *
            reserve1
          ) /
          (
            reserve0 *
            1000n +
            amountInWithFee
          );

        await token0.transfer(
          pairAddress,
          amountIn
        );

        const userBalanceBefore =
          await token1.balanceOf(
            user.address
          );

        await pair.swap(
          0n,
          amountOut,
          user.address,
          "0x"
        );

        const userBalanceAfter =
          await token1.balanceOf(
            user.address
          );

        expect(
          userBalanceAfter -
          userBalanceBefore
        ).to.equal(
          amountOut
        );
      }
    );

    it(
      "token1 -> token0 swap çalışmalı",
      async function () {
        const pairAddress =
          await pair.getAddress();

        const amountIn =
          ethers.parseEther("100");

        const reservesBefore =
          await pair.getReserves();

        const reserve0 =
          reservesBefore[0];

        const reserve1 =
          reservesBefore[1];

        const amountInWithFee =
          amountIn *
          997n;

        const amountOut =
          (
            amountInWithFee *
            reserve0
          ) /
          (
            reserve1 *
            1000n +
            amountInWithFee
          );

        await token1.transfer(
          pairAddress,
          amountIn
        );

        const userBalanceBefore =
          await token0.balanceOf(
            user.address
          );

        await pair.swap(
          amountOut,
          0n,
          user.address,
          "0x"
        );

        const userBalanceAfter =
          await token0.balanceOf(
            user.address
          );

        expect(
          userBalanceAfter -
          userBalanceBefore
        ).to.equal(
          amountOut
        );
      }
    );

    it(
      "swap reserve değerlerini güncellemeli",
      async function () {
        const pairAddress =
          await pair.getAddress();

        const amountIn =
          ethers.parseEther("100");

        const reservesBefore =
          await pair.getReserves();

        const reserve0Before =
          reservesBefore[0];

        const reserve1Before =
          reservesBefore[1];

        const amountInWithFee =
          amountIn *
          997n;

        const amountOut =
          (
            amountInWithFee *
            reserve1Before
          ) /
          (
            reserve0Before *
            1000n +
            amountInWithFee
          );

        await token0.transfer(
          pairAddress,
          amountIn
        );

        await pair.swap(
          0n,
          amountOut,
          user.address,
          "0x"
        );

        const reservesAfter =
          await pair.getReserves();

        expect(
          reservesAfter[0]
        ).to.equal(
          reserve0Before +
          amountIn
        );

        expect(
          reservesAfter[1]
        ).to.equal(
          reserve1Before -
          amountOut
        );
      }
    );

    it(
      "swap %0.30 fee invariant'ını korumalı",
      async function () {
        const pairAddress =
          await pair.getAddress();

        const amountIn =
          ethers.parseEther("100");

        const before =
          await pair.getReserves();

        const kBefore =
          before[0] *
          before[1];

        const amountInWithFee =
          amountIn *
          997n;

        const amountOut =
          (
            amountInWithFee *
            before[1]
          ) /
          (
            before[0] *
            1000n +
            amountInWithFee
          );

        await token0.transfer(
          pairAddress,
          amountIn
        );

        await pair.swap(
          0n,
          amountOut,
          user.address,
          "0x"
        );

        const after =
          await pair.getReserves();

        const kAfter =
          after[0] *
          after[1];

        expect(
          kAfter
        ).to.be.gte(
          kBefore
        );
      }
    );

    it(
      "input olmadan output alınamamalı",
      async function () {
        await expect(
          pair.swap(
            0n,
            ethers.parseEther("1"),
            user.address,
            "0x"
          )
        ).to.be.revertedWith(
          "NumenDEX: INSUFFICIENT_INPUT_AMOUNT"
        );
      }
    );

    it(
      "iki output da sıfır olamaz",
      async function () {
        await expect(
          pair.swap(
            0n,
            0n,
            user.address,
            "0x"
          )
        ).to.be.revertedWith(
          "NumenDEX: INSUFFICIENT_OUTPUT_AMOUNT"
        );
      }
    );

    it(
      "reserve'den fazla output alınamamalı",
      async function () {
        const reserves =
          await pair.getReserves();

        await expect(
          pair.swap(
            0n,
            reserves[1],
            user.address,
            "0x"
          )
        ).to.be.revertedWith(
          "NumenDEX: INSUFFICIENT_LIQUIDITY"
        );
      }
    );

    it(
      "swap output adresi token0 olamaz",
      async function () {
        await expect(
          pair.swap(
            0n,
            1n,
            await token0.getAddress(),
            "0x"
          )
        ).to.be.revertedWith(
          "NumenDEX: INVALID_TO"
        );
      }
    );

    it(
      "swap output adresi token1 olamaz",
      async function () {
        await expect(
          pair.swap(
            1n,
            0n,
            await token1.getAddress(),
            "0x"
          )
        ).to.be.revertedWith(
          "NumenDEX: INVALID_TO"
        );
      }
    );
  });

  // ===========================================================
  // SYNC
  // ===========================================================

  describe("sync", function () {
    beforeEach(async function () {
      await addLiquidity();
    });

    it(
      "doğrudan gönderilen token sonrası reserve sync edilebilmeli",
      async function () {
        const pairAddress =
          await pair.getAddress();

        const extra =
          ethers.parseEther("100");

        const before =
          await pair.getReserves();

        await token0.transfer(
          pairAddress,
          extra
        );

        await pair.sync();

        const after =
          await pair.getReserves();

        expect(
          after[0]
        ).to.equal(
          before[0] +
          extra
        );

        expect(
          after[1]
        ).to.equal(
          before[1]
        );
      }
    );
  });

  // ===========================================================
  // SKIM
  // ===========================================================

  describe("skim", function () {
    beforeEach(async function () {
      await addLiquidity();
    });

    it(
      "reserve üzerindeki fazla token skim ile alınabilmeli",
      async function () {
        const pairAddress =
          await pair.getAddress();

        const extra =
          ethers.parseEther("100");

        await token0.transfer(
          pairAddress,
          extra
        );

        const before =
          await token0.balanceOf(
            user.address
          );

        await pair.skim(
          user.address
        );

        const after =
          await token0.balanceOf(
            user.address
          );

        expect(
          after -
          before
        ).to.equal(
          extra
        );

        const reserves =
          await pair.getReserves();

        expect(
          reserves[0]
        ).to.equal(
          LIQUIDITY_AMOUNT
        );
      }
    );

    it(
      "skim zero address'e yapılamamalı",
      async function () {
        await expect(
          pair.skim(
            ethers.ZeroAddress
          )
        ).to.be.revertedWith(
          "NumenDEX: ZERO_TO"
        );
      }
    );
  });

  // ===========================================================
  // PROTOCOL FEE
  // ===========================================================

  describe("Protocol fee", function () {
    it(
      "feeTo factory üzerinden ayarlanabilmeli",
      async function () {
        await factory.setFeeTo(
          feeReceiver.address
        );

        expect(
          await factory.feeTo()
        ).to.equal(
          feeReceiver.address
        );
      }
    );

    it(
      "fee kapalıyken kLast başlangıçta sıfır kalmalı",
      async function () {
        await addLiquidity();

        expect(
          await pair.kLast()
        ).to.equal(
          0n
        );
      }
    );

    it(
      "fee açıkken mint sonrası kLast güncellenmeli",
      async function () {
        await factory.setFeeTo(
          feeReceiver.address
        );

        await addLiquidity();

        const reserves =
          await pair.getReserves();

        expect(
          await pair.kLast()
        ).to.equal(
          reserves[0] *
          reserves[1]
        );
      }
    );
  });
});