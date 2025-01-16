export const videoAPI = {
    uploadToCloudinary: async (videoUrl: string, type: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/cloudinary/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        videoUrl,
                        type,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.url) {
                throw new Error('Invalid response from Cloudinary API');
            }

            return data;
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw new Error('Failed to upload video to Cloudinary');
        }
    },

    saveToDatabase: async (inputData: any) => {
        try {
            if (!process.env.NEXT_PUBLIC_APP_URL) {
                throw new Error(
                    'App URL environment variable is not configured'
                );
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/db`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(inputData),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Database save failed with status: ${response.status}`
                );
            }

            const data = await response.json();
            console.log('Database save response:', data);
            return data;
        } catch (error) {
            console.error('Failed to save to database:', error);
            throw new Error('Failed to save video information to database');
        }
    },

    getPredictionStatus: async (id: string) => {
        console.log('CALLING PREDICTION STATUS');
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/replicate/prediction?id=${id}`
            );
            const data = await response.json();

            if (!data) {
                throw new Error('No data received from prediction endpoint');
            }
            return data;
        } catch (error) {
            console.error('Polling error:', error);
            throw new Error('Failed to get prediction status');
        }
    },
};
