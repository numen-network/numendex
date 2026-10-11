.create-pool-page {
  width: 100%;
  min-height: calc(100vh - 80px);

  padding: 42px 24px 80px;

  background: var(--bg);
  color: var(--text);
}

.create-pool-shell {
  width: 100%;
  max-width: 760px;

  margin: 0 auto;
}

.create-pool-back {
  margin: 0 0 24px;
  padding: 0;

  border: 0;

  background: transparent;
  color: var(--text-secondary);

  font-size: 14px;
  font-weight: 650;

  cursor: pointer;

  transition:
    color 0.2s ease;
}

.create-pool-back:hover:not(:disabled) {
  color: var(--accent);
}

.create-pool-back:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-pool-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  gap: 24px;

  margin-bottom: 26px;
}

.create-pool-eyebrow {
  color: var(--accent);

  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.create-pool-heading h1 {
  margin: 7px 0 10px;

  color: var(--text);

  font-size: clamp(
    30px,
    5vw,
    42px
  );

  line-height: 1.08;
  letter-spacing: -0.035em;
}

.create-pool-heading p {
  max-width: 570px;

  margin: 0;

  color: var(--text-secondary);

  font-size: 14px;
  line-height: 1.65;
}

.create-pool-version {
  flex: 0 0 auto;

  padding: 8px 11px;

  border: 1px solid var(--border);
  border-radius: 10px;

  background: var(--surface-soft);
  color: var(--text-secondary);

  font-size: 12px;
  font-weight: 700;
}

.create-pool-card {
  padding: 22px;

  border: 1px solid var(--border);
  border-radius: 24px;

  background: var(--surface);

  box-shadow: var(--shadow);
}

.create-pool-token-section {
  padding: 18px;

  border: 1px solid var(--border);
  border-radius: 18px;

  background: var(--surface-soft);
}

.create-pool-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 16px;

  margin-bottom: 15px;
}

.create-pool-section-header > div {
  display: flex;
  flex-direction: column;

  gap: 4px;
}

.create-pool-label {
  color: var(--text-muted);

  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.create-pool-section-header strong {
  color: var(--text);

  font-size: 15px;
}

.create-pool-address-preview {
  color: var(--text-secondary);

  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;

  font-size: 11px;
}

.create-pool-token-list {
  display: flex;
  flex-wrap: wrap;

  gap: 8px;

  margin-bottom: 13px;
}

.create-pool-token-chip {
  min-height: 38px;

  display: inline-flex;
  align-items: center;

  gap: 8px;

  padding: 6px 11px;

  border: 1px solid var(--border);
  border-radius: 11px;

  background: var(--surface);
  color: var(--text-secondary);

  font-size: 13px;
  font-weight: 750;

  cursor: pointer;

  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.15s ease;
}

.create-pool-token-chip:hover:not(:disabled) {
  transform: translateY(-1px);

  border-color: var(--accent);
  color: var(--accent);
}

.create-pool-token-chip.active {
  border-color: var(--accent);

  background: var(--accent-soft);
  color: var(--accent);
}

.create-pool-token-chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;

  transform: none;
}

.create-pool-token-icon {
  width: 24px;
  height: 24px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border: 1px solid var(--border);
  border-radius: 50%;

  background: var(--surface-soft);
  color: var(--accent);

  font-size: 11px;
  font-weight: 850;
}

