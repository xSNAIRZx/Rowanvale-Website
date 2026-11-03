/* Queue priorities are independent from provider rate limits. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RVArtworkQueue = factory();
})(globalThis, () => {
  "use strict";
  function rank(id, priority = {}) {
    return priority.visible?.includes(id)
      ? 0
      : priority.featured?.includes(id)
        ? 1
        : priority.nearby?.includes(id)
          ? 2
          : 3;
  }
  function select(queue, priority, at, budget) {
    return (
      queue
        .filter(
          (j) =>
            ["queued", "retry"].includes(j.state) &&
            ((j.nextAt || 0) <= at ||
              (j.state === "queued" &&
                rank(j.itemId, priority) < 3 &&
                (j.budgetDeferred ||
                  Math.abs((j.nextAt || 0) - (budget.start + 3600000)) <
                    1000))),
        )
        .sort(
          (a, b) =>
            rank(a.itemId, priority) - rank(b.itemId, priority) ||
            (rank(a.itemId, priority) < 3
              ? (
                  [priority.visible, priority.featured, priority.nearby][
                    rank(a.itemId, priority)
                  ] || []
                ).indexOf(a.itemId)
              : a.createdAt || 0) -
              (rank(b.itemId, priority) < 3
                ? (
                    [priority.visible, priority.featured, priority.nearby][
                      rank(b.itemId, priority)
                    ] || []
                  ).indexOf(b.itemId)
                : b.createdAt || 0),
        )[0] || null
    );
  }
  function permitted(job, priority, budget) {
    return rank(job.itemId, priority) < 3 || budget.used < 12;
  }
  return { rank, select, permitted };
});
