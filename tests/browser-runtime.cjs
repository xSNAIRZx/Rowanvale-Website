/* Existing regression fixtures isolate the new automatic-cover network path.
   Its service, DOM behavior and actual live images have separate dedicated tests. */
const pw = require(process.env.ROWANVALE_PLAYWRIGHT || "playwright");
const chromium = {
  launch: async (options) => {
    const browser = await pw.chromium.launch(options),
      make = browser.newContext.bind(browser);
    browser.newContext = async (options) => {
      const c = await make(options);
      await c.route("**/api/artwork/resolve", (route) => {
        const items = route.request().postDataJSON()?.items || [];
        return route.fulfill({
          json: {
            results: items.map(() => ({
              state: "unavailable",
              reason: "Isolated legacy regression fixture.",
            })),
          },
        });
      });
      return c;
    };
    browser.newPage = async (options) =>
      (await browser.newContext(options)).newPage();
    return browser;
  },
};
module.exports = { ...pw, chromium };
