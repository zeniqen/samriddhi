import { afterEach, expect, test, vi } from "vitest";
import { speechToEnglish } from "@/lib/sarvam";

afterEach(() => vi.unstubAllGlobals());

// Browsers record as "audio/webm;codecs=opus"; Sarvam rejects any type with parameters (HTTP 400).
test("sends the bare MIME type Sarvam accepts, dropping codec parameters", async () => {
  const sent: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const file = (init.body as FormData).get("file") as File;
      sent.push(file.type);
      return Response.json({ transcript: "100 kg of tomatoes" });
    }),
  );
  const audio = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm;codecs=opus" });
  const r = await speechToEnglish(audio, "hi");
  expect(r.english).toBe("100 kg of tomatoes");
  expect(sent).toEqual(["audio/webm", "audio/webm"]); // translate + transcribe calls
});
