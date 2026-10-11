function AssetPhysicalStep({
  form,
  onChange,
}) {
  const update = (field, value) => {
    onChange(field, value);
  };

  const enabled =
    Boolean(form.physicalEnabled);

  const hasModel =
    Boolean(form.modelEnabled);

  return (
    <>
      <div className="asset-studio-form-section">
        <div className="asset-studio-section-heading">
          <h3>
            Physical / 3D connection
          </h3>

          <p>
            Optionally associate this asset with a
            physical object, product or 3D model.
          </p>
        </div>

        <div className="asset-studio-feature-list">
          <button
            type="button"
            className={`asset-studio-feature-toggle ${
              enabled ? "selected" : ""
            }`}
            onClick={() => {
              const next =
                !enabled;

              update(
                "physicalEnabled",
                next
              );

              if (!next) {
                update(
                  "modelEnabled",
                  false
                );
              }
            }}
          >
            <div className="asset-studio-feature-toggle-copy">
              <strong>
                Connect physical / object data
              </strong>

              <p>
                Add descriptive information that can
                later be associated with a Numen Object
                ID.
              </p>
            </div>

            <span
              className={`asset-studio-switch ${
                enabled
                  ? "active"
                  : ""
              }`}
              aria-hidden="true"
            >
              <span />
            </span>
          </button>
        </div>
      </div>

      {enabled && (
        <>
          <div className="asset-studio-form-section">
            <div className="asset-studio-section-heading">
              <h3>
                Object information
              </h3>

              <p>
                Describe the referenced object. These
                fields do not by themselves prove
                authenticity, ownership or physical
                existence.
              </p>
            </div>

            <div className="asset-studio-form-grid">
              <label className="asset-studio-field">
                <span>
                  Object name
                  <small>
                    Optional
                  </small>
                </span>

                <input
                  type="text"
                  value={
                    form.objectName ??
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "objectName",
                      event.target.value
                    )
                  }
                  placeholder="Example: Gold Bar #A102"
                  maxLength={120}
                />
              </label>

              <label className="asset-studio-field">
                <span>
                  External identifier
                  <small>
                    Optional
                  </small>
                </span>

                <input
                  type="text"
                  value={
                    form.externalObjectId ??
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "externalObjectId",
                      event.target.value
                    )
                  }
                  placeholder="Serial number, SKU, VIN..."
                  maxLength={160}
                />
              </label>

              <label className="asset-studio-field asset-studio-field-full">
                <span>
                  Object description
                  <small>
                    Optional
                  </small>
                </span>

                <textarea
                  rows={4}
                  maxLength={1000}
                  value={
                    form.objectDescription ??
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "objectDescription",
                      event.target.value
                    )
                  }
                  placeholder="Describe the physical object or real-world reference."
                />

                <small className="asset-studio-field-counter">
                  {
                    (
                      form.objectDescription ??
                      ""
                    ).length
                  }
                  /1000
                </small>
              </label>
            </div>
          </div>

          <div className="asset-studio-form-section">
            <div className="asset-studio-section-heading">
              <h3>
                3D model
              </h3>

              <p>
                A model can later be stored externally
                and referenced on-chain through its URI,
                content hash and optional shape
                fingerprint.
              </p>
            </div>

            <div className="asset-studio-feature-list">
              <button
                type="button"
                className={`asset-studio-feature-toggle ${
                  hasModel
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  update(
                    "modelEnabled",
                    !hasModel
                  )
                }
              >
                <div className="asset-studio-feature-toggle-copy">
                  <strong>
                    Attach 3D model reference
                  </strong>

                  <p>
                    Prepare this object for an OBJ, GLB
                    or GLTF model reference.
                  </p>
                </div>

                <span
                  className={`asset-studio-switch ${
                    hasModel
                      ? "active"
                      : ""
                  }`}
                  aria-hidden="true"
                >
                  <span />
                </span>
              </button>
            </div>
          </div>

          {hasModel && (
            <div className="asset-studio-form-section">
              <div className="asset-studio-section-heading">
                <h3>
                  Model reference
                </h3>

                <p>
                  Asset Studio currently records model
                  references. File upload and automatic
                  fingerprint generation can be added
                  separately.
                </p>
              </div>

              <div className="asset-studio-form-grid">
                <label className="asset-studio-field">
                  <span>
                    Model format
                  </span>

                  <select
                    value={
                      form.modelFormat ??
                      "OBJ"
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "modelFormat",
                        event.target.value
                      )
                    }
                  >
                    <option value="OBJ">
                      OBJ
                    </option>

                    <option value="GLB">
                      GLB
                    </option>

                    <option value="GLTF">
                      GLTF
                    </option>

                    <option value="OTHER">
                      Other
                    </option>
                  </select>
                </label>

                <label className="asset-studio-field">
                  <span>
                    Model URI
                    <small>
                      Optional
                    </small>
                  </span>

                  <input
                    type="text"
                    value={
                      form.modelURI ??
                      ""
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "modelURI",
                        event.target.value
                      )
                    }
                    placeholder="ipfs://... or https://..."
                  />
                </label>

                <label className="asset-studio-field asset-studio-field-full">
                  <span>
                    Model hash
                    <small>
                      Optional
                    </small>
                  </span>

                  <input
                    type="text"
                    value={
                      form.modelHash ??
                      ""
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "modelHash",
                        event.target.value
                      )
                    }
                    placeholder="0x..."
                  />

                  <small>
                    Cryptographic content commitment for
                    the referenced model.
                  </small>
                </label>

                <label className="asset-studio-field asset-studio-field-full">
                  <span>
                    Shape fingerprint
                    <small>
                      Optional
                    </small>
                  </span>

                  <input
                    type="text"
                    value={
                      form.shapeFingerprint ??
                      ""
                    }
                    onChange={(
                      event
                    ) =>
                      update(
                        "shapeFingerprint",
                        event.target.value
                      )
                    }
                    placeholder="Asset Scan fingerprint"
                  />

                  <small>
                    This is asset/object metadata. It is
                    not a PoScan mining work hash.
                  </small>
                </label>
              </div>
            </div>
          )}

          <div className="asset-studio-form-section">
            <div className="asset-studio-section-heading">
              <h3>
                Object binding
              </h3>

              <p>
                Choose whether this asset should be
                prepared for association with a Numen
                Object Registry record.
              </p>
            </div>

            <div className="asset-studio-feature-list">
              <button
                type="button"
                className={`asset-studio-feature-toggle ${
                  form.objectBindingEnabled
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  update(
                    "objectBindingEnabled",
                    !form.objectBindingEnabled
                  )
                }
              >
                <div className="asset-studio-feature-toggle-copy">
                  <strong>
                    Enable object binding
                  </strong>

                  <p>
                    Associate the asset with a separate
                    Numen Object ID through the Object
                    Binding protocol.
                  </p>
                </div>

                <span
                  className={`asset-studio-switch ${
                    form.objectBindingEnabled
                      ? "active"
                      : ""
                  }`}
                  aria-hidden="true"
                >
                  <span />
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      <div className="asset-studio-info-banner">
        <div className="asset-studio-info-icon">
          i
        </div>

        <div>
          <strong>
            Object data is not an authenticity claim
          </strong>

          <p>
            A model, hash, shape fingerprint or Object
            ID can help identify and reference an
            object. None of these alone means that
            Numen has verified the object's
            authenticity, legal ownership, origin or
            physical existence.
          </p>
        </div>
      </div>
    </>
  );
}

export default AssetPhysicalStep;