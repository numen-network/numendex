import {
  useEffect,
  useState,
} from "react";

import "./App.css";

import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

import SwapCard from "./components/swap/SwapCard";
import MarketChart from "./components/swap/MarketChart";

import PoolsPage from "./components/pools/PoolsPage";
import PoolDetail from "./components/pools/PoolDetail";
import CreatePoolPage from "./components/pools/CreatePoolPage";

import AddLiquidityPage from "./components/liquidity/AddLiquidityPage";

import AssetStudioPage from "./components/assets/AssetStudioPage";
import ExplorePage from "./components/explore/ExplorePage";
import TokenDetail from "./components/explore/TokenDetail";
import PortfolioPage from "./components/portfolio/PortfolioPage";
import PrivacyPage from "./components/legal/PrivacyPage";
import TermsPage from "./components/legal/TermsPage";

import useTheme from "./hooks/useTheme";
import useWallet from "./hooks/useWallet";

const PAGE_PATHS = { swap: "/", explore: "/explore", pools: "/pools", portfolio: "/portfolio", assets: "/assets", privacy: "/privacy", terms: "/terms" };
function menuFromPath() { return Object.entries(PAGE_PATHS).find(([, path]) => path === window.location.pathname)?.[0] || "swap"; }
function App() {
  const [
    activeMenu,
    setActiveMenu,
  ] =
    useState(menuFromPath);

  const [
    selectedPool,
    setSelectedPool,
  ] =
    useState(null);

  const [
    selectedToken,
    setSelectedToken,
  ] =
    useState(null);

  const [
    liquidityOpen,
    setLiquidityOpen,
  ] =
    useState(false);

  const [
    liquidityPool,
    setLiquidityPool,
  ] =
    useState(null);

  const [
    createPoolOpen,
    setCreatePoolOpen,
  ] =
    useState(false);

  const [
    chartOpen,
    setChartOpen,
  ] =
    useState(false);

  const [
    swapPool,
    setSwapPool,
  ] =
    useState(null);

  const {
    theme,
    toggleTheme,
  } = useTheme();

  const {
    account,
    connecting,
    error: walletError,

    isNumenNetwork,

    connect,
    disconnect,
    switchToNumen,
  } = useWallet();

  const scrollTop =
    () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  useEffect(() => {
    const pageTitles = {
      swap: "Swap | NumenDEX",
      explore: "Explore | NumenDEX",
      pools: "Pools | NumenDEX",
      portfolio: "Portfolio | NumenDEX",
      assets: "Tokenization | NumenDEX",
      privacy: "Privacy Policy | NumenDEX",
      terms: "Terms of Service | NumenDEX",
    };

    document.title =
      pageTitles[activeMenu] ||
      "NumenDEX";
  }, [activeMenu]);

  useEffect(() => {
    const handlePopState = () => {
      setActiveMenu(menuFromPath());
      setSelectedPool(null);
      setSelectedToken(null);
      setLiquidityOpen(false);
      setCreatePoolOpen(false);
      window.scrollTo({
        top: 0,
        behavior: "auto",
      });
    };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, []);

  const handleNavigate = (
    menu
  ) => {
    const nextPath = PAGE_PATHS[menu] || "/";

    if (
      window.location.pathname !==
      nextPath
    ) {
      window.history.pushState(
        {},
        "",
        nextPath
      );
    }

    setActiveMenu(
      menu
    );

    setSelectedPool(
      null
    );

    setSelectedToken(
      null
    );

    setLiquidityOpen(
      false
    );

    setLiquidityPool(
      null
    );

    setCreatePoolOpen(
      false
    );

    if (
      menu !== "swap"
    ) {
      setChartOpen(
        false
      );

      setSwapPool(
        null
      );
    }

    scrollTop();
  };

  const toggleChart =
    () => {
      setChartOpen(
        (current) =>
          !current
      );
    };

  const handleSelectPool = (
    pool
  ) => {
    if (!pool) {
      return;
    }

    setSelectedPool(
      pool
    );

    setLiquidityOpen(
      false
    );

    setLiquidityPool(
      null
    );

    setCreatePoolOpen(
      false
    );

    setActiveMenu(
      "pools"
    );

    setChartOpen(
      false
    );

    scrollTop();
  };

  const handleBackToPools =
    () => {
      setSelectedPool(
        null
      );

      setLiquidityOpen(
        false
      );

      setLiquidityPool(
        null
      );

      setCreatePoolOpen(
        false
      );

      setActiveMenu(
        "pools"
      );

      scrollTop();
    };

  const handlePoolSwap = (
    poolInfo
  ) => {
    setSwapPool(
      poolInfo ||
        null
    );

    setSelectedPool(
      null
    );

    setLiquidityOpen(
      false
    );

    setLiquidityPool(
      null
    );

    setCreatePoolOpen(
      false
    );

    setActiveMenu(
      "swap"
    );

    setChartOpen(
      false
    );

    scrollTop();
  };

  /*
   * ========================================
   * NEW LIQUIDITY POSITION
   * ========================================
   *
   * Pools -> New position
   *
   * No pool is supplied, so the user
   * selects the token pair inside the
   * Add Liquidity workspace.
   */
  const handleNewPosition =
    () => {
      setLiquidityPool(
        null
      );

      setSelectedPool(
        null
      );

      setCreatePoolOpen(
        false
      );

      setLiquidityOpen(
        true
      );

      setActiveMenu(
        "pools"
      );

      setChartOpen(
        false
      );

      scrollTop();
    };

  /*
   * ========================================
   * CREATE POOL
   * ========================================
   */
  const handleCreatePool =
    () => {
      setSelectedPool(
        null
      );

      setLiquidityOpen(
        false
      );

      setLiquidityPool(
        null
      );

      setCreatePoolOpen(
        true
      );

      setActiveMenu(
        "pools"
      );

      setChartOpen(
        false
      );

      setSwapPool(
        null
      );

      scrollTop();
    };

  /*
   * ========================================
   * CREATE TOKEN / ASSET STUDIO
   * ========================================
   */
  const handleCreateToken =
    () => {
      setSelectedPool(
        null
      );

      setLiquidityOpen(
        false
      );

      setLiquidityPool(
        null
      );

      setCreatePoolOpen(
        false
      );

      setChartOpen(
        false
      );

      setSwapPool(
        null
      );

      setActiveMenu(
        "assets"
      );

      scrollTop();
    };

  /*
   * ========================================
   * ASSET STUDIO -> POOLS
   * ========================================
   */
  const handleBackFromAssetStudio =
    () => {
      setSelectedPool(
        null
      );

      setLiquidityOpen(
        false
      );

      setLiquidityPool(
        null
      );

      setCreatePoolOpen(
        false
      );

      setChartOpen(
        false
      );

      setSwapPool(
        null
      );

      setActiveMenu(
        "pools"
      );

      scrollTop();
    };

  /*
   * ========================================
   * ADD LIQUIDITY
   * ========================================
   *
   * Pool Detail -> Add liquidity
   *
   * Create Pool -> Add liquidity
   *
   * Keep the supplied pool as the initial
   * pair for AddLiquidityPage.
   */
  const handleAddLiquidity =
    (poolInfo) => {
      setLiquidityPool(
        poolInfo ||
          selectedPool ||
          null
      );

      setSelectedPool(
        null
      );

      setCreatePoolOpen(
        false
      );

      setLiquidityOpen(
        true
      );

      setActiveMenu(
        "pools"
      );

      setChartOpen(
        false
      );

      scrollTop();
    };

  const handleLiquiditySuccess =
    () => {
      /*
       * We intentionally keep the success
       * screen visible so the transaction
       * hash remains accessible to the user.
       *
       * Pool/indexer data will update
       * independently.
       */
    };

  /*
   * ========================================
   * POOL CREATED
   * ========================================
   *
   * CreatePoolPage keeps its success screen
   * visible after creation.
   *
   * We do not automatically navigate away
   * because the user may want to copy the
   * pair address or transaction hash.
   */
  const handlePoolCreated =
    (result) => {
      if (!result) {
        return;
      }

      console.log(
        "Pool created:",
        result
      );
    };

  const handleSelectToken =
    (token) => {
      if (!token) {
        return;
      }

      setSelectedToken(
        token
      );

      setSelectedPool(
        null
      );

      setLiquidityOpen(
        false
      );

      setLiquidityPool(
        null
      );

      setCreatePoolOpen(
        false
      );

      setChartOpen(
        false
      );

      setSwapPool(
        null
      );

      setActiveMenu(
        "explore"
      );

      scrollTop();
    };

  const handleBackToExplore =
    () => {
      setSelectedToken(
        null
      );

      setActiveMenu(
        "explore"
      );

      scrollTop();
    };

  const renderPage =
    () => {
      /*
       * ========================================
       * LEGAL
       * ========================================
       */

      if (
        activeMenu ===
        "privacy"
      ) {
        return (
          <PrivacyPage
            onBack={() =>
              handleNavigate("swap")
            }
          />
        );
      }

      if (
        activeMenu ===
        "terms"
      ) {
        return (
          <TermsPage
            onBack={() =>
              handleNavigate("swap")
            }
          />
        );
      }

      /*
       * ========================================
       * ASSET STUDIO
       * ========================================
       */

      if (
        activeMenu ===
        "assets"
      ) {
        return (
          <AssetStudioPage
            account={
              account
            }
            connecting={
              connecting
            }
            isNumenNetwork={
              isNumenNetwork
            }
            onConnect={
              connect
            }
            onSwitchNetwork={
              switchToNumen
            }
            onBack={
              handleBackFromAssetStudio
            }
          />
        );
      }

      /*
       * ========================================
       * POOLS
       * ========================================
       */

      if (
        activeMenu ===
        "pools"
      ) {
        /*
         * Create Pool has the highest
         * priority inside the Pools
         * workspace.
         */
        if (
          createPoolOpen
        ) {
          return (
            <CreatePoolPage
              account={
                account
              }
              connecting={
                connecting
              }
              isNumenNetwork={
                isNumenNetwork
              }
              onConnect={
                connect
              }
              onSwitchNetwork={
                switchToNumen
              }
              onBack={
                handleBackToPools
              }
              onAddLiquidity={
                handleAddLiquidity
              }
              onPoolCreated={
                handlePoolCreated
              }
            />
          );
        }

        /*
         * Add Liquidity workspace has
         * priority over Pool Detail.
         */
        if (
          liquidityOpen
        ) {
          return (
            <AddLiquidityPage
              account={
                account
              }
              connecting={
                connecting
              }
              isNumenNetwork={
                isNumenNetwork
              }
              walletError={
                walletError
              }
              onConnect={
                connect
              }
              onSwitchNetwork={
                switchToNumen
              }
              initialPool={
                liquidityPool
              }
              onBack={
                handleBackToPools
              }
              onSuccess={
                handleLiquiditySuccess
              }
            />
          );
        }

        /*
         * Pool detail.
         */
        if (
          selectedPool
        ) {
          return (
            <PoolDetail
              pool={
                selectedPool
              }
              account={
                account
              }
              connecting={
                connecting
              }
              isNumenNetwork={
                isNumenNetwork
              }
              onConnect={
                connect
              }
              onSwitchNetwork={
                switchToNumen
              }
              onBack={
                handleBackToPools
              }
              onSwap={
                handlePoolSwap
              }
              onAddLiquidity={
                handleAddLiquidity
              }
            />
          );
        }

        /*
         * Pools overview.
         */
        return (
          <PoolsPage
            account={
              account
            }
            connecting={
              connecting
            }
            isNumenNetwork={
              isNumenNetwork
            }
            onConnect={
              connect
            }
            onSwitchNetwork={
              switchToNumen
            }
            onSelectPool={
              handleSelectPool
            }
            onNewPosition={
              handleNewPosition
            }
            onCreatePool={
              handleCreatePool
            }
            onCreateToken={
              handleCreateToken
            }
          />
        );
      }

      /*
       * ========================================
       * EXPLORE / PORTFOLIO
       * ========================================
       */

      if (
        activeMenu ===
        "explore"
      ) {
        if (
          selectedToken
        ) {
          return (
            <TokenDetail
              token={
                selectedToken
              }
              account={
                account
              }
              connecting={
                connecting
              }
              isNumenNetwork={
                isNumenNetwork
              }
              walletError={
                walletError
              }
              onConnect={
                connect
              }
              onSwitchNetwork={
                switchToNumen
              }
              onBack={
                handleBackToExplore
              }
              onSelectPool={
                handleSelectPool
              }
            />
          );
        }

        return (
          <ExplorePage
            onSelectPool={
              handleSelectPool
            }
            onSelectToken={
              handleSelectToken
            }
            onCreateToken={
              handleCreateToken
            }
          />
        );
      }

      if (
        activeMenu ===
        "portfolio"
      ) {
        return (
          <PortfolioPage
            account={account}
            connecting={connecting}
            isNumenNetwork={isNumenNetwork}
            onConnect={connect}
            onSwitchNetwork={switchToNumen}
            onSelectPool={handleSelectPool}
            onNavigate={handleNavigate}
          />
        );
      }

      /*
       * ========================================
       * SWAP
       * ========================================
       */

      return (
        <div
          className={
            chartOpen
              ? "trade-layout chart-visible"
              : "trade-layout chart-hidden"
          }
        >
          {chartOpen && (
            <MarketChart
              onClose={() =>
                setChartOpen(
                  false
                )
              }
            />
          )}

          <div className="swap-home-panel">
            {!chartOpen && (
              <>
                <div className="numen-swap-visuals" aria-hidden="true">
                  <div className="numen-orb numen-orb-1" />
                  <div className="numen-orb numen-orb-2" />
                  <div className="numen-orb numen-orb-3" />
                  <div className="numen-orb numen-orb-4" />
                  <div className="numen-orb numen-orb-5" />
                  <div className="numen-orb numen-orb-6" />

                  <div className="numen-mesh numen-mesh-1">
                    <span />
                    <span />
                    <span />
                  </div>

                  <div className="numen-mesh numen-mesh-2">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className="swap-home-hero">
                  <span className="swap-home-eyebrow">
                    Numen Network
                  </span>

                  <h1>
                    Swap anytime,
                    <br />
                    anywhere.
                  </h1>
                </div>
              </>
            )}

            <SwapCard
            account={
              account
            }
            connecting={
              connecting
            }
            isNumenNetwork={
              isNumenNetwork
            }
            walletError={
              walletError
            }
            onConnect={
              connect
            }
            onSwitchNetwork={
              switchToNumen
            }
            chartOpen={
              chartOpen
            }
            onToggleChart={
              toggleChart
            }
            initialPool={
              swapPool
            }
          />

            {!chartOpen && (
              <p className="swap-home-fee-note">
                Buy and sell crypto on Numen with{" "}
                <strong>zero app fees</strong>.
              </p>
            )}
          </div>
        </div>
      );
    };

  return (
    <div className="app-shell">
      <div className="background-grid" />

      <Header
        activeMenu={
          activeMenu
        }
        onNavigate={
          handleNavigate
        }
        theme={
          theme
        }
        onToggleTheme={
          toggleTheme
        }
        account={
          account
        }
        connecting={
          connecting
        }
        isNumenNetwork={
          isNumenNetwork
        }
        onConnect={
          connect
        }
        onDisconnect={
          disconnect
        }
        onSwitchNetwork={
          switchToNumen
        }
      />

      <main className="main-content">
        {renderPage()}
      </main>

      <Footer
        onNavigate={
          handleNavigate
        }
      />
    </div>
  );
}

export default App;