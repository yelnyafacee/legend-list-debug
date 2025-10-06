import React from "react";

import { peek$, type StateContext } from "@/state/state";
import type { InternalState } from "@/types";
import { isFunction } from "@/utils/helpers";

export function getRenderedItem(ctx: StateContext, state: InternalState, key: string) {
    if (!state) {
        return null;
    }

    const {
        indexByKey,
        props: { data, getItemType, renderItem },
    } = state;

    const index = indexByKey.get(key);

    if (index === undefined) {
        return null;
    }

    let renderedItem: React.ReactNode = null;

    if (renderItem && data[index]) {
        const itemProps = {
            data,
            extraData: peek$(ctx, "extraData"),
            index,
            item: data[index],
            type: getItemType ? (getItemType(data[index], index) ?? "") : "",
        };

        renderedItem = isFunction(renderItem) ? renderItem(itemProps) : React.createElement(renderItem, itemProps);
    }

    return { index, item: data[index], renderedItem };
}
