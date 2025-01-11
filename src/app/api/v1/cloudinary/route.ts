import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createLoggerWithLabel } from '../../utils/logger';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const logger = createLoggerWithLabel('CLOUDINARY');

/* To upload a upscaled video to cloudinary */
export async function POST(request: NextRequest) {
    const { videoUrl } = await request.json();

    if (!videoUrl) {
        logger.warn('Video URL is required');
        return NextResponse.json(
            { error: 'Video URL is required' },
            { status: 400 }
        );
    }

    try {
        /* Upload the video to cloudinary with video-specific options */
        logger.info(`Uploading video to cloudinary: ${videoUrl}`);
        const result = await cloudinary.uploader.upload(videoUrl, {
            resource_type: 'video',
            folder: 'replicate_api_upscaled_videos',
        });
        logger.info(`Video uploaded to cloudinary: ${result.secure_url}`);

        return NextResponse.json({
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration,
            format: result.format,
        });
    } catch (error) {
        logger.error(`Error uploading video to cloudinary: ${error}`);
        return NextResponse.json(
            { error: 'Failed to upload video' },
            { status: 500 }
        );
    }
}
