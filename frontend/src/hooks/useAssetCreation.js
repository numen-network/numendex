import { useState } from "react";
import { ethers } from "ethers";
import { createAssetContract } from "../services/assetFactory";
import { bindAssetObject, createAssetProperties, getAssetRecord, registerAssetObject } from "../services/assetProtocol";

export default function useAssetCreation() {
  const [creating, setCreating] = useState(false);
  const [creationStage, setCreationStage] = useState("");
  const [creationError, setCreationError] = useState("");
  const [creationResult, setCreationResult] = useState(null);

  const resetCreation = () => { setCreating(false); setCreationStage(""); setCreationError(""); setCreationResult(null); };

  const create = async ({ form, account }) => {
    if (creating) return null;
    setCreating(true); setCreationError(""); setCreationResult(null);
    const warnings = [];
    try {
      setCreationStage("Creating asset contract and Registry record...");
      const base = await createAssetContract({ form, account });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = ethers.getAddress(await signer.getAddress());
      const admin = ethers.getAddress(base.admin);
      let properties = [];
      let object = null;
      let binding = null;

      if ((form.properties || []).length) {
        if (signerAddress.toLowerCase() === admin.toLowerCase()) {
          properties = await createAssetProperties({ signer, assetId: base.assetId, properties: form.properties, onProgress: setCreationStage });
        } else warnings.push("Custom properties were not written because the connected creator is not the selected asset controller/admin.");
      }

      if (form.physicalEnabled && form.modelEnabled) {
        setCreationStage("Registering Numen Object record...");
        object = await registerAssetObject({ signer, account: signerAddress, admin, form });
        if (object && form.objectBindingEnabled) {
          if (signerAddress.toLowerCase() === admin.toLowerCase()) {
            setCreationStage("Binding Asset ID to Object ID...");
            binding = await bindAssetObject({ signer, assetId: base.assetId, objectId: object.objectId, linkType: 1 });
          } else warnings.push("The Object record was created with the selected admin as controller, but direct binding requires that controller to sign. Binding was not submitted.");
        }
      }

      setCreationStage("Reading Registry record...");
      const registryRecord = await getAssetRecord({ provider, assetId: base.assetId });
      const result = { ...base, properties, object, binding, registryRecord, warnings };
      setCreationResult(result); setCreationStage("Asset created successfully.");
      return result;
    } catch (error) {
      const message = error?.shortMessage || error?.reason || error?.message || "Asset creation failed.";
      setCreationError(message); setCreationStage(""); throw error;
    } finally { setCreating(false); }
  };

  return { creating, creationStage, creationError, creationResult, create, resetCreation };
}
