import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NUMEN_NETWORK,
} from "../config/network";

const WALLET_DISCONNECTED_KEY =
  "numendex_wallet_disconnected";

function getEthereumProvider() {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  return window.ethereum || null;
}

function wasManuallyDisconnected() {
  if (
    typeof window === "undefined"
  ) {
    return false;
  }

  return (
    window.localStorage.getItem(
      WALLET_DISCONNECTED_KEY
    ) === "true"
  );
}

function setManualDisconnectState(
  disconnected
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  if (disconnected) {
    window.localStorage.setItem(
      WALLET_DISCONNECTED_KEY,
      "true"
    );

    return;
  }

  window.localStorage.removeItem(
    WALLET_DISCONNECTED_KEY
  );
}

export default function useWallet() {
  const [account, setAccount] =
    useState("");

  const [chainId, setChainId] =
    useState("");

  const [connecting, setConnecting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    manuallyDisconnected,
    setManuallyDisconnected,
  ] = useState(() =>
    wasManuallyDisconnected()
  );

  const isConnected =
    Boolean(account);

  const isNumenNetwork =
    useMemo(() => {
      if (!chainId) {
        return false;
      }

      return (
        chainId.toLowerCase() ===
        NUMEN_NETWORK.chainIdHex.toLowerCase()
      );
    }, [chainId]);

  const switchToNumen =
    useCallback(async () => {
      const ethereum =
        getEthereumProvider();

      if (!ethereum) {
        setError(
          "MetaMask was not detected."
        );

        return false;
      }

      setError("");

      try {
        await ethereum.request({
          method:
            "wallet_switchEthereumChain",

          params: [
            {
              chainId:
                NUMEN_NETWORK.chainIdHex,
            },
          ],
        });

        setChainId(
          NUMEN_NETWORK.chainIdHex
        );

        return true;
      } catch (switchError) {
        if (switchError?.code === 4902) {
          try {
            await ethereum.request({
              method:
                "wallet_addEthereumChain",

              params: [
                {
                  chainId:
                    NUMEN_NETWORK.chainIdHex,

                  chainName:
                    NUMEN_NETWORK.chainName,

                  nativeCurrency:
                    NUMEN_NETWORK.nativeCurrency,

                  rpcUrls:
                    NUMEN_NETWORK.rpcUrls,

                  blockExplorerUrls:
                    NUMEN_NETWORK.blockExplorerUrls,
                },
              ],
            });

            setChainId(
              NUMEN_NETWORK.chainIdHex
            );

            return true;
          } catch (addError) {
            setError(
              addError?.message ||
                "Could not add Numen Network."
            );

            return false;
          }
        }

        setError(
          switchError?.message ||
            "Could not switch to Numen Network."
        );

        return false;
      }
    }, []);

  const connect =
    useCallback(async () => {
      const ethereum =
        getEthereumProvider();

      setError("");

      if (!ethereum) {
        setError(
          "MetaMask was not detected."
        );

        return false;
      }

      try {
        setConnecting(true);

        /*
         * Because Disconnect attempts to revoke
         * the eth_accounts permission, this request
         * should ask MetaMask for account access
         * again after a manual disconnect.
         */
        const accounts =
          await ethereum.request({
            method:
              "eth_requestAccounts",
          });

        if (!accounts?.length) {
          throw new Error(
            "No wallet account selected."
          );
        }

        /*
         * Only clear the manual disconnect flag
         * after MetaMask has successfully returned
         * an authorized account.
         */
        setManualDisconnectState(false);
        setManuallyDisconnected(false);

        setAccount(
          accounts[0]
        );

        const currentChainId =
          await ethereum.request({
            method: "eth_chainId",
          });

        setChainId(
          currentChainId || ""
        );

        if (
          currentChainId.toLowerCase() !==
          NUMEN_NETWORK.chainIdHex.toLowerCase()
        ) {
          return await switchToNumen();
        }

        return true;
      } catch (connectError) {
        setError(
          connectError?.message ||
            "Wallet connection failed."
        );

        return false;
      } finally {
        setConnecting(false);
      }
    }, [switchToNumen]);

  const disconnect =
    useCallback(async () => {
      const ethereum =
        getEthereumProvider();

      /*
       * First disconnect the wallet from
       * the NumenDEX application state.
       *
       * This flag prevents eth_accounts and
       * accountsChanged from automatically
       * restoring the account.
       */
      setManualDisconnectState(true);
      setManuallyDisconnected(true);

      setAccount("");
      setError("");

      if (!ethereum) {
        return true;
      }

      /*
       * MetaMask normally keeps the website's
       * account permission even after a dApp
       * clears its own account state.
       *
       * Revoke eth_accounts permission when
       * supported so the next Connect Wallet
       * action requires wallet authorization
       * again.
       */
      try {
        await ethereum.request({
          method:
            "wallet_revokePermissions",

          params: [
            {
              eth_accounts: {},
            },
          ],
        });
      } catch (revokeError) {
        /*
         * Not every injected wallet supports
         * wallet_revokePermissions.
         *
         * Do not restore the session if revocation
         * is unsupported. NumenDEX remains
         * disconnected through its local state.
         */
        console.warn(
          "Wallet permission could not be revoked:",
          revokeError
        );
      }

      return true;
    }, []);

  useEffect(() => {
    const ethereum =
      getEthereumProvider();

    if (!ethereum) {
      return undefined;
    }

    let mounted = true;

    const initializeWallet =
      async () => {
        try {
          const currentChainId =
            await ethereum.request({
              method: "eth_chainId",
            });

          if (!mounted) {
            return;
          }

          setChainId(
            currentChainId || ""
          );

          /*
           * If the user explicitly disconnected
           * NumenDEX, do not silently restore the
           * account even if MetaMask still has
           * an existing permission.
           */
          if (
            wasManuallyDisconnected()
          ) {
            setAccount("");
            setManuallyDisconnected(true);

            return;
          }

          /*
           * eth_accounts does not open MetaMask.
           * It only restores an already-authorized
           * wallet session when the user did not
           * manually disconnect.
           */
          const accounts =
            await ethereum.request({
              method: "eth_accounts",
            });

          if (!mounted) {
            return;
          }

          setAccount(
            accounts?.[0] || ""
          );
        } catch (initializeError) {
          console.error(
            "Could not initialize wallet:",
            initializeError
          );
        }
      };

    const handleAccountsChanged =
      (accounts) => {
        /*
         * MetaMask can emit account events even
         * after NumenDEX has locally disconnected.
         *
         * Ignore those events until Connect Wallet
         * succeeds again.
         */
        if (
          wasManuallyDisconnected()
        ) {
          setAccount("");

          return;
        }

        setAccount(
          accounts?.[0] || ""
        );

        setError("");
      };

    const handleChainChanged =
      (newChainId) => {
        setChainId(
          newChainId || ""
        );

        setError("");
      };

    initializeWallet();

    ethereum.on?.(
      "accountsChanged",
      handleAccountsChanged
    );

    ethereum.on?.(
      "chainChanged",
      handleChainChanged
    );

    return () => {
      mounted = false;

      ethereum.removeListener?.(
        "accountsChanged",
        handleAccountsChanged
      );

      ethereum.removeListener?.(
        "chainChanged",
        handleChainChanged
      );
    };
  }, []);

  const clearError =
    useCallback(() => {
      setError("");
    }, []);

  return {
    account,
    chainId,
    connecting,
    error,

    isConnected,
    isNumenNetwork,
    manuallyDisconnected,

    connect,
    disconnect,
    switchToNumen,
    clearError,
  };
}