import "./LegalPage.css";

function PrivacyPage({
  onBack,
}) {
  return (
    <div className="legal-page">
      <div className="legal-page-glow" />

      <article className="legal-document">
        <button
          type="button"
          className="legal-back-button"
          onClick={onBack}
        >
          ← Back to NumenDEX
        </button>

        <header className="legal-header">
          <span className="legal-kicker">
            NumenDEX Legal
          </span>

          <h1>Privacy Policy</h1>

          <p>
            This Privacy Policy explains how the
            NumenDEX interface handles information
            when you access or use the service.
          </p>

          <div className="legal-meta">
            <span>Effective: October 6, 2026</span>
            <span>Last updated: October 6, 2026</span>
          </div>
        </header>

        <section>
          <h2>1. Overview</h2>
          <p>
            NumenDEX is a non-custodial interface
            for interacting with smart contracts
            and public blockchain infrastructure
            on Numen Network. You do not need to
            create a traditional user account to
            use the decentralized exchange
            interface.
          </p>
        </section>

        <section>
          <h2>2. Wallet and blockchain information</h2>
          <p>
            When you connect a compatible wallet,
            the interface can read the public
            wallet address you choose to expose.
            Transactions you submit are recorded
            on a public blockchain and may be
            permanently visible to anyone.
          </p>

          <p>
            NumenDEX does not need your wallet
            private key or seed phrase. You should
            never provide those credentials to
            NumenDEX or to anyone claiming to
            represent NumenDEX.
          </p>
        </section>

        <section>
          <h2>3. Information processed by the interface</h2>
          <p>
            The interface may process information
            required to provide its functions,
            including public wallet addresses,
            token and pool selections, transaction
            data, network identifiers, balances
            and other public on-chain information.
          </p>

          <p>
            Browser storage may be used for local
            preferences such as theme selection,
            wallet-session state or similar
            interface settings. This information
            is stored for product functionality
            rather than as a blockchain identity.
          </p>
        </section>

        <section>
          <h2>4. Network and infrastructure data</h2>
          <p>
            Requests to websites, RPC endpoints,
            APIs, hosting providers or other
            infrastructure can expose standard
            technical information such as IP
            address, browser type, device
            information, timestamps and request
            metadata to the relevant infrastructure
            provider.
          </p>
        </section>

        <section>
          <h2>5. Public blockchain data</h2>
          <p>
            Blockchain information is public by
            design. NumenDEX cannot delete,
            modify or make private information
            that has already been written to
            Numen Network or another public
            blockchain.
          </p>
        </section>

        <section>
          <h2>6. Third-party services</h2>
          <p>
            NumenDEX may link to or interact with
            independent services such as wallets,
            explorers, RPC infrastructure, bridges,
            social platforms or other websites.
            Those services operate under their own
            privacy practices and terms.
          </p>
        </section>

        <section>
          <h2>7. Security</h2>
          <p>
            We aim to design the interface so that
            users retain control of their wallets.
            No internet-based service can guarantee
            absolute security. Verify transaction
            details in your wallet before signing
            and use trusted devices and software.
          </p>
        </section>

        <section>
          <h2>8. Children</h2>
          <p>
            NumenDEX is not intended for children
            who are not legally permitted to use
            blockchain or financial software in
            their jurisdiction.
          </p>
        </section>

        <section>
          <h2>9. Changes to this policy</h2>
          <p>
            This policy may be updated as the
            interface, infrastructure or applicable
            requirements change. The latest version
            will be made available through NumenDEX.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            Questions about this Privacy Policy can
            be sent to{" "}
            <a href="mailto:contact@numen-network.org">
              contact@numen-network.org
            </a>.
          </p>
        </section>
      </article>
    </div>
  );
}

export default PrivacyPage;
