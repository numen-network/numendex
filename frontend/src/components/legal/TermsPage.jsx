import "./LegalPage.css";

function TermsPage({
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

          <h1>Terms of Service</h1>

          <p>
            These Terms govern access to and use
            of the NumenDEX interface. By using
            the interface, you agree to these
            Terms.
          </p>

          <div className="legal-meta">
            <span>Effective: October 6, 2026</span>
            <span>Last updated: October 6, 2026</span>
          </div>
        </header>

        <section>
          <h2>1. The service</h2>
          <p>
            NumenDEX provides a non-custodial
            software interface for interacting
            with decentralized smart contracts
            and blockchain infrastructure on
            Numen Network.
          </p>

          <p>
            The interface does not take custody
            of your wallet credentials and does
            not execute transactions without a
            transaction being authorized through
            your connected wallet.
          </p>
        </section>

        <section>
          <h2>2. Your wallet and responsibility</h2>
          <p>
            You are responsible for your wallet,
            private keys, seed phrases, devices
            and transaction approvals. Losing
            access to wallet credentials may
            permanently prevent access to digital
            assets.
          </p>

          <p>
            Always review token addresses,
            recipients, amounts, slippage and
            transaction details before signing.
          </p>
        </section>

        <section>
          <h2>3. Blockchain transactions</h2>
          <p>
            Blockchain transactions can be
            irreversible. Once a transaction is
            submitted and confirmed, NumenDEX
            generally cannot cancel, reverse or
            modify it.
          </p>

          <p>
            Network congestion, RPC availability,
            wallet software, smart contracts or
            other technical conditions may delay
            or prevent a transaction.
          </p>
        </section>

        <section>
          <h2>4. Digital asset risks</h2>
          <p>
            Digital assets can be volatile and
            may lose some or all of their value.
            Tokens can contain technical,
            economic, governance, liquidity or
            counterparty risks. The availability
            of a token or pool in the interface
            does not constitute an endorsement.
          </p>
        </section>

        <section>
          <h2>5. Liquidity and smart-contract risks</h2>
          <p>
            Providing liquidity can involve
            impermanent loss, price movement,
            low-liquidity conditions and
            smart-contract risk. Smart contracts
            and blockchain software can contain
            bugs, vulnerabilities or unexpected
            behavior.
          </p>
        </section>

        <section>
          <h2>6. Fees</h2>
          <p>
            NumenDEX may describe its interface
            as having zero app fees where no
            separate fee is charged by the
            NumenDEX application for the relevant
            action. Blockchain gas costs,
            protocol-level swap fees, token fees
            or third-party service fees can still
            apply.
          </p>
        </section>

        <section>
          <h2>7. Third-party services</h2>
          <p>
            Wallets, bridges, explorers, RPC
            providers, websites and other
            third-party services are independent
            from the NumenDEX interface. Their
            availability, security and operation
            are outside the direct control of
            NumenDEX.
          </p>
        </section>

        <section>
          <h2>8. No investment advice</h2>
          <p>
            Information displayed through
            NumenDEX is provided for software and
            informational purposes. It is not
            investment, legal, tax or financial
            advice and does not guarantee the
            value, legitimacy or future
            performance of any asset.
          </p>
        </section>

        <section>
          <h2>9. Prohibited use</h2>
          <p>
            You may not use the interface in a
            manner that violates applicable law,
            interferes with the service, attempts
            unauthorized access, distributes
            malicious software or intentionally
            abuses the underlying infrastructure.
          </p>
        </section>

        <section>
          <h2>10. Availability and changes</h2>
          <p>
            The interface may be modified,
            suspended or discontinued. Features,
            smart-contract integrations and
            supported infrastructure may change
            as the Numen ecosystem evolves.
          </p>
        </section>

        <section>
          <h2>11. Disclaimer</h2>
          <p>
            To the extent permitted by applicable
            law, the interface is provided on an
            “as is” and “as available” basis
            without guarantees that it will
            always be uninterrupted, error-free
            or suitable for a particular purpose.
          </p>
        </section>

        <section>
          <h2>12. Limitation of liability</h2>
          <p>
            To the extent permitted by applicable
            law, users remain responsible for
            decisions and transactions made
            through their wallets. Nothing in
            these Terms excludes liability that
            cannot lawfully be excluded.
          </p>
        </section>

        <section>
          <h2>13. Changes to these Terms</h2>
          <p>
            These Terms may be updated as the
            service changes. The latest version
            will be made available through
            NumenDEX.
          </p>
        </section>

        <section>
          <h2>14. Contact</h2>
          <p>
            Questions about these Terms can be
            sent to{" "}
            <a href="mailto:contact@numen-network.org">
              contact@numen-network.org
            </a>.
          </p>
        </section>
      </article>
    </div>
  );
}

export default TermsPage;
