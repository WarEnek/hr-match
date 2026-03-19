import { safeExternalHref } from "~/utils/external-url";

describe("safeExternalHref", () => {
  it("returns http(s) URLs", () => {
    expect(safeExternalHref("https://example.com/path")).toBe("https://example.com/path");
    expect(safeExternalHref(" http://localhost:3000 ")).toBe("http://localhost:3000/");
  });

  it("returns undefined for dangerous or invalid URLs", () => {
    expect(safeExternalHref("javascript:alert(1)")).toBeUndefined();
    expect(safeExternalHref("data:text/html,hi")).toBeUndefined();
    expect(safeExternalHref("")).toBeUndefined();
    expect(safeExternalHref(null)).toBeUndefined();
  });
});
