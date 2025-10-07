import { useRef, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LegendList, type LegendListRef } from "@legendapp/list";
import { type Item, renderItem } from "~/app/cards-renderItem";
import { DRAW_DISTANCE, ESTIMATED_ITEM_LENGTH } from "~/constants/constants";

import authFetch from "./files/auth-fetch";



let last = performance.now();

export default function BidirectionalInfiniteList() {

    // Refs
    const listRef = useRef<LegendListRef>(null);

    // States
    const [data, setData] = useState<Item[]>(
        () =>
            Array.from({ length: 20 }, (_, i) => ({
                id: i.toString(),
            })) as any[],
    );

    const [refreshing, setRefreshing] = useState(false);


    /*
    |--------------------------------------------------------------------------
    | On Refresh
    |--------------------------------------------------------------------------
    */
    const onRefresh = () => {

        console.log("onRefresh");

        setRefreshing(true);

        setTimeout(() => {

            setData((prevData) => {
                const initialIndex = Number.parseInt(prevData[0].id);
                const newData = [
                    ...Array.from({ length: 5 }, (_, i) => ({
                        id: (initialIndex - i - 1).toString(),
                    })).reverse(),
                    ...prevData,
                ];
                return newData;
            });

            setRefreshing(false);

        }, 500);


    };

    // useEffect(() => {
    //     setTimeout(() => {
    //         setData((prevData) => {
    //             const initialIndex = Number.parseInt(prevData[0].id);
    //             const newData = [
    //                 ...Array.from({ length: 1 }, (_, i) => ({
    //                     id: (initialIndex - i - 1).toString(),
    //                 })).reverse(),
    //                 ...prevData,
    //             ];
    //             return newData;
    //         });
    //     }, 2000);
    // }, []);

    const { bottom } = useSafeAreaInsets();





    const firstMessageRef = useRef(null);
    const lastMessageRef = useRef(null);
    const pageRef = useRef(1);
    const getChatMessagesAbortControllerRef = useRef(new AbortController());

    const [loadMoreCompleted, setLoadMoreCompleted] = useState(false)

    // Page Size
    let pageSize = 10;


    /*
    |--------------------------------------------------------------------------
    | Async : Fetch Initial Message(s)
    |--------------------------------------------------------------------------
    */
    const fetchInitialMessages = async () => {

        // Abort > Request [ GetChatMessages ]
        getChatMessagesAbortControllerRef.current.abort();
        getChatMessagesAbortControllerRef.current = new AbortController();

        // Setup > Result Var
        let result = null

        // Load > Chat > Message(s) [ First Load ]
        result = await getInitialChatMessages(1, pageSize)

        // Result > Exist
        if(result && (result.messages.length > 0)) {

            // Set > firstMessageRef
            firstMessageRef.current = result.messages[0]

            // Set > lastMessageRef
            lastMessageRef.current = result.messages[result.messages.length - 1]

            // result.page > EXIST
            if(result?.page) {
                pageRef.current = result.page
            }

            // Set > Initial Messages
            setData(result.messages)

            // Messages > All Loaded
            if ((pageRef.current * pageSize) >= result.total_count) {

                // Loadmore Complete === TRUE
                setLoadMoreCompleted(true)

            } // Messages > NOT All Loaded
            else
            {
                // Loadmore Complete === FALSE
                setLoadMoreCompleted(false)

            }

        }

    }


    /*
    |--------------------------------------------------------------------------
    | Get > Initial > Chat Messages
    |--------------------------------------------------------------------------
    */
    const getInitialChatMessages = async (routerParams, page = 1, pageSize = 40) => {

        // let results = {
        //     total_count: 0,
        //     messages: [],
        //     cancelled: false
        // }

        console.log("2rrrrrrrrrrrrrrrrrrr" + JSON.stringify(routerParams, null, 2))

        // Query Parameters
        const queryParams = new URLSearchParams({
            size: 0, toString(): string {
                return "";
            }, [Symbol.iterator](): any {
            }, append(name: string, value: string): void {
            }, delete(name: string, value?: string): void {
            }, entries(): any {
            }, forEach(callbackfn, thisArg?): void {
            }, get(name: string): string | null {
                return undefined;
            }, getAll(name: string): string[] {
                return [];
            }, has(name: string, value?: string): boolean {
                return false;
            }, keys(): any {
            }, set(name: string, value: string): void {
            }, sort(): void {
            }, values(): any {
            },
            message_id:                 30,
            conversation_id:            3019,
            page:                       page,
            pageSize:                   pageSize
        }).toString();

        // Create AJAX URL
        const ajax_url = "/api/whatsapp/chat/initialchatmessages" + ((queryParams.length > 0)? "?" + queryParams : "")


        /*
        |--------------------------------------------------------------------------
        | AJAX > Request
        |--------------------------------------------------------------------------
        */

        return await authFetch(ajax_url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: getChatMessagesAbortControllerRef.current.signal,
            // body: JSON.stringify({
            //     ...data,
            //     message_id: lastMessage_id,
            // }),
        })
            .then(data => {

                return data

            })
            .catch(async (error) => {

                console.error("fetch failed: " + error)

                // Request > Canceled
                if (error.name === 'AbortError') {

                    return {
                        conversations: []
                    }

                }

            });

    }





    /*
    |--------------------------------------------------------------------------
    | Return
    |--------------------------------------------------------------------------
    */
    return (

        <View
            key="legendlist"
            style={[StyleSheet.absoluteFill, styles.outerContainer]}
        >

            <LegendList
                contentContainerStyle={styles.listContainer}
                data={data}
                drawDistance={DRAW_DISTANCE}
                estimatedItemSize={ESTIMATED_ITEM_LENGTH}
                initialScrollIndex={10}
                keyExtractor={(item) => `id${item.id}`}
                ListFooterComponent={<View style={{ height: bottom }} />}
                maintainVisibleContentPosition
                onEndReached={({ distanceFromEnd }) => {

                    console.log("onEndReached", distanceFromEnd);

                    if (distanceFromEnd > 0) {

                        setTimeout(() => {

                            setData((prevData) => {
                                const newData = [
                                    ...prevData,
                                    ...Array.from({ length: 10 }, (_, i) => ({
                                        id: (Number.parseInt(prevData[prevData.length - 1].id) + i + 1).toString(),
                                    })),
                                ];
                                return newData;
                            });

                        }, 500);

                    }

                }}
                onStartReached={(props) => {
                    const time = performance.now();
                    console.log("onStartReached", props, last - time);
                    last = time;
                    onRefresh();
                }}
                recycleItems={true}
                ref={listRef}
                refreshControl={
                    <RefreshControl
                        progressViewOffset={40}
                        //onRefresh={onRefresh}
                        refreshing={refreshing}
                        tintColor={"#ffffff"}
                    />
                }
                renderItem={renderItem}
                style={[StyleSheet.absoluteFill, styles.scrollContainer]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    listContainer: {
        marginHorizontal: "auto",
        maxWidth: "100%",
        width: 360,
    },
    listEmpty: {
        alignItems: "center",
        backgroundColor: "#6789AB",
        flex: 1,
        justifyContent: "center",
        paddingVertical: 16,
    },
    listHeader: {
        alignSelf: "center",
        backgroundColor: "#456AAA",
        borderRadius: 12,
        height: 100,
        marginHorizontal: 8,
        marginVertical: 8,
        width: 100,
    },
    outerContainer: {
        backgroundColor: "#456",
    },
    scrollContainer: {},
});
