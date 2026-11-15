import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

const APP_URL = process.env.APP_URL || "https://equations-liz-field-reveal.trycloudflare.com";

describe("VibeStore E-Commerce", () => {
  it("browses products, adds an item to cart, and updates quantity", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: APP_URL });

    await testdriver.find("Shop Collection button in hero section").click();

    let assertResult = await testdriver.assert(
      "Featured products catalog is displayed with Wireless Headphones, Smartwatch, and Earbuds"
    );
    expect(assertResult).toBeTruthy();

    await testdriver.find("Add to Cart button for Wireless Headphones").click();

    await testdriver.pressKeys(["Home"]);

    await testdriver.find("Shopping bag button with badge 1 in the website header").click();

    assertResult = await testdriver.assert(
      "The shopping bag modal is open with Wireless Headphones and a subtotal of $149.00"
    );
    expect(assertResult).toBeTruthy();

    await testdriver.find("Increase quantity button in the shopping bag").click();

    assertResult = await testdriver.assert(
      "The shopping bag shows quantity 2 and a subtotal of $298.00"
    );
    expect(assertResult).toBeTruthy();

    await testdriver.find("Continue shopping button at the bottom of the shopping bag").click();
  });

  it("navigates to product details and returns to storefront", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: APP_URL });

    await testdriver.find("Shop Collection button in hero section").click();

    await testdriver.find("Wireless Headphones title link").click();

    let assertResult = await testdriver.assert(
      "Product details page displays Wireless Headphones with price $149.00 and Back to shop link"
    );
    expect(assertResult).toBeTruthy();

    await testdriver.find("Back to shop link").click();

    assertResult = await testdriver.assert(
      "Storefront is displayed with the hero banner and Vibestore logo"
    );
    expect(assertResult).toBeTruthy();
  });
});