.create-pool-address-input {
  width: 100%;

  padding: 13px 14px;

  border: 1px solid var(--border);
  border-radius: 12px;
  outline: none;

  background: var(--surface);
  color: var(--text);

  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;

  font-size: 13px;

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.create-pool-address-input:focus {
  border-color: var(--accent);

  box-shadow:
    0 0 0 3px
    var(--accent-soft);
}

.create-pool-address-input::placeholder {
  color: var(--text-muted);
}

.create-pool-address-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.create-pool-switch-row {
  position: relative;

  height: 32px;

  display: flex;
  align-items: center;
  justify-content: center;
}

.create-pool-switch {
  position: relative;
  z-index: 2;

  width: 40px;
  height: 40px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 4px solid var(--surface);
  border-radius: 13px;

  background: var(--surface-soft);
  color: var(--text);

  font-size: 18px;
  font-weight: 800;

  cursor: pointer;

  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.create-pool-switch:hover:not(:disabled) {
  background: var(--accent-soft);
  color: var(--accent);

  transform: rotate(180deg);
}

.create-pool-switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.create-pool-info {
  margin-top: 18px;

  display: grid;
  grid-template-columns:
    repeat(3, 1fr);

  gap: 8px;
}

.create-pool-info > div {
  padding: 13px;

  border: 1px solid var(--border);
  border-radius: 12px;

  background: var(--surface-soft);
}

.create-pool-info span {
  display: block;

  margin-bottom: 5px;

  color: var(--text-muted);

  font-size: 11px;
}

.create-pool-info strong {
  color: var(--text);

  font-size: 13px;
}

.create-pool-message {
  margin-top: 16px;

  display: flex;
  flex-direction: column;

  gap: 5px;

  padding: 14px 15px;

  border-radius: 13px;

  font-size: 13px;
  line-height: 1.5;
}

.create-pool-message strong {
  font-size: 13px;
  font-weight: 800;
}

.create-pool-message code {
  margin-top: 5px;

  padding: 7px 8px;

  overflow-wrap: anywhere;

  border: 1px solid var(--border);
  border-radius: 7px;

  background: var(--surface);

  color: var(--text);

  font-size: 11px;
}

.create-pool-message-neutral {
  border: 1px solid var(--border-strong);

  background: var(--accent-soft);
  color: var(--text-secondary);
}

.create-pool-message-error {
  border: 1px solid var(--danger);

  background: var(--danger-soft);
  color: var(--danger);
}

.create-pool-message-warning {
  border: 1px solid var(--accent);

  background: var(--accent-soft);
  color: var(--text);
}

.create-pool-message-success {
  display: flex;
  flex-direction: row;
  align-items: flex-start;

  border: 1px solid var(--green);

  background:
    color-mix(
      in srgb,
      var(--green) 10%,
      var(--surface)
    );

  color: var(--green);
}

.create-pool-result-icon {
  flex: 0 0 auto;

  width: 28px;
  height: 28px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background:
    color-mix(
      in srgb,
      var(--green) 15%,
      transparent
    );

  color: var(--green);

  font-size: 15px;
  font-weight: 900;
}

.create-pool-result-content {
  min-width: 0;

  display: flex;
  flex-direction: column;

  gap: 4px;
}

.create-pool-result-content strong {
  color: var(--green);
}

.create-pool-result-content span {
  color: var(--text-secondary);
}

.create-pool-result-content code {
  color: var(--text);
}

.create-pool-tx {
  margin-top: 2px;

  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;

  font-size: 11px;
}

.create-pool-submit {
  width: 100%;
  min-height: 52px;

  margin-top: 18px;

  border: 0;
  border-radius: 14px;

  background: var(--accent);
  color: #ffffff;

  font-size: 15px;
  font-weight: 800;

  cursor: pointer;

  box-shadow: var(--shadow);

  transition:
    background 0.2s ease,
    transform 0.15s ease,
    opacity 0.15s ease;
}

.create-pool-submit:hover:not(:disabled) {
  transform: translateY(-1px);

  background: var(--accent-hover);
}

.create-pool-submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;

  transform: none;
}

.create-pool-secondary {
  width: 100%;
  min-height: 46px;

  margin-top: 9px;

  border: 1px solid var(--border);
  border-radius: 13px;

  background: var(--surface-soft);
  color: var(--text-secondary);

  font-size: 14px;
  font-weight: 700;

  cursor: pointer;

  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.create-pool-secondary:hover {
  border-color: var(--border-strong);

  background: var(--surface-hover);
  color: var(--text);
}

@media (max-width: 700px) {
  .create-pool-page {
    padding:
      26px
      14px
      60px;
  }

  .create-pool-heading {
    flex-direction: column;

    gap: 14px;
  }

  .create-pool-version {
    align-self: flex-start;
  }

  .create-pool-card {
    padding: 14px;

    border-radius: 20px;
  }

  .create-pool-token-section {
    padding: 14px;
  }

  .create-pool-info {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .create-pool-section-header {
    align-items: flex-start;
    flex-direction: column;

    gap: 7px;
  }

  .create-pool-token-list {
    display: grid;
    grid-template-columns:
      repeat(3, 1fr);
  }

  .create-pool-token-chip {
    justify-content: center;

    padding-left: 6px;
    padding-right: 6px;
  }
}