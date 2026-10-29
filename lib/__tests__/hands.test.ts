import { describe, expect, it } from "vitest";
import { evaluateHand } from "../hands";
import { cards } from "./helpers";

describe("evaluateHand", () => {
  it.each([
    ["AS", "high_card"],
    ["2S 9H KD", "high_card"],
    ["7S 7H", "pair"],
    ["7S 7H 2D 9C KS", "pair"],
    ["7S 7H 9D 9C", "two_pair"],
    ["QS QH QD", "three_kind"],
    ["QS QH QD 2C 5H", "three_kind"],
    ["5S 6H 7D 8C 9S", "straight"],
    ["10S JH QD KC AS", "straight"],
    ["AS 2H 3D 4C 5S", "straight"],
    ["2S 5S 9S JS KS", "flush"],
    ["3S 3H 3D 8C 8S", "full_house"],
    ["9S 9H 9D 9C", "four_kind"],
    ["9S 9H 9D 9C 2S", "four_kind"],
    ["5H 6H 7H 8H 9H", "straight_flush"],
    ["AD 2D 3D 4D 5D", "straight_flush"],
  ])("%s -> %s", (spec, expected) => {
    expect(evaluateHand(cards(spec))?.type).toBe(expected);
  });

  it("needs 5 cards for straight and flush", () => {
    expect(evaluateHand(cards("5S 6S 7S 8S"))?.type).toBe("high_card");
  });

  it("does not wrap around K-A-2", () => {
    expect(evaluateHand(cards("QS KH AD 2C 3S"))?.type).toBe("high_card");
  });

  it("rejects empty and oversized plays", () => {
    expect(evaluateHand([])).toBeNull();
    expect(evaluateHand(cards("2S 3S 4S 5S 6S 7S"))).toBeNull();
  });
});
