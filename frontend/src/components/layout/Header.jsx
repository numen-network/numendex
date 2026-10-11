import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./Header.css";

import NumenLogo from "../common/NumenLogo";

import {
  evmToNumenAddress,
  getNumenAccountExplorerUrl,
} from "../../utils/numenAddress";


const NAV_ITEMS = [
  {
    id: "swap",
    label: "Swap",
  },
  {
    id: "explore",
    label: "Explore",
  },
  {
    id: "pools",
    label: "Pools",
  },
  {
    id: "portfolio",
    label: "Portfolio",
  },
];


function shortenAddress(address) {
  if (!address) {
    return "";
  }

  return `${address.slice(
    0,
    6
  )}...${address.slice(-4)}`;
}


function Header({
  activeMenu,
  onNavigate,

  theme,
  onToggleTheme,

  account,
  connecting,
  isNumenNetwork,

  onConnect,
  onDisconnect,
  onSwitchNetwork,
}) {
  const [
    walletMenuOpen,
    setWalletMenuOpen,
  ] = useState(false);

  const walletMenuRef =
    useRef(null);


  /* =========================================================
     CLOSE WALLET MENU ON OUTSIDE CLICK
     ========================================================= */

  useEffect(() => {
    const handleOutsideClick =
      (event) => {
        if (
          walletMenuRef.current &&
          !walletMenuRef.current.contains(
            event.target
          )
        ) {
          setWalletMenuOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);


  /* =========================================================
     CLOSE MENU AFTER DISCONNECT
     ========================================================= */

  useEffect(() => {
    if (!account) {
      setWalletMenuOpen(false);
    }
  }, [account]);


  /* =========================================================
     WALLET BUTTON
     ========================================================= */

  const handleWalletClick = () => {
    if (!account) {
      onConnect?.();
      return;
    }

    if (!isNumenNetwork) {
      onSwitchNetwork?.();
      return;
    }

    setWalletMenuOpen(
      (current) => !current
    );
  };


  /* =========================================================
     COPY EVM ADDRESS
     ========================================================= */

  const handleCopyAddress =
    async () => {
      if (!account) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          account
        );
      } catch (error) {
        console.error(
          "Could not copy wallet address:",
          error
        );
      }

      setWalletMenuOpen(false);
    };


  /* =========================================================
     VIEW ON NUMEN EXPLORER
     ========================================================= */

  const handleExplorer = () => {
    if (!account) {
      return;
    }

    try {
      /*
       * MetaMask gives NumenDEX an
       * Ethereum H160 address:
       *
       * 0x...
       *
       * Numen Explorer account pages
       * use the corresponding Numen
       * SS58 address.
       *
       * getNumenAccountExplorerUrl()
       * performs that conversion before
       * constructing the Explorer URL.
       */

      const explorerUrl =
        getNumenAccountExplorerUrl(
          account
        );

      window.open(
        explorerUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(
        "Could not create Numen Explorer URL:",
        error
      );
    }

    setWalletMenuOpen(false);
  };


  /* =========================================================
     DISCONNECT
     ========================================================= */

  const handleDisconnect = () => {
    setWalletMenuOpen(false);

    onDisconnect?.();
  };


  /* =========================================================
     WALLET LABEL
     ========================================================= */

  let walletLabel =
    "Connect Wallet";

  if (connecting) {
    walletLabel =
      "Connecting...";
  } else if (
    account &&
    !isNumenNetwork
  ) {
    walletLabel =
      "Switch Network";
  } else if (account) {
    walletLabel =
      shortenAddress(account);
  }


  /* =========================================================
     NUMEN SS58 ADDRESS
     ========================================================= */

  let numenAddress = "";

  if (
    account &&
    isNumenNetwork
  ) {
    try {
      numenAddress =
        evmToNumenAddress(
          account
        );
    } catch {
      numenAddress = "";
    }
  }


  return (
    <header className="topbar">
      <div className="topbar-inner">

        {/* ===================================================
            BRAND
            =================================================== */}

        <button
          type="button"
          className="brand"
          onClick={() =>
            onNavigate?.("swap")
          }
        >
          <span className="brand-logo-shell">
            <NumenLogo size={38} />
          </span>

          <div className="brand-copy">
            <div className="brand-name">
              <span>NUMEN</span>

              <strong>
                DEX
              </strong>
            </div>

            <span className="brand-subtitle">
              Decentralized Exchange
            </span>
          </div>
        </button>


        {/* ===================================================
            NAVIGATION
            =================================================== */}

        <nav
          className="main-navigation"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map(
            (item) => {
              const active =
                activeMenu ===
                item.id;

              return (
                <button
                  type="button"
                  key={item.id}
                  className={
                    active
                      ? "nav-link active"
                      : "nav-link"
                  }
                  onClick={() =>
                    onNavigate?.(
                      item.id
                    )
                  }
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                >
                  <span>
                    {item.label}
                  </span>

                  {active && (
                    <span
                      className="nav-active-dot"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            }
          )}
        </nav>


        {/* ===================================================
            HEADER ACTIONS
            =================================================== */}

        <div className="topbar-actions">

          {/* =================================================
              NETWORK
              ================================================= */}

          <div
            className={`network-chip ${
              isNumenNetwork
                ? "network-chip-online"
                : ""
            }`}
          >
            <span
              className={
                isNumenNetwork
                  ? "network-status"
                  : "network-status network-status-offline"
              }
            />

            <span className="network-chip-copy">
              <small>
                Network
              </small>

              <strong>
                Numen
              </strong>
            </span>
          </div>


          {/* =================================================
              THEME
              ================================================= */}

          <button
            type="button"
            className="icon-button"
            onClick={
              onToggleTheme
            }
            aria-label="Toggle color theme"
            title="Toggle color theme"
          >
            <span className="theme-icon">
              {theme === "light"
                ? "☾"
                : "☀"}
            </span>
          </button>


          {/* =================================================
              WALLET
              ================================================= */}

          <div
            className="wallet-control"
            ref={walletMenuRef}
          >
            <button
              type="button"
              className={`connect-button ${
                account &&
                isNumenNetwork
                  ? "wallet-connected"
                  : ""
              }`}
              onClick={
                handleWalletClick
              }
              disabled={
                connecting
              }
              aria-label={
                account && isNumenNetwork
                  ? `Wallet ${shortenAddress(account)}`
                  : walletLabel
              }
              aria-expanded={
                account && isNumenNetwork
                  ? walletMenuOpen
                  : undefined
              }
            >
              {account &&
                isNumenNetwork && (
                  <span
                    className="wallet-status-dot"
                    aria-hidden="true"
                  />
                )}

              <span>
                {walletLabel}
              </span>

              {account &&
                isNumenNetwork && (
                  <span
                    className={`wallet-chevron ${
                      walletMenuOpen
                        ? "open"
                        : ""
                    }`}
                  >
                    ▾
                  </span>
                )}
            </button>


            {/* ===============================================
                WALLET DROPDOWN
                =============================================== */}

            {account &&
              isNumenNetwork &&
              walletMenuOpen && (
                <div className="wallet-menu">

                  <div className="wallet-menu-header">
                    <span className="wallet-menu-status">
                      <span />

                      Connected
                    </span>

                    <strong
                      title={account}
                    >
                      {shortenAddress(
                        account
                      )}
                    </strong>

                    {numenAddress && (
                      <small
                        title={
                          numenAddress
                        }
                      >
                        {shortenAddress(
                          numenAddress
                        )}
                      </small>
                    )}
                  </div>


                  <div className="wallet-menu-divider" />


                  {/* =========================================
                      COPY ADDRESS
                      ========================================= */}

                  <button
                    type="button"
                    className="wallet-menu-item"
                    onClick={
                      handleCopyAddress
                    }
                  >
                    <span className="wallet-menu-icon">
                      ⧉
                    </span>

                    <span>
                      Copy Address
                    </span>
                  </button>


                  {/* =========================================
                      EXPLORER
                      ========================================= */}

                  <button
                    type="button"
                    className="wallet-menu-item"
                    onClick={
                      handleExplorer
                    }
                  >
                    <span className="wallet-menu-icon">
                      ↗
                    </span>

                    <span>
                      View on Explorer
                    </span>
                  </button>


                  <div className="wallet-menu-divider" />


                  {/* =========================================
                      DISCONNECT
                      ========================================= */}

                  <button
                    type="button"
                    className="wallet-menu-item wallet-menu-disconnect"
                    onClick={
                      handleDisconnect
                    }
                  >
                    <span className="wallet-menu-icon">
                      ⏻
                    </span>

                    <span>
                      Disconnect
                    </span>
                  </button>

                </div>
              )}
          </div>
        </div>
      </div>
    </header>
  );
}


export default Header;