import {router} from "expo-router";



function CustomError(message, code) {

    // Create > New Error
    const error = new Error(message);

    // Set > Error > Code
    error.code = code;

    // Return
    return error;

}

CustomError.prototype = Object.create(Error.prototype);



const authFetch = async (url, options) => {

    let sessionToken;

    // Pre-request logic
    const modifiedOptions = {
        ...options,
        headers: {
            ...options.headers,
            "Authorization": "Bearer 0e69309a-e34f-4c03-b943-c78188c871d9"
        },
        // agent: agent, // Pass the custom agent
        cache: 'default' // Default behavior, browser decides caching
    };


    // Setup > Response
    let response;

    try {

        // Fetch > Response
        response = await fetch(url, modifiedOptions);

    } catch (error) {

        // Handle network errors or errors thrown within the try block

        // Log > Error
        console.error("[ Auth Fetch ]: " + error.message)

        // Build > Error Message
        const message = "Network Error, please try again"

        // Throw > Error
        throw new Error(message);

    }


    // Response > Error
    if (!response.ok) {

        const errorStatusCode = response.status
        const errorStatusText = response.statusText

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

        // Log > Error
        console.error("[ Auth Fetch ]: " + message)

        // Throw > Error
        throw new Error(errorData.message);


    } // Response > OK
    else
    {

        // Get > Result
        const result = await response.json();

        // Return
        return result

    }

};

export default authFetch;
