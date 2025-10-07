import * as fs from 'fs';
import * as https from 'https';
// import fetch from 'node-fetch'; // Use node-fetch in Node.js environment

const caCert = fs.readFileSync('./Utils/fetch/ca.crt');
const clientCert = fs.readFileSync('./Utils/fetch/cert.crt');
const clientKey = fs.readFileSync('./Utils/fetch/key.pem');

const agent = new https.Agent({

    rejectUnauthorized: false,
    keepAlive: true,
    ca:     caCert,
    cert:   clientCert,
    key:    clientKey,

});


const apiFetch = async (url, options) => {

    // Pre-request logic
    const modifiedOptions = {
        ...options,
        method: options.method,
        headers: {
            ...options.headers,
            // 'Authorization': 'Bearer myToken'
        },
        body: options.body,
        agent: agent, // Pass the custom agent
        cache: 'default' // Default behavior, browser decides caching
    };

    console.log("apiFetch > modifiedOptions: ", modifiedOptions)


    // Setup > Response
    let response;

    try {

        // Fetch > Response
        response = await fetch(url, modifiedOptions);

        console.log("apiFetch > response: ", response)

    } catch (error) {

        // Handle network errors or errors thrown within the try block

        // Log > Error
        console.error("[ Api Fetch ]: " + error.message)

        // Build > Error Message
        const message = "Network Error, please try again"

        // Return > Error Response
        return Response.json(
            {
                message: message
            },
            {
                status: 500
            });

    }



    /*
    |--------------------------------------------------------------------------
    | Response > Error
    |--------------------------------------------------------------------------
    */

    if (!response.ok) {

        const errorStatusCode = response.status
        const errorStatusText = response.statusText

        // Get > Content Type
        const contentType = response.headers.get("content-type");


        /*
        |--------------------------------------------------------------------------
        | Error : JSON
        |--------------------------------------------------------------------------
        */

        if (contentType && contentType.includes("application/json")) {

            // Handle HTTP errors
            const errorData = await response.json(); // Or response.text()

            // Setup > Var
            let message;

            // Error Message > Exist
            if(errorData.message) {

                // Set > Message
                message = errorData.message

            } // Error Message > Not Exist
            else
            {

                // Use > Default Message
                message = `HTTP ${errorStatusCode} Error`
                    + ": "
                    + "Status Text: " + (errorStatusText?? "None")

            }

            // Return > Error Response
            return Response.json(
                {
                    message: message
                },
                {
                    status: 500 // errorStatusCode, 500 always
            });

        }


        /*
        |--------------------------------------------------------------------------
        | Error : Text/Html
        |--------------------------------------------------------------------------
        */

        if(contentType && contentType.includes("text/html"))
        {

            // Handle HTTP errors
            const errorData = await response.text(); // Or response.text()

            // Setup > Var
            let message;

            // Error Message > Exist
            if(errorData.message) {

                // Set > Message
                message = errorData.message

            } // Error Message > Not Exist
            else
            {

                // Use > Default Message
                message = `HTTP ${errorStatusCode} Error`
                    + ": "
                    + "Status Text: " + (errorStatusText?? "None")

            }

            // Return > Error Response
            return Response.json(
                {
                    message: message
                },
                {
                    status: 500 // errorStatusCode, 500 always
            });

        }


        /*
        |--------------------------------------------------------------------------
        | Error : Other / Unknown
        |--------------------------------------------------------------------------
        */

        if(contentType &&
            (
                !contentType.includes("text/html") &&
                !contentType.includes("application/json")
            )
        ) {

            // Handle HTTP errors
            const errorData = await response.text(); // Or response.text()

            // Setup > Var
            let message;

            // Error Message > Exist
            if(errorData.message) {

                // Set > Message
                message = errorData.message

            } // Error Message > Not Exist
            else
            {

                // Use > Default Message
                message = `HTTP ${errorStatusCode} Error`
                    + ": "
                    + "Status Text: " + (errorStatusText?? "None")

            }

            // Return > Error Response
            return Response.json(
                {
                    message: message
                },
                {
                    status: 500 // errorStatusCode, 500 always
            });

        }

    } // Response > OK
    else
    {

        // Get > Result
        const result = await response.json();

        // Return > Response
        return Response.json(
            result,
            {
                status: 200
            });

    }

};

export default apiFetch;
