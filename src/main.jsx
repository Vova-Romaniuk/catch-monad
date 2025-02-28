import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { PrivyProvider } from "@privy-io/react-auth";
import { monadTestnet } from "viem/chains";

// import playerImgSrc from "./img/monad.svg";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PrivyProvider
      appId='cm7njc66a00kx7ouiihd3mfsf'
      config={{
        loginMethods: ["wallet"],
        appearance: {
          theme: "light",
          walletList: [
            "metamask",
            "rainbow",
            "wallet_connect",
            "rabby_wallet",
            "detected_wallets",
          ],
          accentColor: "#676FFF",
          logo: "monad.svg",
        },

        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
      }}>
      <App />
    </PrivyProvider>
  </StrictMode>
);
