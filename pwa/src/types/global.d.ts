import { fromBase64 } from "@/cryptography/sodium.worker";

export {}

declare global {

  interface Uint8ArrayConstructor {
    fromBase64(base64: string, options?: { alphabet?: "base64" | "base64url" }): Uint8Array;
  }

  interface Uint8Array {
    toBase64(options?: { alphabet?: "base64" | "base64url"; omitPadding?: boolean }): string;
  }

  interface AuthenticationExtensionsPRFValues {
    first: BufferSource;
    second?: BufferSource;
  }

  interface AuthenticationExtensionsPRFInputs {
    eval?: AuthenticationExtensionsPRFValues;
  }

  interface AuthenticationExtensionsClientInputs {
    prf?: AuthenticationExtensionsPRFInputs;
  }

  interface AuthenticationExtensionsPRFOutputs {
    enabled?: boolean;
    results?: AuthenticationExtensionsPRFValues;
  }

  interface AuthenticationExtensionsClientOutputs {
    prf?: AuthenticationExtensionsPRFOutputs
  }

  interface Window {
    PublicKeyCredential: typeof PublicKeyCredential & {
      signalUnknownCredential(options: { credentialId: string; rpId: string }): Promise<void>;
    };
  }
}
