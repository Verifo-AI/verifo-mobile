import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const STORAGE_KEY = "verifo_settings";

export interface NodeIdentity {
  walletAddress: string;
  nodeType: string;
  nodeId: string;
}

function deriveNodeId(walletAddress: string): string {
  if (!walletAddress || walletAddress.length < 8) return "vf-node-new";
  const short = walletAddress.slice(0, 6).toLowerCase().replace(/[^a-z0-9]/g, "x");
  return `vf-node-${short}`;
}

export function useNodeIdentity() {
  const [identity, setIdentity] = useState<NodeIdentity>({
    walletAddress: "",
    nodeType: "Standard",
    nodeId: "vf-node-new",
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || !mounted) return;
        const settings = JSON.parse(raw);
        setIdentity({
          walletAddress: settings.walletAddress ?? "",
          nodeType: settings.nodeType ?? "Standard",
          nodeId: deriveNodeId(settings.walletAddress ?? ""),
        });
      } catch {}
    };
    load();
    return () => { mounted = false; };
  }, []);

  return identity;
}
