import apiFetch from '@/Utils/fetch/api-fetch'; // Recommended for consistent behavior across platforms
import omitBy from 'lodash/omitBy';
import isNil from 'lodash/isNil';



export async function GET(request: Request) {

    // Get > Authorization Header
    const authorizationHeader = {
        Authorization: request.headers.get('authorization')
    }

    // Get > Search Params
    const { searchParams } = new URL(request.url);

    // Query Parameters
    const queryParams = new URLSearchParams({
        ...Object.fromEntries(searchParams),
    }).toString();

    // Create AJAX URL
    const ajax_url = new URL("http://localhost:8080/api/v1/chat/user/initialmessages");
    ajax_url.search = queryParams;

    // Config
    const headers = {
        // 'authorization': `Bearer ${session.dataValues.session_token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
    };

    const response = await apiFetch(ajax_url, {
        method: 'GET', // Specify the HTTP method as POST
        headers: {
            // ...headers,
            ...authorizationHeader,
            'Content-Type': 'application/json',
        },
        // body: JSON.stringify(data),
    })

    // Return > Response Object
    return response;

}
