import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createLoggerWithLabel } from '../../utils/logger';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const logger = createLoggerWithLabel('CLOUDINARY');


interface VideoUploadOptions {
    resource_type: 'video';
    folder: string;
    eager?: Array<{
        raw_transformation: string;
        format: string;
    }>;
    eager_async?: boolean;
    video_codec?: string;
    bit_rate?: string;
    fps?: number | string;  // Allow string for 'original'
    quality_analysis?: boolean;
    transformation?: Array<{
        width?: number | string;  // Allow string for 'original'
        height?: number | string; // Allow string for 'original'
        crop?: string;
        audio_codec?: string;
        audio_frequency?: number;
        audio_bitrate?: string;
        quality?: string | number;
        flags?: string;
    }>;
}

const getOptimalVideoSettings = (fileSize?: number): Partial<any> => {
    const baseSettings = {
        video_codec: 'h264:main',
        quality_analysis: true,
        audio_codec: 'aac',
        audio_frequency: 44100,
        audio_bitrate: '128k'
    };

    return {
        ...baseSettings,
        eager: [{
            raw_transformation: [
                'q_auto:good',
                'vc_h264:main',
                'vs_3',
                'br_auto'
            ].join('/'),
            format: 'mp4'
        }],
        eager_async: true
    };
};

export async function POST(request: NextRequest) {
    const { videoUrl, type, fileSize } = await request.json();

    if (!videoUrl) {
        logger.warn('Video URL is required');
        return NextResponse.json(
            { error: 'Video URL is required' },
            { status: 400 }
        );
    }

    const folder = type === 'original' ? 'original_videos' : 'enhanced_videos';

    try {
        const uploadOptions: VideoUploadOptions = {
            resource_type: 'video',
            folder: folder,
        };

        // Modified settings for original videos
        if (type === 'original') {
            const videoSettings = getOptimalVideoSettings(fileSize);
            
            Object.assign(uploadOptions, {
                ...videoSettings
            });
        }

        // For enhanced videos, upload without compression
        if (type === 'enhanced') {
            Object.assign(uploadOptions, {
                quality_analysis: true,
                transformation: [{
                    crop: 'scale',
                    quality: 'auto:best'  // Preserve enhanced quality
                }]
            });
        }

        const result = await cloudinary.uploader.upload(
            videoUrl,
            uploadOptions
        );

        logger.info(`Video uploaded to cloudinary: ${result.secure_url}`);

        // Return appropriate URL based on video type
        const responseUrl = type === 'original' && result.eager?.[0]?.secure_url
            ? result.eager[0].secure_url
            : result.secure_url;

        return NextResponse.json({
            url: responseUrl,
            public_id: result.public_id
        });
    } catch (error) {
        logger.error(`Error uploading video to cloudinary: ${JSON.stringify(error)}`);
        return NextResponse.json(
            { error: 'Failed to upload video' },
            { status: 500 }
        );
    }
}