class ApiClient {
    constructor (baseUrl) {
        this.baseUrl = baseUrl;
    }

    async post (endpoint, data, isJson = true) {
        const url = `${this.baseUrl}/${endpoint}`;
        const options = {
            method: 'POST',
            headers: {},
        }

        if (isJson) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        } else {
            //Si no es json, asumimos que es FormData
            options.body = data;
        }

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response;

        } catch (error) {
            throw new Error(`Error during POST request: ${error.message}`);
        }
    }

    async get(endpoint) {
        const url = `${this.baseUrl}/${endpoint}`;
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        };

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            throw new Error(`Error during GET request: ${error.message}`);
        }
    }
}

// export default ApiCategories;