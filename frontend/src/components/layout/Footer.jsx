import "./Footer.css";
import NumenLogo from "../common/NumenLogo";
import LINKS from "../../config/links";

function Footer({
  onNavigate,
}) {
  return (
    <footer className="site-footer">
      <div
        className="footer-glow footer-glow-left"
        aria-hidden="true"
      />

      <div
        className="footer-glow footer-glow-right"
        aria-hidden="true"
      />

      <div className="footer-inner">
        <div className="footer-main">
          <section className="footer-brand-area">
            <button
              type="button"
              className="footer-brand"
              onClick={() =>
                onNavigate?.("swap")
              }
              aria-label="Go to NumenDEX Swap"
            >
              <span className="footer-logo-shell">
                <NumenLogo size={44} />
              </span>

              <span className="footer-brand-copy">
                <span className="footer-brand-name">
                  <span>NUMEN</span>
                  <strong>DEX</strong>
                </span>

                <span className="footer-brand-description">
                  Decentralized liquidity and asset
                  infrastructure built natively for the
                  Numen ecosystem.
                </span>
              </span>
            </button>

            <div className="footer-network-card">
              <div className="footer-network-status">
                <span />

                <div>
                  <small>
                    Native network
                  </small>

                  <strong>
                    Numen Network
                  </strong>
                </div>
              </div>

              <span className="footer-network-label">
                Chain ID 32026
              </span>
            </div>
          </section>

          <section className="footer-social-section">
            <div className="footer-column-heading">
              <span />

              <div>
                <h3>Official Links</h3>

                <p>
                  Explore Numen Network products,
                  tools and official community channels.
                </p>
              </div>
            </div>

            <div className="footer-socials">
              <a
                href={LINKS.website}
                target="_blank"
                rel="noreferrer"
                aria-label="Numen Network Website"
              >
                <span className="social-symbol">
                  ◎
                </span>

                <span>Website</span>
              </a>

              <a
                href={LINKS.wallet}
                target="_blank"
                rel="noreferrer"
                aria-label="Numen Wallet"
              >
                <span className="social-symbol">
                  W
                </span>

                <span>Numen Wallet</span>
              </a>

              <a
                href={LINKS.explorer}
                target="_blank"
                rel="noreferrer"
                aria-label="Numen Explorer"
              >
                <span className="social-symbol">
                  E
                </span>

                <span>Numen Explorer</span>
              </a>

              <a
                href={LINKS.x}
                target="_blank"
                rel="noreferrer"
                aria-label="Numen on X"
              >
                <span className="social-symbol">
                  X
                </span>

                <span>X</span>
              </a>

              <a
                href={LINKS.discord}
                target="_blank"
                rel="noreferrer"
                aria-label="Numen Discord"
              >
                <span className="social-symbol">
                  D
                </span>

                <span>Discord</span>
              </a>

              <a
                href={LINKS.telegram}
                target="_blank"
                rel="noreferrer"
                aria-label="Numen Telegram"
              >
                <span className="social-symbol">
                  TG
                </span>

                <span>Telegram</span>
              </a>

              <a
                href={LINKS.github}
                target="_blank"
                rel="noreferrer"
                aria-label="Numen GitHub"
              >
                <span className="social-symbol">
                  GH
                </span>

                <span>GitHub</span>
              </a>

              <a
                href={LINKS.contact}
                aria-label="Contact Numen"
              >
                <span className="social-symbol">
                  @
                </span>

                <span>Contact</span>
              </a>
            </div>
          </section>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            <span>
              © 2026 NumenDEX
            </span>

            <span
              className="footer-dot"
              aria-hidden="true"
            >
              •
            </span>

            <span>
              Built on Numen Network
            </span>
          </div>

          <div className="footer-bottom-center">
            <span className="footer-live-dot" />
            Decentralized infrastructure
          </div>

          <div className="footer-legal">
            <button
              type="button"
              onClick={() =>
                onNavigate?.("privacy")
              }
            >
              Privacy Policy
            </button>

            <button
              type="button"
              onClick={() =>
                onNavigate?.("terms")
              }
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
