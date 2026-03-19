import { decryptSecret, encryptSecret } from "~/server/utils/crypto";

describe("crypto utilities", () => {
  it("encrypts and decrypts secrets symmetrically", () => {
    const secret = "super-secret-key";
    const plainText = "novita-api-key";

    const encrypted = encryptSecret(plainText, secret);
    const decrypted = decryptSecret(encrypted, secret);

    expect(encrypted).not.toBe(plainText);
    expect(decrypted).toBe(plainText);
  });

  it("produces different ciphertext for the same plaintext", () => {
    const secret = "super-secret-key";
    const plainText = "novita-api-key";

    const firstEncrypted = encryptSecret(plainText, secret);
    const secondEncrypted = encryptSecret(plainText, secret);

    expect(firstEncrypted).not.toBe(secondEncrypted);
    expect(decryptSecret(firstEncrypted, secret)).toBe(plainText);
    expect(decryptSecret(secondEncrypted, secret)).toBe(plainText);
  });

  it("throws a typed application error when the key is missing", () => {
    try {
      encryptSecret("value", "");
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 500,
        statusMessage: "Encryption key is missing.",
      });
      return;
    }

    throw new Error("Expected encryptSecret to throw when the key is missing.");
  });
});
