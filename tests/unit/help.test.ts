import { describe, expect, it } from "vitest";
import { answerQuestion, normalizeText } from "@/lib/domain/help";

describe("help assistant", () => {
  it("normalizes accents and punctuation", () => {
    expect(normalizeText("¿Cómo RESURTO una receta?")).toBe("como resurto una receta");
  });

  it("answers common questions in English", () => {
    expect(answerQuestion("How do I refill my prescription?").best?.id).toBe("refill");
    expect(answerQuestion("cancel my order please").best?.id).toBe("cancel");
    expect(answerQuestion("where is my order").best?.id).toBe("track");
    expect(answerQuestion("sign in with touch id").best?.id).toBe("passkey");
    expect(answerQuestion("I forgot my password").best?.id).toBe("recover");
    expect(answerQuestion("make the text bigger").best?.id).toBe("accessibility");
  });

  it("answers in Spanish too", () => {
    expect(answerQuestion("¿Cómo cancelo un pedido?").best?.id).toBe("cancel");
    expect(answerQuestion("Quiero cambiar el idioma a español").best?.id).toBe("spanish");
  });

  it("copes with plural and partial words", () => {
    expect(answerQuestion("refills").best?.id).toBe("refill");
    expect(answerQuestion("allergies blocked").best?.id).toBe("allergy");
  });

  it("admits when it doesn't know instead of guessing", () => {
    expect(answerQuestion("what is the capital of France").best).toBeNull();
    expect(answerQuestion("").best).toBeNull();
  });
});
