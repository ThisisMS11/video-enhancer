import { useState } from 'react';

export const useVideoProcessing = () => {
    const [predictionId, setPredictionId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('idle');
    const [enhancedVideoUrl, setEnhancedVideoUrl] = useState<string | null>(
        null
    );
    const [uploadCareCdnUrl, setUploadCareCdnUrl] = useState<string | null>(
        null
    );

    /**
     * Enhances a video using the Replicate API
     * @param videoUrl URL of the video to enhance
     * @param model AI model to use for enhancement
     * @param resolution Target resolution for the enhanced video
     * @returns Promise<string> Prediction ID for tracking enhancement progress
     * @throws Error if validation fails or API request fails
     */
    const handleEnhancingVideo = async (
        videoUrl: string | null,
        model: string,
        resolution: string
    ): Promise<string> => {
        // Input validation
        if (
            !videoUrl ||
            !model ||
            !resolution ||
            !process.env.NEXT_PUBLIC_APP_URL
        ) {
            const error = !videoUrl
                ? 'No video URL provided'
                : !model || !resolution
                  ? 'Model or resolution not selected'
                  : 'App URL environment variable is not configured';

            console.error(error);
            setStatus('error');
            throw new Error(error);
        }

        try {
            setStatus('uploading');

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/replicate`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoUrl, model, resolution }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    `Server error: ${response.status} ${errorData.message || ''}`
                );
            }

            const data = await response.json();

            if (!data?.id) {
                throw new Error('Invalid response: missing prediction ID');
            }

            setPredictionId(data.id);
            setStatus('processing');
            return data.id;
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Failed to enhance video';

            console.error('Enhancement error:', message);
            setStatus('error');
            throw error;
        }
    };

    return {
        status,
        setStatus,
        predictionId,
        setPredictionId,
        enhancedVideoUrl,
        setEnhancedVideoUrl,
        uploadCareCdnUrl,
        setUploadCareCdnUrl,
        handleEnhancingVideo,
    };
};
