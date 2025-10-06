import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import "../setup"; // Import global test setup

import { prepareMVCP } from "../../src/core/mvcp";
import type { StateContext } from "../../src/state/state";
import type { InternalState } from "../../src/types";
import * as requestAdjustModule from "../../src/utils/requestAdjust";
import { createMockContext } from "../__mocks__/createMockContext";
import { createMockState } from "../__mocks__/createMockState";

describe("prepareMVCP", () => {
    let mockCtx: StateContext;
    let mockState: InternalState;
    let requestAdjustSpy: any;

    beforeEach(() => {
        mockCtx = createMockContext({
            containersDidLayout: true,
        });

        const positions = new Map([
            ["item-0", 0],
            ["item-1", 100],
            ["item-2", 250],
            ["item-3", 450],
            ["item-4", 550],
        ]);

        const indexByKey = new Map([
            ["item-0", 0],
            ["item-1", 1],
            ["item-2", 2],
            ["item-3", 3],
            ["item-4", 4],
        ]);

        mockState = createMockState({
            hasScrolled: false,
            idCache: ["item-0", "item-1", "item-2", "item-3", "item-4"],
            idsInView: ["item-1", "item-2"], // Default items in view
            ignoreScrollFromMVCP: undefined,
            ignoreScrollFromMVCPTimeout: undefined,
            indexByKey,
            lastBatchingAction: 0,
            positions,
            props: {
                data: [
                    { id: 0, text: "Item 0" },
                    { id: 1, text: "Item 1" },
                    { id: 2, text: "Item 2" },
                    { id: 3, text: "Item 3" },
                    { id: 4, text: "Item 4" },
                ],
                keyExtractor: (item: any) => `item-${item.id}`,
                maintainVisibleContentPosition: true,
            },
            scroll: 0,
            scrollForNextCalculateItemsInView: undefined,
            scrollHistory: [],
            scrollingTo: undefined,
            scrollLength: 500,
            scrollPending: 0,
            scrollPrev: 0,
            scrollPrevTime: 0,
            scrollTime: 0,
            sizes: new Map([
                ["item-0", 100],
                ["item-1", 150],
                ["item-2", 200],
                ["item-3", 100],
                ["item-4", 180],
            ]),
            timeouts: new Set(),
        });

        // Spy on requestAdjust function and reset it
        if (requestAdjustSpy) {
            requestAdjustSpy.mockRestore();
        }
        requestAdjustSpy = spyOn(requestAdjustModule, "requestAdjust");
    });

    describe("basic functionality", () => {
        it("should return a function when called", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);
            expect(typeof adjustFunction).toBe("function");
        });

        it("should return no-op function when maintainVisibleContentPosition is disabled", () => {
            mockState.props.maintainVisibleContentPosition = false;

            const adjustFunction = prepareMVCP(mockCtx, mockState);

            // Change positions
            mockState.positions.set("item-1", 200);

            // Execute the returned function
            adjustFunction();

            // Should not call requestAdjust
            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });

        it("should capture initial position of first visible item", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            // Change the position of the first visible item
            mockState.positions.set("item-1", 150); // Changed from 100 to 150

            adjustFunction();

            expect(requestAdjustSpy).toHaveBeenCalledWith(mockCtx, mockState, 50, undefined);
        });

        it("should handle scrollingTo target prioritization", () => {
            mockState.scrollingTo = { animated: true, index: 3, offset: 0 };

            const adjustFunction = prepareMVCP(mockCtx, mockState);

            // Change the position of the scroll target
            mockState.positions.set("item-3", 500); // Changed from 450 to 500

            adjustFunction();

            expect(requestAdjustSpy).toHaveBeenCalledWith(mockCtx, mockState, 50, undefined);
        });
    });

    describe("anchor selection logic", () => {
        it("should prefer scrollingTo target over visible items", () => {
            mockState.scrollingTo = { animated: true, index: 2, offset: 0 };
            mockState.idsInView = ["item-0", "item-1"]; // Different visible items

            const adjustFunction = prepareMVCP(mockCtx, mockState);

            // Change positions of both potential anchors
            mockState.positions.set("item-0", 50); // First visible item
            mockState.positions.set("item-2", 300); // Scroll target (should win)

            adjustFunction();

            // Should track the scroll target (item-2), not the first visible item
            expect(requestAdjustSpy).toHaveBeenCalledWith(mockCtx, mockState, 50, undefined); // 300 - 250 = 50
        });

        it("should fallback to first visible item when no scrollingTo", () => {
            mockState.scrollingTo = undefined;
            mockState.idsInView = ["item-2", "item-3"];

            const adjustFunction = prepareMVCP(mockCtx, mockState);

            // Change position of first visible item
            mockState.positions.set("item-2", 300); // Changed from 250 to 300

            adjustFunction();

            expect(requestAdjustSpy).toHaveBeenCalledWith(mockCtx, mockState, 50, undefined);
        });

        it("should handle visible items not in indexByKey", () => {
            mockState.idsInView = ["non-existent-item", "item-1"];

            const adjustFunction = prepareMVCP(mockCtx, mockState);

            // Change position of the valid visible item
            mockState.positions.set("item-1", 150);

            adjustFunction();

            expect(requestAdjustSpy).toHaveBeenCalledWith(mockCtx, mockState, 50, undefined);
        });

        it("should handle no valid anchor items", () => {
            mockState.idsInView = [];
            mockState.scrollingTo = undefined;

            const adjustFunction = prepareMVCP(mockCtx, mockState);

            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });
    });

    describe("position change detection", () => {
        it("should ignore small position changes (<=0.1)", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            // Make a tiny change
            mockState.positions.set("item-1", 100.05); // Change of 0.05

            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });

        it("should handle exactly 0.1 position change", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            mockState.positions.set("item-1", 100.1); // Change of exactly 0.1

            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });

        it("should trigger on position change just above threshold", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            mockState.positions.set("item-1", 100.11); // Change of 0.11

            adjustFunction();

            expect(requestAdjustSpy).toHaveBeenCalledTimes(1);

            // Get the actual call parameters to see what was passed
            const calls = requestAdjustSpy.mock.calls;
            expect(calls[0][0]).toBe(mockCtx);
            expect(calls[0][1]).toBe(mockState);
            expect(Math.abs(calls[0][2] - 0.11)).toBeLessThan(0.00001); // Use floating point comparison
        });

        it("should handle negative position changes", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            mockState.positions.set("item-1", 50); // Change from 100 to 50 = -50

            adjustFunction();

            expect(requestAdjustSpy).toHaveBeenCalledWith(mockCtx, mockState, -50, undefined);
        });

        it("should handle zero position change", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            // No position change
            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });

        it("should handle large position changes", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            mockState.positions.set("item-1", 1000); // Large change

            adjustFunction();

            expect(requestAdjustSpy).toHaveBeenCalledWith(mockCtx, mockState, 900, undefined);
        });
    });

    describe("edge cases and error handling", () => {
        it("should handle missing position data after preparation", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            // Remove the position after preparation
            mockState.positions.delete("item-1");

            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });

        it("should handle containers not yet laid out", () => {
            mockCtx.values.set("containersDidLayout", false);

            const adjustFunction = prepareMVCP(mockCtx, mockState);

            mockState.positions.set("item-1", 150);

            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });

        it("should handle empty idsInView array", () => {
            mockState.idsInView = [];
            mockState.scrollingTo = undefined;

            const adjustFunction = prepareMVCP(mockCtx, mockState);

            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });

        it("should handle corrupted indexByKey", () => {
            mockState.indexByKey = new Map(); // Empty map
            mockState.scrollingTo = undefined;

            const adjustFunction = prepareMVCP(mockCtx, mockState);

            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });

        it("should handle corrupted positions map", () => {
            mockState.positions = new Map(); // Empty map

            const adjustFunction = prepareMVCP(mockCtx, mockState);

            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });

        it("should handle invalid scrollingTo index", () => {
            mockState.scrollingTo = { animated: true, index: 999, offset: 0 }; // Out of bounds

            const adjustFunction = prepareMVCP(mockCtx, mockState);

            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });

        it("should handle NaN position values", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            mockState.positions.set("item-1", NaN);

            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });

        it("should handle Infinity position values", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            mockState.positions.set("item-1", Infinity);

            adjustFunction();

            expect(requestAdjustSpy).toHaveBeenCalledWith(mockCtx, mockState, Infinity, undefined);
        });
    });

    describe("integration scenarios", () => {
        it("should handle rapid successive MVCP preparations", () => {
            // Prepare multiple MVCP functions
            const adjust1 = prepareMVCP(mockCtx, mockState);
            const adjust2 = prepareMVCP(mockCtx, mockState);
            const adjust3 = prepareMVCP(mockCtx, mockState);

            // Change position
            mockState.positions.set("item-1", 150);

            // Execute all adjustment functions
            adjust1();
            adjust2();
            adjust3();

            // All should detect the same change
            expect(requestAdjustSpy).toHaveBeenCalledTimes(3);
            expect(requestAdjustSpy).toHaveBeenCalledWith(mockCtx, mockState, 50, undefined);
        });

        it("should handle switching between scroll targets", () => {
            // First preparation with scroll target
            mockState.scrollingTo = { animated: true, index: 2, offset: 0 };
            const adjust1 = prepareMVCP(mockCtx, mockState);

            // Change scroll target and prepare again
            mockState.scrollingTo = { animated: true, index: 3, offset: 0 };
            const adjust2 = prepareMVCP(mockCtx, mockState);

            // Change positions
            mockState.positions.set("item-2", 300); // Original target
            mockState.positions.set("item-3", 500); // New target

            adjust1(); // Should track item-2
            adjust2(); // Should track item-3

            expect(requestAdjustSpy).toHaveBeenCalledTimes(2);
            expect(requestAdjustSpy).toHaveBeenNthCalledWith(1, mockCtx, mockState, 50, undefined); // item-2: 300-250
            expect(requestAdjustSpy).toHaveBeenNthCalledWith(2, mockCtx, mockState, 50, undefined); // item-3: 500-450
        });

        it("should handle changing from scrollingTo to visible items", () => {
            // First with scrollingTo
            mockState.scrollingTo = { animated: true, index: 2, offset: 0 };
            const adjust1 = prepareMVCP(mockCtx, mockState);

            // Then without scrollingTo (falls back to visible items)
            mockState.scrollingTo = undefined;
            const adjust2 = prepareMVCP(mockCtx, mockState);

            // Change positions
            mockState.positions.set("item-2", 300); // scroll target
            mockState.positions.set("item-1", 150); // first visible item

            adjust1(); // Should track item-2
            adjust2(); // Should track item-1

            expect(requestAdjustSpy).toHaveBeenCalledTimes(2);
            expect(requestAdjustSpy).toHaveBeenNthCalledWith(1, mockCtx, mockState, 50, undefined); // item-2
            expect(requestAdjustSpy).toHaveBeenNthCalledWith(2, mockCtx, mockState, 50, undefined); // item-1
        });
    });

    describe("performance considerations", () => {
        it("should handle large datasets efficiently", () => {
            // Create large dataset
            const largeIndexByKey = new Map();
            const largePositions = new Map();
            const largeIdsInView = [];

            for (let i = 0; i < 1000; i++) {
                const id = `item-${i}`;
                largeIndexByKey.set(id, i);
                largePositions.set(id, i * 100);
                if (i < 10) largeIdsInView.push(id);
            }

            mockState.indexByKey = largeIndexByKey;
            mockState.positions = largePositions;
            mockState.idsInView = largeIdsInView;

            const start = performance.now();
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            // Change first visible item position
            mockState.positions.set("item-0", 50);
            adjustFunction();

            const duration = performance.now() - start;

            expect(duration).toBeLessThan(5); // Should be very fast
            expect(requestAdjustSpy).toHaveBeenCalledWith(mockCtx, mockState, 50, undefined);
        });

        it("should handle rapid MVCP execution", () => {
            // NOTE: Each call to prepareMVCP captures the current position, so we need
            // to prepare it fresh each time to test rapid execution properly
            const start = performance.now();

            // Execute many MVCP preparations and adjustments
            for (let i = 1; i <= 100; i++) {
                // Start from 1 to ensure meaningful position changes
                const adjustFunction = prepareMVCP(mockCtx, mockState);
                mockState.positions.set("item-1", 100 + i * 0.2); // Use 0.2 increments to ensure > 0.1 threshold
                adjustFunction();
            }

            const duration = performance.now() - start;

            expect(duration).toBeLessThan(50); // Should handle rapid execution
            expect(requestAdjustSpy).toHaveBeenCalledTimes(100);
        });
    });

    describe("floating point precision", () => {
        it("should handle floating point precision correctly", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            // Test borderline floating point case
            mockState.positions.set("item-1", 100.10000000001); // Just above 0.1 threshold

            adjustFunction();

            expect(requestAdjustSpy).toHaveBeenCalledTimes(1);
            const calls = requestAdjustSpy.mock.calls;
            expect(calls[0][0]).toBe(mockCtx);
            expect(calls[0][1]).toBe(mockState);
            expect(Math.abs(calls[0][2] - 0.10000000001)).toBeLessThan(1e-10); // Very precise floating point comparison
        });

        it("should handle very small floating point differences", () => {
            const adjustFunction = prepareMVCP(mockCtx, mockState);

            mockState.positions.set("item-1", 100.0000001); // Very small change

            adjustFunction();

            expect(requestAdjustSpy).not.toHaveBeenCalled();
        });
    });
});
