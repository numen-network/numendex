const PROPERTY_TYPES = [
  {
    value: 0,
    label: "Text",
  },
  {
    value: 1,
    label: "Integer",
  },
  {
    value: 2,
    label: "Decimal",
  },
  {
    value: 3,
    label: "Boolean",
  },
  {
    value: 4,
    label: "Date",
  },
  {
    value: 5,
    label: "URI",
  },
  {
    value: 6,
    label: "Hash",
  },
  {
    value: 7,
    label: "Address",
  },
  {
    value: 8,
    label: "Bytes",
  },
];

const createEmptyProperty = () => ({
  key: "",
  label: "",
  valueType: 0,
  value: "",
  unit: "",
});

function AssetPropertiesStep({
  properties = [],
  onChange,
}) {
  const safeProperties =
    Array.isArray(properties)
      ? properties
      : [];

  const addProperty = () => {
    onChange([
      ...safeProperties,
      createEmptyProperty(),
    ]);
  };

  const removeProperty = (
    index
  ) => {
    onChange(
      safeProperties.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  const updateProperty = (
    index,
    field,
    value
  ) => {
    onChange(
      safeProperties.map(
        (
          property,
          itemIndex
        ) => {
          if (
            itemIndex !== index
          ) {
            return property;
          }

          return {
            ...property,
            [field]: value,
          };
        }
      )
    );
  };

  const renderValueInput = (
    property,
    index
  ) => {
    const type =
      Number(
        property.valueType
      );

    if (type === 3) {
      return (
        <select
          value={
            property.value
          }
          onChange={(
            event
          ) =>
            updateProperty(
              index,
              "value",
              event.target.value
            )
          }
        >
          <option value="">
            Select value
          </option>

          <option value="true">
            True
          </option>

          <option value="false">
            False
          </option>
        </select>
      );
    }

    if (type === 4) {
      return (
        <input
          type="date"
          value={
            property.value
          }
          onChange={(
            event
          ) =>
            updateProperty(
              index,
              "value",
              event.target.value
            )
          }
        />
      );
    }

    if (
      type === 1 ||
      type === 2
    ) {
      return (
        <input
          type="text"
          inputMode={
            type === 1
              ? "numeric"
              : "decimal"
          }
          value={
            property.value
          }
          onChange={(
            event
          ) =>
            updateProperty(
              index,
              "value",
              event.target.value
            )
          }
          placeholder={
            type === 1
              ? "Example: 100"
              : "Example: 99.95"
          }
        />
      );
    }

    if (type === 5) {
      return (
        <input
          type="text"
          value={
            property.value
          }
          onChange={(
            event
          ) =>
            updateProperty(
              index,
              "value",
              event.target.value
            )
          }
          placeholder="ipfs://... or https://..."
        />
      );
    }

    if (type === 6) {
      return (
        <input
          type="text"
          value={
            property.value
          }
          onChange={(
            event
          ) =>
            updateProperty(
              index,
              "value",
              event.target.value
            )
          }
          placeholder="0x..."
        />
      );
    }

    if (type === 7) {
      return (
        <input
          type="text"
          value={
            property.value
          }
          onChange={(
            event
          ) =>
            updateProperty(
              index,
              "value",
              event.target.value
            )
          }
          placeholder="0x..."
        />
      );
    }

    if (type === 8) {
      return (
        <textarea
          rows={3}
          value={
            property.value
          }
          onChange={(
            event
          ) =>
            updateProperty(
              index,
              "value",
              event.target.value
            )
          }
          placeholder="Encoded bytes value"
        />
      );
    }

    return (
      <input
        type="text"
        value={
          property.value
        }
        onChange={(
          event
        ) =>
          updateProperty(
            index,
            "value",
            event.target.value
          )
        }
        placeholder="Property value"
      />
    );
  };

  return (
    <>
      <div className="asset-studio-form-section">
        <div className="asset-studio-section-heading asset-studio-section-heading-row">
          <div>
            <h3>
              Custom properties
            </h3>

            <p>
              Add structured information that describes
              this asset.
            </p>
          </div>

          <button
            type="button"
            className="asset-studio-add-property-button"
            onClick={
              addProperty
            }
          >
            + Add property
          </button>
        </div>

        {safeProperties.length ===
        0 ? (
          <div className="asset-studio-empty-properties">
            <div className="asset-studio-empty-properties-icon">
              +
            </div>

            <h4>
              No custom properties
            </h4>

            <p>
              Properties are optional. You can add
              structured attributes such as weight,
              material, serial number, production date,
              location or external references.
            </p>

            <button
              type="button"
              onClick={
                addProperty
              }
            >
              Add first property
            </button>
          </div>
        ) : (
          <div className="asset-studio-properties-list">
            {safeProperties.map(
              (
                property,
                index
              ) => (
                <div
                  className="asset-studio-property-card"
                  key={
                    index
                  }
                >
                  <div className="asset-studio-property-card-header">
                    <div>
                      <span>
                        Property{" "}
                        {index + 1}
                      </span>

                      <strong>
                        {property.label ||
                          property.key ||
                          "New property"}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="asset-studio-remove-property-button"
                      onClick={() =>
                        removeProperty(
                          index
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>

                  <div className="asset-studio-form-grid">
                    <label className="asset-studio-field">
                      <span>
                        Key
                      </span>

                      <input
                        type="text"
                        value={
                          property.key
                        }
                        onChange={(
                          event
                        ) =>
                          updateProperty(
                            index,
                            "key",
                            event.target
                              .value
                          )
                        }
                        placeholder="Example: weight"
                        maxLength={80}
                      />

                      <small>
                        Stable machine-readable
                        identifier.
                      </small>
                    </label>

                    <label className="asset-studio-field">
                      <span>
                        Label
                      </span>

                      <input
                        type="text"
                        value={
                          property.label
                        }
                        onChange={(
                          event
                        ) =>
                          updateProperty(
                            index,
                            "label",
                            event.target
                              .value
                          )
                        }
                        placeholder="Example: Weight"
                        maxLength={80}
                      />

                      <small>
                        Human-readable property name.
                      </small>
                    </label>

                    <label className="asset-studio-field">
                      <span>
                        Value type
                      </span>

                      <select
                        value={
                          property.valueType
                        }
                        onChange={(
                          event
                        ) =>
                          updateProperty(
                            index,
                            "valueType",
                            Number(
                              event.target
                                .value
                            )
                          )
                        }
                      >
                        {PROPERTY_TYPES.map(
                          (type) => (
                            <option
                              key={
                                type.value
                              }
                              value={
                                type.value
                              }
                            >
                              {
                                type.label
                              }
                            </option>
                          )
                        )}
                      </select>

                      <small>
                        Protocol value:{" "}
                        {
                          property.valueType
                        }
                      </small>
                    </label>

                    <label className="asset-studio-field">
                      <span>
                        Unit
                        <small>
                          Optional
                        </small>
                      </span>

                      <input
                        type="text"
                        value={
                          property.unit
                        }
                        onChange={(
                          event
                        ) =>
                          updateProperty(
                            index,
                            "unit",
                            event.target
                              .value
                          )
                        }
                        placeholder="kg, mm, USD..."
                        maxLength={32}
                      />
                    </label>

                    <label className="asset-studio-field asset-studio-field-full">
                      <span>
                        Value
                      </span>

                      {renderValueInput(
                        property,
                        index
                      )}
                    </label>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="asset-studio-info-banner">
        <div className="asset-studio-info-icon">
          i
        </div>

        <div>
          <strong>
            Structured metadata
          </strong>

          <p>
            Use properties for descriptive asset data.
            Physical-object verification, 3D models,
            attestations and documents are handled
            separately by their dedicated Numen protocol
            components.
          </p>
        </div>
      </div>
    </>
  );
}

export default AssetPropertiesStep;